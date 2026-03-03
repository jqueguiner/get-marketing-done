---
phase: 07-additional-adapter-scaffolds
plan: 01
subsystem: adapters
tags: [scaffolds, providers, routing, capability-gaps]
requires:
  - phase: 06-parity-test-harness
    provides: sectioned validator patterns and structured diagnostics conventions
provides:
  - gemini/opencode/mistral scaffold provider modules with minimal native maps
  - config-gated scaffold activation in runtime router path
  - structured inactive/unsupported scaffold diagnostics
affects: [phase-07-plan-02, phase-08-docs]
tech-stack:
  added: [none]
  patterns: [dormant-by-default scaffold providers, machine-readable capability-gap errors]
key-files:
  created:
    - scripts/adapters/providers/gemini.js
    - scripts/adapters/providers/opencode.js
    - scripts/adapters/providers/mistral.js
  modified:
    - scripts/adapters/command-router.js
    - scripts/adapters/capability-matrix.js
    - scripts/marketing-tools.js
    - config.example.json
    - bin/install.js
key-decisions:
  - "Scaffold providers are registered but disabled by default via adapters.scaffolds.* config flags."
  - "Inactive scaffolds fail with SCAFFOLD_PROVIDER_INACTIVE and remediation hints."
patterns-established:
  - "Pattern: scaffold provider registry + activation gate separate from shared runtime behavior"
  - "Pattern: capability-gap diagnostics include code/capability/remediation fields"
requirements-completed: [ADPT-04, ADPT-05, ADPT-06]
duration: 14min
completed: 2026-03-03
---

# Phase 7: Additional Adapter Scaffolds Summary (Plan 01)

**Scaffold providers for Gemini/OpenCode/Mistral are now contract-registered, dormant by default, and machine-diagnosable when inactive or unsupported.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-03T23:38:00Z
- **Completed:** 2026-03-03T23:52:00Z
- **Tasks:** 3
- **Files changed:** 8

## Accomplishments

- Added minimal scaffold provider modules:
  - `scripts/adapters/providers/gemini.js`
  - `scripts/adapters/providers/opencode.js`
  - `scripts/adapters/providers/mistral.js`
- Extended router provider registry and diagnostics behavior for scaffold providers.
- Added activation-gate checks with structured inactive errors:
  - `code: SCAFFOLD_PROVIDER_INACTIVE`
  - `capability: adapters.scaffolds.<provider>`
  - remediation hint string
- Added structured unsupported-native scaffold error:
  - `code: SCAFFOLD_CAPABILITY_UNSUPPORTED`
- Added scaffold defaults to config paths:
  - `config.example.json`
  - `configEnsure()` defaults in `scripts/marketing-tools.js`
- Updated installer completion output with scaffold activation hints (non-invasive hook).

## Task Commits

1. **Task 1-3: Scaffold provider modules + gating + install hook** - feat commit for Plan 07-01

## Files Created/Modified

- `scripts/adapters/providers/gemini.js` - minimal scaffold command map.
- `scripts/adapters/providers/opencode.js` - minimal scaffold command map.
- `scripts/adapters/providers/mistral.js` - minimal scaffold command map.
- `scripts/adapters/command-router.js` - scaffold registry, activation gating, structured scaffold errors.
- `scripts/adapters/capability-matrix.js` - scaffold provider metadata markers.
- `scripts/marketing-tools.js` - scaffold defaults and routing config propagation.
- `config.example.json` - scaffold activation config defaults.
- `bin/install.js` - scaffold activation hint output.

## Decisions Made

- Minimal command subset for scaffolds remains intentionally small in this phase to avoid implying parity.
- Scaffold activation is explicit config opt-in, preserving current provider behavior by default.

## Deviations from Plan

None.

## Issues Encountered

- Validation command confirmed inactive scaffold diagnostics as expected; parity harness remained unaffected.

## User Setup Required

None.

## Next Phase Readiness

- Phase 07-02 can now validate scaffold registration and expected-failure contract via dedicated conformance script.

---
*Phase: 07-additional-adapter-scaffolds*
*Completed: 2026-03-03*
