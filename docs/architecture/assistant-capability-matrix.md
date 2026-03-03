# Capability Matrix

## Purpose
The capability matrix centralizes assistant support metadata so adapters can consistently decide what behavior is supported.

## Policy
- Canonical alias syntax: `gmd:<action>`
- Alias mode: opt-in (disabled by default)
- Conflict policy: `native_wins_alias_warns`

## Capability Matrix

| Provider | Native Prefixes | Inline Options | Hooks | Statusline | Checkpoints | Alias Mode |
|----------|------------------|----------------|-------|------------|-------------|------------|
| `claude` | `/gmd:` | yes | yes | yes | yes | yes |
| `codex` | `$gmd-`, `gmd:` | yes | no | no | yes | yes |
| `gemini` | `/gmd:` | yes | no | no | yes | yes |
| `opencode` | `/gmd:` | yes | no | no | yes | yes |
| `mistral` | `/gmd:` | yes | no | no | yes | yes |

## Usage Rules
1. Resolve provider entry by ID.
2. Evaluate support flags before using provider-specific behavior.
3. Keep provider auth/config outside matrix and outside canonical payloads.

## Extending
When adding a new provider:
1. Add entry in `scripts/adapters/capability-matrix.js`.
2. Add provider-native command map under `scripts/adapters/providers/`.
3. Document capability differences in this file.

## Source of Truth
- Runtime module: `scripts/adapters/capability-matrix.js`
