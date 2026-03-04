# Assistant Support Matrix

This document defines support levels and command expectations per assistant runtime.

## Support Levels

| Level | Meaning |
|-------|---------|
| `Full` | Behavior is operationally supported and parity-validated for covered flows. |
| `Scaffold` | Provider is registered and contract-conformant, with explicit capability-gap diagnostics. |
| `Unsupported` | Not available in this milestone. |

## Command and Capability Matrix

| Provider | Support Level | Native Command Surface | Alias Mode | Notes |
|----------|----------------|------------------------|-----------|-------|
| Claude | `Full` | `/gmd:*` | `gmd:<action>` (opt-in) | Baseline runtime with full workflow support in this milestone. |
| Codex | `Full` | `$gmd-*` | `gmd:<action>` (opt-in) | Native Codex surface is strict; unknown native commands hard-fail. |
| Gemini | `Scaffold` | `/gmd:*` (minimal scaffold map) | `gmd:<action>` (opt-in) | Scaffold provider is config-gated and capability-limited. |
| OpenCode | `Scaffold` | `/gmd:*` (minimal scaffold map) | `gmd:<action>` (opt-in) | Scaffold provider is config-gated and capability-limited. |
| Mistral | `Scaffold` | `/gmd:*` (minimal scaffold map) | `gmd:<action>` (opt-in) | Scaffold provider is config-gated and capability-limited. |

## Validation Evidence Mapping

| Claim | Evidence Command(s) |
|-------|----------------------|
| Codex command surface maps correctly | `node scripts/verify_codex_command_sweep.js` |
| Claude parity baseline maintained | `node scripts/verify_claude_parity.js` |
| Core adapter parity holds | `node scripts/verify_adapter_parity.js` |
| Cross-adapter continuity preserved | `node scripts/verify_cross_adapter_continuity.js` |
| Gate behavior consistent across providers | `node scripts/verify_quality_gate_consistency.js` |
| Scaffold providers are contract-conformant | `node scripts/verify_scaffold_conformance.js` |
| Optional scaffold section aligns with parity harness style | `node scripts/verify_adapter_parity.js --include-scaffolds` |

## Scaffold Capability-Gap Behavior

Scaffold providers are intentionally not parity-complete in this milestone. Expected diagnostics include:

| Code | Meaning |
|------|---------|
| `SCAFFOLD_PROVIDER_INACTIVE` | Scaffold provider exists but is not enabled in config (`adapters.scaffolds.<provider>`). |
| `SCAFFOLD_CAPABILITY_UNSUPPORTED` | Command path is outside the scaffold provider's minimal native map. |

## Runtime Source of Truth

Documentation in this file must align with:
- `scripts/adapters/capability-matrix.js`
- `scripts/adapters/command-router.js`

If behavior and docs disagree, runtime code and validator outputs are authoritative.
