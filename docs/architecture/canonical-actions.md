# Canonical Actions

## Purpose
Canonical actions define assistant-agnostic workflow intents used by router/adapter code.
Adapters map provider-native commands to canonical actions, and core workflow logic consumes canonical actions only.

## Scope
- In scope: action names, payload shape, validation helpers.
- Out of scope: provider auth/config details and secrets.

Provider auth/config must stay in provider adapter modules.

## Contract Shape
Canonical action payload:

```js
{
  action: "campaign.progress",
  params: {},
  metadata: {}
}
```

- `action`: required canonical action string.
- `params`: optional object, defaults to `{}`.
- `metadata`: optional object, defaults to `{}`.

Secret-like metadata keys (`token`, `api_key`, `access_token`, `secret`) are stripped by normalization helpers.

## Naming
- Format: `<domain>.<operation>`
- Examples: `campaign.progress`, `work.pause`, `outreach.prepare`

## Source of Truth
- Runtime module: `scripts/adapters/canonical-actions.js`
- Router integration: `scripts/adapters/command-router.js`

## Backward Compatibility
Provider-native commands remain primary. Canonical actions are internal routing contracts, plus optional alias support through adapter policy.
