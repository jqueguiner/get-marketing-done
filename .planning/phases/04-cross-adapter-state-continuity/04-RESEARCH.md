# Phase 4: Cross-Adapter State Continuity - Research

**Researched:** 2026-03-03
**Domain:** Pause/resume/progress continuity across Claude and Codex adapters with schema compatibility guarantees
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Resume precedence is `.continue-here.md` > `STATE.md` frontmatter > computed pipeline snapshot.
- Between continue/state artifacts, newest timestamp wins.
- If highest-priority artifact is missing/corrupt, fallback to next source with structured warning (no silent fallback).
- Track provenance metadata: `last_provider`, `paused_by_provider`.
- Schema compatibility is non-negotiable (`SAFE-03`): additive, backward-compatible changes only.

### Claude's Discretion
- Warning payload schema and warning code naming.
- Timestamp normalization details.
- Exact artifact location(s) for provenance fields.

### Deferred Ideas (OUT OF SCOPE)
- Manual verification gate parity policy (Phase 5).
- Full parity harness/CI matrix (Phase 6+).
- Additional adapter scaffold continuity beyond Claude/Codex (Phase 7).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CMD-02 | Resume paused work from persisted state when switching assistant frontends | Define cross-provider pause/resume precedence, fallback behavior, and scenario checks |
| SAFE-03 | Preserve existing SQLite/CSV/Markdown schemas during adaptation | Constrain all changes to additive metadata and non-breaking state parsing |
</phase_requirements>

## Summary

Phase 4 should harden state continuity as a contract, not an emergent side effect. Existing `marketing-tools.js` already reads both `STATE.md` and `.continue-here.md` (`initResume`), and writes pause details to both channels (`pause`). This phase should formalize deterministic precedence/fallback and add provenance metadata without changing core data models.

Recommended split:
1. Implement continuity contract in runtime state resolution and state mutation paths.
2. Add cross-adapter continuity validator that executes pause/resume/progress scenarios under both providers against shared persisted artifacts.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js + CommonJS | Existing | Runtime command handling and continuity checks | Existing adapter/runtime surface |
| `scripts/marketing-tools.js` | Existing | pause/resume/progress/state read/write behavior | Direct continuity integration point |
| Markdown frontmatter + `.continue-here.md` | Existing | Persistent state artifacts | Current local-first state model |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `scripts/adapters/command-router.js` | Existing | Provider context awareness and metadata routing | Provider provenance propagation |
| `scripts/verify_claude_parity.js` pattern | Existing | Scripted baseline check architecture | Template for continuity scenario validator |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Precedence + fallback model | Hard-fail on any source mismatch | Breaks resilience and conflicts with locked fallback decision |
| Additive provenance fields | Replace existing state fields | Risks schema break and SAFE-03 violation |
| Runtime continuity script | Manual spot checks only | Non-deterministic and brittle for phase exit |

## Architecture Patterns

### Pattern 1: Deterministic Resume Resolver
**What:** Central resolver that evaluates sources in locked precedence with timestamp arbitration.
**When to use:** `initResume` and any future resume entrypoint.

### Pattern 2: Additive Metadata Evolution
**What:** Extend frontmatter with optional fields (`last_provider`, `paused_by_provider`) without changing required schema.
**When to use:** Pause/resume state writes and state normalization.

### Pattern 3: Cross-Provider Scenario Harness
**What:** Scripted scenario runner that performs pause under provider A then resume/progress under provider B.
**When to use:** Phase exit verification for CMD-02 and SAFE-03.

### Anti-Patterns to Avoid
- Making `.continue-here.md` optional path silently dominant without timestamp checks.
- Writing provider provenance in a way that fails older state readers.
- Introducing provider-specific state file formats.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Independent resume logic copies | Per-command ad hoc checks | Single resolver function in `marketing-tools.js` | Avoid precedence drift |
| New persisted schema files | Extra adapter state blobs | Existing `STATE.md` + `.continue-here.md` | Keeps SAFE-03 compatibility |
| Unstructured fallback messages | Free-text warnings only | Structured warning fields in JSON response | Machine-readable diagnostics |

## Common Pitfalls

### Pitfall 1: Timestamp ambiguity
**What goes wrong:** Newer artifact not selected due to inconsistent parse format.
**How to avoid:** Normalize timestamps to ISO parse path and define tie-break to precedence order.

### Pitfall 2: Hidden fallback behavior
**What goes wrong:** Corrupt top source is ignored with no observability.
**How to avoid:** Emit explicit `resume_source_fallback` warning payload with reason.

### Pitfall 3: Schema regressions
**What goes wrong:** Adding mandatory fields breaks older state files.
**How to avoid:** Keep new provenance fields optional and default-safe in parser logic.

## Code Examples

### Resume precedence contract shape
```javascript
const RESUME_SOURCES = ['continue_file', 'state_frontmatter', 'pipeline_snapshot'];
```

### Structured fallback warning shape
```javascript
{ warning_code: 'RESUME_SOURCE_FALLBACK', from: 'continue_file', to: 'state_frontmatter' }
```

## Sources

### Primary (HIGH confidence)
- `.planning/phases/04-cross-adapter-state-continuity/04-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `scripts/marketing-tools.js`
- `scripts/adapters/command-router.js`

### Secondary (MEDIUM confidence)
- `.planning/phases/03-claude-adapter-parity-refactor/03-VERIFICATION.md`
- `scripts/verify_claude_parity.js`

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Locked continuity decisions: HIGH (direct from context)
- Implementation approach: HIGH (maps to existing state/pause/resume surfaces)
- Validation strategy: HIGH (follows existing scripted verification patterns)

**Research date:** 2026-03-03
**Valid until:** 2026-04-03
