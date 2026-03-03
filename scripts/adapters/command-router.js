const { assertValidAction, normalizeActionPayload } = require('./canonical-actions');
const { getProviderCapabilities, getAliasPolicy } = require('./capability-matrix');
const claudeProvider = require('./providers/claude');
const codexProvider = require('./providers/codex');

const PROVIDERS = Object.freeze({
  claude: claudeProvider,
  codex: codexProvider
});

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

function routeCommand(input) {
  const source = input && typeof input === 'object' ? input : {};
  const provider = source.provider || 'claude';
  const command = source.command;
  const params = source.params || {};
  const config = source.config || {};

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
      source: sourceKind || 'native',
      conflict_policy: providerCapabilities.conflict_policy
    }
  });

  if (warning) payload.metadata.warning = warning;
  return payload;
}

module.exports = {
  routeCommand,
  listSupportedCommands
};
