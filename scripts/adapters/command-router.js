const { assertValidAction, normalizeActionPayload } = require('./canonical-actions');
const { getProviderCapabilities, getAliasPolicy } = require('./capability-matrix');
const claudeProvider = require('./providers/claude');
const codexProvider = require('./providers/codex');
const geminiProvider = require('./providers/gemini');
const opencodeProvider = require('./providers/opencode');
const mistralProvider = require('./providers/mistral');

const PROVIDERS = Object.freeze({
  claude: claudeProvider,
  codex: codexProvider,
  gemini: geminiProvider,
  opencode: opencodeProvider,
  mistral: mistralProvider
});
const DEFAULT_PROVIDER = 'claude';

function normalizeProvider(provider) {
  return PROVIDERS[provider] ? provider : DEFAULT_PROVIDER;
}

function isCodexNativeCommand(command) {
  return typeof command === 'string' && command.startsWith('$gmd-');
}

function isClaudeNativeCommand(command) {
  return typeof command === 'string' && command.startsWith('/gmd:');
}

function isNativeForProvider(provider, command) {
  const capabilities = getProviderCapabilities(provider);
  if (!capabilities || !Array.isArray(capabilities.native_command_prefixes)) return false;
  return capabilities.native_command_prefixes.some((prefix) => (
    typeof command === 'string' && command.startsWith(prefix)
  ));
}

function parseAlias(command) {
  if (typeof command !== 'string' || !command.startsWith('gmd:')) return null;
  const candidate = command.slice('gmd:'.length).trim();
  return candidate || null;
}

function listSupportedCommands(provider) {
  const map = PROVIDERS[provider] && PROVIDERS[provider].commandMap;
  if (!map) return [];
  return Object.keys(map).sort();
}

function isScaffoldProvider(provider) {
  const caps = getProviderCapabilities(provider);
  return Boolean(caps && caps.scaffold);
}

function isProviderEnabled(provider, config) {
  if (!isScaffoldProvider(provider)) return true;
  const scaffoldCfg = config && config.adapters && config.adapters.scaffolds;
  if (!scaffoldCfg || typeof scaffoldCfg !== 'object') return false;
  return Boolean(scaffoldCfg[provider]);
}

function getProviderDiagnostics(provider) {
  const commands = listSupportedCommands(provider);
  const strictNativeCheck = {
    claude: isClaudeNativeCommand,
    codex: isCodexNativeCommand,
    gemini: isClaudeNativeCommand,
    opencode: isClaudeNativeCommand,
    mistral: isClaudeNativeCommand
  };
  const checkFn = strictNativeCheck[provider];
  return {
    provider: provider,
    command_count: commands.length,
    strict_native: checkFn ? commands.every(checkFn) : false,
    native_commands: commands
  };
}

function routeCommand(input) {
  const source = input && typeof input === 'object' ? input : {};
  const provider = normalizeProvider(source.provider || DEFAULT_PROVIDER);
  const command = source.command;
  const params = source.params || {};
  const config = source.config || {};

  if (isScaffoldProvider(provider) && !isProviderEnabled(provider, config)) {
    const err = new Error(`Scaffold provider '${provider}' is inactive`);
    err.code = 'SCAFFOLD_PROVIDER_INACTIVE';
    err.provider = provider;
    err.command = command;
    err.capability = `adapters.scaffolds.${provider}`;
    err.remediation = `Enable config '${err.capability}=true' to activate scaffold provider`;
    throw err;
  }

  const providerCapabilities = getProviderCapabilities(provider);
  if (!providerCapabilities) return null;

  const providerMap = PROVIDERS[provider] ? PROVIDERS[provider].commandMap : {};
  let action = null;
  let sourceKind = null;
  let warning = null;

  if (providerMap && Object.prototype.hasOwnProperty.call(providerMap, command)) {
    action = providerMap[command];
    sourceKind = 'native';
  }

  if (provider === 'codex' && isNativeForProvider(provider, command) && !action) {
    const err = new Error(`Unknown codex native command: ${command}`);
    err.code = 'UNKNOWN_CODEX_COMMAND';
    err.provider = provider;
    err.command = command;
    throw err;
  }
  if (isScaffoldProvider(provider) && isNativeForProvider(provider, command) && !action) {
    const err = new Error(`Unsupported scaffold native command for ${provider}: ${command}`);
    err.code = 'SCAFFOLD_CAPABILITY_UNSUPPORTED';
    err.provider = provider;
    err.command = command;
    err.capability = 'native_command_map';
    err.remediation = 'Use a supported scaffold command or extend provider commandMap.';
    throw err;
  }

  const aliasPolicy = getAliasPolicy(provider);
  const aliasEnabled = Boolean(config.aliases) && !aliasPolicy.enabled_by_default ? true : aliasPolicy.enabled_by_default;
  const aliasCandidate = parseAlias(command);

  if (aliasCandidate) {
    try {
      assertValidAction(aliasCandidate);
      if (!action && aliasEnabled) {
        action = aliasCandidate;
        sourceKind = 'alias';
      } else if (action) {
        warning = 'native_wins_alias_warns';
      }
    } catch (err) {
      if (!action && aliasEnabled) throw err;
    }
  }

  if (!action) return null;

  const payload = normalizeActionPayload({
    action: action,
    params: params,
    metadata: {
      provider: provider,
      canonical_action: action,
      source: sourceKind || 'native',
      conflict_policy: providerCapabilities.conflict_policy
    }
  });

  if (warning) payload.metadata.warning = warning;
  return payload;
}

module.exports = {
  DEFAULT_PROVIDER,
  normalizeProvider,
  isScaffoldProvider,
  isProviderEnabled,
  isClaudeNativeCommand,
  isCodexNativeCommand,
  getProviderDiagnostics,
  routeCommand,
  listSupportedCommands
};
