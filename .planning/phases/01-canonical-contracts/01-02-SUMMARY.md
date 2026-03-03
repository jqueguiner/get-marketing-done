---
phase: 01-canonical-contracts
plan: 02
subsystem: api
tags: [router, adapters, ingress, compatibility]
requires:
  - phase: 01-canonical-contracts
    provides: canonical action and capability contracts
provides:
  - command router for native->canonical translation
  - claude/codex provider command maps
  - marketing-tools ingress routing integration
  - README compatibility guidance for aliases
affects: [codex-adapter-foundation, claude-adapter-parity-refactor, docs-and-migration-guide]
tech-stack:
  added: [none]
  patterns: [provider map isolation, alias opt-in routing]
key-files:
  created:
    - scripts/adapters/command-router.js
    - scripts/adapters/providers/claude.js
    - scripts/adapters/providers/codex.js
  modified:
    - scripts/marketing-tools.js
    - README.md
key-decisions:
  - "Aliases enabled only via config/env toggle"
  - "Native command map lookup always precedes alias resolution"
patterns-established:
  - "Pattern: Route unknown ingress commands via canonical translator before hard-fail"
  - "Pattern: Provider-native commands remain first-class while supporting canonical alias portability"
requirements-completed: [ADPT-03, SAFE-01]
duration: 16min
completed: 2026-03-03
---

# Phase 1: Canonical Contracts Summary

**Runtime command ingress now translates native adapter commands into canonical actions with opt-in alias support.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-03-03T17:20:00Z
- **Completed:** 2026-03-03T17:36:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Added command-router with native-first resolution and alias opt-in behavior.
- Added Claude and Codex provider command maps isolated from auth/config concerns.
- Integrated routing into `marketing-tools.js` ingress and documented compatibility model in README.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement command router and provider maps** - `43518bc` (feat)
2. **Task 2: Integrate router into marketing-tools ingress path** - `7965150` (feat)
3. **Task 3: Document compatibility and alias policy** - `4e74a56` (docs)

## Files Created/Modified
- `scripts/adapters/command-router.js` - Native/alias translation with conflict policy handling.
- `scripts/adapters/providers/claude.js` - Claude-native command mappings.
- `scripts/adapters/providers/codex.js` - Codex-native command mappings.
- `scripts/marketing-tools.js` - Ingress routing path now supports canonical translation.
- `README.md` - Added multi-assistant command compatibility and alias policy notes.

## Decisions Made
- Alias mode is disabled by default and toggled by `GMD_ALIASES=true`.
- Unknown command error now includes provider-native supported commands and alias guidance.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Codex-focused adapter phase can now build on live routing boundary and provider maps.
- No blockers identified.

---
*Phase: 01-canonical-contracts*
*Completed: 2026-03-03*
