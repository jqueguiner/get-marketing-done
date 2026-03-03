---
phase: 01-canonical-contracts
plan: 01
subsystem: infra
tags: [adapters, contracts, capabilities, multi-assistant]
requires:
  - phase: 00-initialization
    provides: roadmap, context, requirements
provides:
  - canonical action contract module
  - shared assistant capability matrix
  - architecture docs for action and capability contracts
affects: [codex-adapter-foundation, claude-adapter-parity-refactor, parity-test-harness]
tech-stack:
  added: [none]
  patterns: [native-to-canonical boundary, centralized capability metadata]
key-files:
  created:
    - scripts/adapters/canonical-actions.js
    - scripts/adapters/capability-matrix.js
    - docs/architecture/canonical-actions.md
    - docs/architecture/assistant-capability-matrix.md
  modified: []
key-decisions:
  - "Canonical payload normalization strips secret-like metadata keys"
  - "Capability policy encoded as native_wins_alias_warns"
patterns-established:
  - "Pattern: Action constants + validation helpers as contract gate"
  - "Pattern: Capability matrix as single source for provider support"
requirements-completed: [ADPT-03, SAFE-01]
duration: 14min
completed: 2026-03-03
---

# Phase 1: Canonical Contracts Summary

**Canonical action schema and shared capability matrix established as adapter contract foundations.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-03T17:05:00Z
- **Completed:** 2026-03-03T17:19:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Added canonical action vocabulary with validation and normalization helpers.
- Added provider capability matrix spanning Claude/Codex/Gemini/OpenCode/Mistral.
- Added architecture docs that define contract boundaries and alias/conflict policy.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create canonical action contract module** - `0c68243` (feat)
2. **Task 2: Create provider capability matrix module** - `bc2776c` (feat)
3. **Task 3: Document canonical contract and capability matrix** - `fd3571a` (docs)

## Files Created/Modified
- `scripts/adapters/canonical-actions.js` - Canonical action constants, validation, payload normalization.
- `scripts/adapters/capability-matrix.js` - Provider capability metadata and policy helpers.
- `docs/architecture/canonical-actions.md` - Contract shape and boundary documentation.
- `docs/architecture/assistant-capability-matrix.md` - Capability matrix and alias/conflict rules.

## Decisions Made
- Enforced SAFE-01 boundary by stripping auth-like metadata keys during canonical payload normalization.
- Defined capability policy as native command precedence with alias warning behavior.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Contract and capability foundations are in place for router/provider integration.
- No blockers for Plan 01-02.

---
*Phase: 01-canonical-contracts*
*Completed: 2026-03-03*
