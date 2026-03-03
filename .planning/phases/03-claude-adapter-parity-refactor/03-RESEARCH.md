# Phase 3: Claude Adapter Parity Refactor - Research

**Researched:** 2026-03-03
**Domain:** Claude adapter parity migration to shared command-routing contract
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Regression comparison baseline is the last tagged release.
- Parity model is hybrid: strict equality for key state-driving fields and semantic equivalence for non-critical output details.
- No user-visible behavior changes are allowed in this refactor.
- Any parity regression blocks phase completion.
- Claude native surface remains `/gmd:*`.
- Canonical alias syntax remains `gmd:<action>` and optional.
- Codex strict-native policy remains unchanged in this phase.

### Claude's Discretion
- Exact strict key-field list per command.
- Fixture/comparison implementation details.
- Refactor granularity/order inside adapter/router/runtime boundary.

### Deferred Ideas (OUT OF SCOPE)
- Cross-adapter pause/resume continuity details (Phase 4).
- Global gate harmonization (Phase 5).
- Full parity harness matrix automation (Phase 6).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ADPT-02 | Existing Claude workflow commands run without behavioral regression after adapter refactor | Define strict command-surface parity checks and migration steps that keep `/gmd:*` outcomes stable |
| CMD-03 | Campaign progress/verification outputs remain equivalent across adapters | Define strict vs semantic comparison contract for `progress` and `verify` outputs |
</phase_requirements>

## Summary

Phase 3 should treat Claude as a first-class adapter consumer of the canonical routing layer, not as special-case orchestration. The codebase already routes unknown commands through `routeCommand()` and translates canonical actions to runtime commands in `scripts/marketing-tools.js`; this phase should eliminate any remaining implicit Claude assumptions in shared logic while preserving command behavior.

A low-risk plan split is:
1. Refactor Claude adapter/runtime boundary for contract purity and command-surface stability.
2. Add tagged-baseline parity checks for `/gmd:campaign-progress` and `/gmd:campaign-verify` (plus command map regression checks), with hybrid strict/semantic assertions.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js + CommonJS | Existing | Adapter routing/runtime execution | Existing implementation surface |
| `scripts/adapters/providers/claude.js` | Existing | Claude native map source of truth | Already maps native commands to canonical actions |
| `scripts/adapters/command-router.js` | Existing | Shared provider dispatch and alias policy | Existing native-first + alias support |
| `scripts/marketing-tools.js` | Existing | Runtime command execution + JSON outputs | Existing command ingress boundary |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Git tags (`v1.1.1` baseline) | Existing repo metadata | Golden behavior baseline | Capture pre-refactor parity snapshots |
| Existing codex sweep pattern | Existing | Validator script pattern | Model parity script structure for Claude |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tagged baseline parity | Compare against working tree only | Misses regressions that drifted recently |
| Hybrid strict/semantic checks | Full byte equality | Too brittle for benign non-critical output changes |
| Blocking regressions | Warn-and-proceed | Violates locked phase policy |

## Architecture Patterns

### Pattern 1: Provider Map as Command Source of Truth
**What:** Keep `/gmd:*` inventory in `providers/claude.js` and validate every key routes to canonical actions.
**When to use:** Native command parity and regression guardrails.

### Pattern 2: Shared Route-Then-Execute Flow
**What:** All non-core command strings should pass through `routeCommand()` before command execution mapping.
**When to use:** Removing Claude-only assumptions in shared orchestration.

### Pattern 3: Baseline Snapshot + Comparator
**What:** Capture outputs at tag baseline and current HEAD for selected commands, then compare with strict/semantic rules.
**When to use:** `progress` and `verify` parity gates for CMD-03.

### Anti-Patterns to Avoid
- Editing Claude command semantics while claiming internal-only refactor.
- Comparing progress/verify only by status code without field-level checks.
- Mixing codex policy changes into this phase.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| New command inventory source | Hard-coded duplicate lists | `providers/claude.js` commandMap keys | Prevents drift |
| Custom one-off JSON diff logic in shell | Ad hoc text diff | Node script with explicit strict/semantic field contracts | Deterministic parity result |
| Separate CLI path for Claude | Special-case branch in shared core | Existing adapter router + action mapping flow | Preserves architecture direction |

## Common Pitfalls

### Pitfall 1: False parity confidence from shallow checks
**What goes wrong:** Command exists but payload shape drifts.
**How to avoid:** Lock strict key fields for progress/verify and validate them explicitly.

### Pitfall 2: Baseline mismatch from unpinned reference
**What goes wrong:** Comparing against moving branch instead of release tag.
**How to avoid:** Resolve latest tag once and persist snapshots/metadata for reproducibility.

### Pitfall 3: Refactor leakage into user-visible behavior
**What goes wrong:** Message or field changes alter downstream scripts.
**How to avoid:** Block on any user-visible regression and keep refactor scoped to adapter boundary internals.

## Code Examples

### Claude command map parity probe
```javascript
const claude = require('./scripts/adapters/providers/claude');
const keys = Object.keys(claude.commandMap);
const allNative = keys.every((k) => k.startsWith('/gmd:'));
```

### Strict vs semantic comparator shape
```javascript
const STRICT_FIELDS = ['current_step', 'current_step_name', 'progress_pct', 'status', 'score_pct'];
```

## Sources

### Primary (HIGH confidence)
- `.planning/phases/03-claude-adapter-parity-refactor/03-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `scripts/adapters/providers/claude.js`
- `scripts/adapters/command-router.js`
- `scripts/marketing-tools.js`
- `scripts/verify_codex_command_sweep.js`

### Secondary (MEDIUM confidence)
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/CONVENTIONS.md`

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Locked parity constraints: HIGH (direct from context)
- Refactor approach: HIGH (based on existing adapter routing architecture)
- Comparator strategy: HIGH (aligned with CMD-03 requirement and existing script patterns)

**Research date:** 2026-03-03
**Valid until:** 2026-04-03
