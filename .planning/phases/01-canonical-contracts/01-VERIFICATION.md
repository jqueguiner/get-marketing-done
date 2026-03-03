status: passed
phase: 01
phase_name: canonical-contracts
verified_at: 2026-03-03
score: 3/3

# Phase 1 Verification: Canonical Contracts

## Goal
Establish a provider-agnostic command/action contract that adapters implement consistently.

## Must-Haves Check

1. Canonical workflow action schema is documented and referenced by adapters.
- Evidence:
  - `scripts/adapters/canonical-actions.js`
  - `docs/architecture/canonical-actions.md`
  - `scripts/adapters/command-router.js`
- Result: PASS

2. Provider capability matrix defines supported tools/hook constraints per assistant.
- Evidence:
  - `scripts/adapters/capability-matrix.js`
  - `docs/architecture/assistant-capability-matrix.md`
- Result: PASS

3. Core workflow ingress can route through canonical actions without provider-specific branching in business scripts.
- Evidence:
  - `scripts/adapters/providers/claude.js`
  - `scripts/adapters/providers/codex.js`
  - `scripts/marketing-tools.js` ingress routing path
- Result: PASS

## Requirement IDs Covered
- ADPT-03: Complete
- SAFE-01: Complete

## Notes
- Locked context decisions were respected:
  - Native commands remain primary.
  - Canonical aliases use `gmd:<action>`.
  - Alias mode is opt-in.
  - Conflict behavior is native-precedence with warning policy.
