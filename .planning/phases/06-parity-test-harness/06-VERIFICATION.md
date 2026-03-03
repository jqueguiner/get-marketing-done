---
status: passed
phase: 06
phase_name: parity-test-harness
verified: 2026-03-03
score: 4/4
---

# Phase 6 Verification: Parity Test Harness

## Goal
Add parity checks for command behavior and key workflow outputs across supported adapters.

## Must-Haves Check

1. Parity checks compare command outcomes and state transitions between adapters.
- Evidence:
  - `scripts/verify_adapter_parity.js` orchestrates section validators with requirement-tagged output.
  - Sections passing: `codex_command_sweep`, `claude_parity`, `cross_adapter_continuity`, `command_flow_smoke`, `quality_gate_consistency`.
  - Fail-fast + non-zero exit policy enforced.
- Result: PASS

2. Key flows (init, progress, pause/resume, send-prepare) are covered.
- Evidence:
  - `scripts/verify_command_flow_smoke.js` validates:
    - init parity (`/gmd:company-context-builder` vs `$gmd-company-context-builder`)
    - progress parity (`/gmd:campaign-progress` vs `$gmd-campaign-progress`)
    - pause/resume cross-provider transitions
    - send-prepare blocked/allowed behavior parity
  - Script output status: passed.
- Result: PASS

3. Mismatches fail checks with precise diagnostics.
- Evidence:
  - Section and flow outputs include structured `checks[]` and `failures[]` objects.
  - Failure objects include requirement mapping + check identifiers + expected/actual excerpts.
  - `verify_adapter_parity.js` output contract includes `failed_section` and requirement-tagged excerpts on failure.
- Result: PASS

4. Operator documentation explains parity validation commands and interpretation.
- Evidence:
  - `README.md` updated with:
    - `node scripts/verify_adapter_parity.js`
    - `node scripts/verify_command_flow_smoke.js`
    - coverage and pass/fail semantics
- Result: PASS

## Validator Evidence

Commands:

```bash
node scripts/verify_command_flow_smoke.js
node scripts/verify_adapter_parity.js
```

Latest results:
- `verify_command_flow_smoke.js` -> `status: passed`
- `verify_adapter_parity.js` -> `status: passed`
- Orchestrator sections all passed with no failures.

## Requirement IDs Covered
- CMD-01: Complete
- QUAL-01: Complete
- QUAL-02: Complete

## Notes
- Harness currently targets Claude + Codex only by decision lock.
- Additional adapter matrix expansion remains scoped to later phases.
