# Validation Runbook

This runbook separates fast operator confidence checks from full maintainer release checks.

## Operator Quick Validation

Use these checks before daily campaign work or after updates:

1. Command ingress works

```bash
node scripts/verify_codex_command_sweep.js
```

2. Core parity and state continuity are healthy

```bash
node scripts/verify_adapter_parity.js
node scripts/verify_cross_adapter_continuity.js
```

3. Safety gates still block unsafe send flows

```bash
node scripts/verify_quality_gate_consistency.js
```

Interpretation:
- All commands above should exit `0`.
- Any non-zero exit means stop and follow failure triage below.

## Maintainer Release Validation

Run in this order before merge/release:

1. Codex native command coverage

```bash
node scripts/verify_codex_command_sweep.js
```

2. Claude baseline parity

```bash
node scripts/verify_claude_parity.js
```

3. Cross-adapter continuity

```bash
node scripts/verify_cross_adapter_continuity.js
```

4. Quality gate consistency

```bash
node scripts/verify_quality_gate_consistency.js
```

5. Core adapter parity harness

```bash
node scripts/verify_adapter_parity.js
```

6. Critical command flow smoke

```bash
node scripts/verify_command_flow_smoke.js
```

7. Scaffold conformance (explicit, separate from full parity)

```bash
node scripts/verify_scaffold_conformance.js
node scripts/verify_adapter_parity.js --include-scaffolds
```

8. HubSpot launch-gate and sync/results regression

```bash
node scripts/verify_hubspot_launch_gate.js
node scripts/verify_hubspot_sync_regression.js
node scripts/verify_hubspot_suite.js
```

Release policy:
- Any non-zero exit blocks release.
- Scaffold failures block scaffold claims, but do not justify claiming full parity for scaffold providers.

## Failure Triage

| Failure signal | Likely scope | First response |
|----------------|-------------|----------------|
| `UNKNOWN_CODEX_COMMAND` | Codex command mapping drift | Reconcile `scripts/adapters/providers/codex.js` with expected `$gmd-*` surface |
| `SCAFFOLD_PROVIDER_INACTIVE` | Scaffold config not enabled for test | Enable `adapters.scaffolds.<provider>` for scaffold-specific checks |
| `SCAFFOLD_CAPABILITY_UNSUPPORTED` | Unsupported scaffold native command path | Use supported scaffold command or extend scaffold `commandMap` intentionally |
| `HUBSPOT_PREFLIGHT_BLOCKED` | HubSpot launch readiness preconditions not satisfied | Run `hubspot-campaign preflight <campaign>` and resolve failed checks/remediation |
| `COPY_APPROVAL_REQUIRED` | Missing or stale copy approval for current campaign copy | Re-run approval: `hubspot-campaign approve <campaign> --by <reviewer>` |
| `QUALITY_GATE_BLOCKED` mismatch | Send-safety contract drift | Recheck runtime gate evaluation path in `scripts/marketing-tools.js` |
| Continuity test mismatch | Resume precedence/state metadata regression | Recheck `initResume` and provenance handling in runtime |
| Parity harness mismatch | Cross-provider output/state drift | Inspect failing section details in harness JSON (`checks`, `failures`) |

## Notes

- Runtime source of truth for capability policy: `scripts/adapters/capability-matrix.js`
- Scaffold providers are documented as `Scaffold`, not full parity support.
