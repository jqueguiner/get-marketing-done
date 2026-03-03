# Phase 6: Parity Test Harness - Research

**Researched:** 2026-03-03
**Domain:** Cross-adapter command/state/output parity harness for Claude and Codex
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Scope focuses on critical flows: init, progress, pause/resume, send-prepare.
- Provider matrix for this phase is Claude + Codex only.
- One deterministic fixture campaign is required for repeatable runs.
- Comparison model is hybrid strict + semantic.
- Harness should be a single orchestrator runner that invokes specialized validators sequentially (fail-fast per section).
- Diagnostics must be JSON, field-level where possible, requirement-tagged (`CMD-01`, `QUAL-01`, `QUAL-02`), and non-zero on mismatch.

### Claude's Discretion
- Exact file/module boundaries for orchestration and shared assertion helpers.
- Scenario naming and report field naming details.
- Shared helper abstraction level across validators.

### Deferred Ideas (OUT OF SCOPE)
- Scaffold adapter matrix parity (Phase 7+).
- CI workflow matrix wiring (Phase 8 docs/migration).
- Full snapshot parity for all non-critical fields.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CMD-01 | Consistent core GTM step invocation/state transitions across adapters | Add flow-level smoke checks for init/progress/pause-resume/send-prepare under both providers |
| QUAL-01 | Detect output/state mismatches between adapters | Add requirement-tagged parity mismatch reporting in orchestrated validator |
| QUAL-02 | Validate key flows in Codex + Claude adapters | Include deterministic provider matrix scenarios for critical flows |
</phase_requirements>

## Summary

Phase 6 should consolidate existing validator logic into a deterministic parity harness with requirement-aware diagnostics, then add explicit command-flow smoke coverage for critical GTM flows. The repository already has reusable scripts for command sweep, Claude parity, cross-adapter continuity, and gate consistency. The gap is orchestration, uniform diagnostics, and explicit CMD-01/QUAL-01/QUAL-02 coverage mapping.

Recommended split:
1. Build `verify_adapter_parity.js` as orchestrator + normalized reporting contract over existing/specialized checks.
2. Add `verify_command_flow_smoke.js` for direct critical-flow assertions and document phase-level verification evidence.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js + CommonJS | Existing | Script runner/harness execution | Existing validator ecosystem |
| `scripts/marketing-tools.js` | Existing | Shared adapter runtime command surface | Single execution authority |
| Existing validator scripts | Existing | Reusable parity and continuity checks | Avoid duplicate logic |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `scripts/adapters/command-router.js` | Existing | Provider normalization and action routing assertions | Native/canonical route parity signals |
| `.planning/phases/*/*-VERIFICATION.md` patterns | Existing | Requirement closure evidence format | Phase close artifacts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Orchestrated harness | Separate independent scripts only | Harder to map failures to requirements and aggregate results |
| Hybrid strict+semantic | Full strict snapshots | High false-positive noise on non-critical differences |
| Single fixture campaign | Multi-fixture matrix now | More coverage but slower/noisier before baseline harness stabilizes |

## Architecture Patterns

### Pattern 1: Sectioned Orchestrator with Requirement Mapping
**What:** Run parity sections in order (surface, flow, continuity, gates), each section tagged to one or more requirements.
**When to use:** Top-level parity harness command.

### Pattern 2: Strict vs Semantic Assertions by Flow
**What:** Strict-check status-driving fields; semantic-check collections/order-insensitive structures.
**When to use:** progress/verify and other structured runtime outputs.

### Pattern 3: State Isolation by Scenario
**What:** Backup and restore mutable artifacts (`STATE.md`, `.continue-here.md`) per scenario run.
**When to use:** Any scenario that mutates runtime state (pause/resume/send-prepare).

### Anti-Patterns to Avoid
- Re-implementing all existing validators rather than composing them.
- Un-tagged mismatch output that cannot trace to requirements.
- Shared mutable state across scenarios without restore guardrails.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Ad hoc parity logs | Free-text mismatch strings | Structured JSON check objects with requirement IDs | Machine-readable diagnostics |
| Duplicate continuity logic | New continuity script | Compose `verify_cross_adapter_continuity.js` | Reuse stable checks |
| Ambiguous pass criteria | Global boolean only | Section-level pass/fail + aggregate status | Actionable failure triage |

## Common Pitfalls

### Pitfall 1: Drift between orchestrator and underlying scripts
**What goes wrong:** New checks added to specialized validators but orchestrator not updated.
**How to avoid:** Define explicit section manifest in orchestrator with script path + requirement tags.

### Pitfall 2: Over-strict parity on ancillary fields
**What goes wrong:** False failures on non-functional metadata differences.
**How to avoid:** Keep strict fields limited to behavior-driving keys; semantic-normalize non-critical blocks.

### Pitfall 3: State pollution between checks
**What goes wrong:** One scenario affects next scenario causing flaky parity failures.
**How to avoid:** Backup/restore in each script; orchestrator validates clean exits.

## Code Examples

### Orchestrator section contract shape
```javascript
{ section: 'flow_smoke', requirements: ['CMD-01','QUAL-02'], status: 'passed', checks: [...] }
```

### Requirement-tagged mismatch entry
```javascript
{ requirement: 'QUAL-01', check: 'progress.strict.progress_pct', expected: 63, actual: 50 }
```

## Sources

### Primary (HIGH confidence)
- `.planning/phases/06-parity-test-harness/06-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `scripts/verify_codex_command_sweep.js`
- `scripts/verify_claude_parity.js`
- `scripts/verify_cross_adapter_continuity.js`
- `scripts/verify_quality_gate_consistency.js`

### Secondary (MEDIUM confidence)
- `scripts/marketing-tools.js`
- `scripts/adapters/command-router.js`
- `README.md` validation command sections

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Harness orchestration strategy: HIGH
- Requirement-to-check mapping: HIGH
- Reuse of existing validators: HIGH

**Research date:** 2026-03-03
**Valid until:** 2026-04-03
