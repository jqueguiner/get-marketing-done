/**
 * Shared capability matrix for assistant adapters.
 * Keeps provider support policy centralized.
 */

const CAPABILITY_MATRIX = Object.freeze({
  claude: Object.freeze({
    native_command_prefixes: ['/gmd:'],
    supports: Object.freeze({
      inline_options: true,
      hooks: true,
      statusline: true,
      interactive_checkpoints: true,
      alias_mode: true
    }),
    conflict_policy: 'native_wins_alias_warns'
  }),
  codex: Object.freeze({
    native_command_prefixes: ['$gmd-'],
    supports: Object.freeze({
      inline_options: true,
      hooks: false,
      statusline: false,
      interactive_checkpoints: true,
      alias_mode: true
    }),
    conflict_policy: 'native_wins_alias_warns'
  }),
  gemini: Object.freeze({
    native_command_prefixes: ['/gmd:'],
    supports: Object.freeze({
      inline_options: true,
      hooks: false,
      statusline: false,
      interactive_checkpoints: true,
      alias_mode: true
    }),
    conflict_policy: 'native_wins_alias_warns'
  }),
  opencode: Object.freeze({
    native_command_prefixes: ['/gmd:'],
    supports: Object.freeze({
      inline_options: true,
      hooks: false,
      statusline: false,
      interactive_checkpoints: true,
      alias_mode: true
    }),
    conflict_policy: 'native_wins_alias_warns'
  }),
  mistral: Object.freeze({
    native_command_prefixes: ['/gmd:'],
    supports: Object.freeze({
      inline_options: true,
      hooks: false,
      statusline: false,
      interactive_checkpoints: true,
      alias_mode: true
    }),
    conflict_policy: 'native_wins_alias_warns'
  })
});

function getProviderCapabilities(provider) {
  return CAPABILITY_MATRIX[provider] || null;
}

function assertProviderSupported(provider) {
  const capabilities = getProviderCapabilities(provider);
  if (!capabilities) {
    const err = new Error(`Unsupported provider: ${provider}`);
    err.code = 'UNSUPPORTED_PROVIDER';
    throw err;
  }
  return capabilities;
}

function getAliasPolicy(provider) {
  const capabilities = assertProviderSupported(provider);
  return {
    enabled_by_default: false,
    syntax: 'gmd:<action>',
    conflict_policy: capabilities.conflict_policy
  };
}

module.exports = {
  CAPABILITY_MATRIX,
  getProviderCapabilities,
  assertProviderSupported,
  getAliasPolicy
};
