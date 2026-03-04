# Capability Matrix

## Purpose
The capability matrix centralizes assistant support metadata so adapters can consistently decide what behavior is supported.

## Policy
- Canonical alias syntax: `gmd:<action>`
- Alias mode: opt-in (disabled by default)
- Conflict policy: `native_wins_alias_warns`
- Support levels:
  - `Full` = parity-validated and operationally supported
  - `Scaffold` = contract-registered with structured capability-gap diagnostics
  - `Unsupported` = not available in this milestone

## Capability Matrix

| Provider | Support Level | Native Prefixes | Inline Options | Hooks | Statusline | Checkpoints | Alias Mode |
|----------|----------------|-----------------|----------------|-------|------------|-------------|------------|
| `claude` | `Full` | `/gmd:` | yes | yes | yes | yes | yes |
| `codex` | `Full` | `$gmd-` | yes | no | no | yes | yes |
| `gemini` | `Scaffold` | `/gmd:` | yes | no | no | yes | yes |
| `opencode` | `Scaffold` | `/gmd:` | yes | no | no | yes | yes |
| `mistral` | `Scaffold` | `/gmd:` | yes | no | no | yes | yes |

## Usage Rules
1. Resolve provider entry by ID.
2. Evaluate support flags before using provider-specific behavior.
3. Keep provider auth/config outside matrix and outside canonical payloads.
4. Treat alias commands as optional compatibility mode, not native command surface.
5. Do not claim parity-complete behavior for providers marked `Scaffold`.

## Extending
When adding a new provider:
1. Add entry in `scripts/adapters/capability-matrix.js`.
2. Add provider-native command map under `scripts/adapters/providers/`.
3. Document capability differences in this file.

## Source of Truth
- Runtime module: `scripts/adapters/capability-matrix.js`
