# Phase 6: Parity Test Harness - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a parity test harness that compares command outcomes and key workflow state transitions between Claude and Codex across critical flows. This phase establishes deterministic parity checks and diagnostics, not new adapter capabilities.

</domain>

<decisions>
## Implementation Decisions

### Parity Scope Inventory
- Cover critical flows: init, progress, pause/resume, send-prepare.
- Provider matrix for this phase is Claude + Codex only.
- Use one deterministic fixture campaign for repeatable parity scenarios.
- Coverage depth focuses on command outcomes + key state transitions (not full-payload snapshots for all commands).

### Comparison Strictness Model
- Use hybrid strict + semantic parity checks.
- Strict fields include status-driving outputs and key state fields (e.g., `status`, `score`, `progress_pct`, `next_action`, required state transition keys).
- Semantic checks allow non-critical variance (ordering, ancillary text, optional metadata).
- Baseline authority is current shared-runtime contracts, not tag-wide historical diffing.

### Harness Execution Model
- Use a single parity orchestrator runner that invokes specialized validators.
- Execute harness sections sequentially with fail-fast per section.
- Isolate state per scenario using backup/restore patterns.
- Keep this phase CLI-runner focused; CI wiring may be documented/deferred to later docs work.

### Failure Diagnostics Contract
- Output JSON summary with explicit failing check list.
- Report field-level mismatch diagnostics with expected/actual excerpts.
- Tag failures with requirement IDs: `CMD-01`, `QUAL-01`, `QUAL-02`.
- Exit non-zero on any mismatch.

### Locked Prior Decisions Carried Forward
- Native command surfaces remain unchanged (`/gmd:*`, `$gmd-*`).
- Runtime policy authority remains centralized in shared runtime.
- Manual verification gate behavior remains adapter-uniform and mandatory by default.

### Claude's Discretion
- Exact runner file naming and module boundaries for orchestrator vs specialized checks.
- Scenario identifier naming and report field naming details.
- Optional helper abstractions for shared assertion logic.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Existing validators provide direct reusable patterns:
  - `scripts/verify_codex_command_sweep.js` (native surface sweep)
  - `scripts/verify_claude_parity.js` (hybrid strict/semantic parity)
  - `scripts/verify_cross_adapter_continuity.js` (cross-provider scenario checks with state restore)
  - `scripts/verify_quality_gate_consistency.js` (blocked/pass parity contract + scenario matrix)
- Shared runtime adapter ingress in `scripts/marketing-tools.js` and router/provider modules under `scripts/adapters/`.

### Established Patterns
- Validator scripts are Node/CommonJS stdlib-only and emit machine-readable JSON.
- Regression checks exit non-zero when mismatches occur.
- Scenario scripts backup/restore mutable state artifacts for deterministic reruns.

### Integration Points
- Phase 6 harness should compose existing validator strengths rather than duplicate logic.
- Requirement-tagged diagnostics should map directly into phase verification artifacts.
- README command-gate section already hosts validation command references and should stay consistent with new parity harness entrypoint(s).

</code_context>

<specifics>
## Specific Ideas

- Create one top-level parity runner that executes section validators in sequence and aggregates requirement-mapped diagnostics.
- Normalize strict-field sets by flow to keep parity assertions explicit and auditable.
- Reuse backup/restore helpers from current validators to avoid cross-scenario state bleed.

</specifics>

<deferred>
## Deferred Ideas

- Scaffold-adapter parity matrix coverage for Gemini/OpenCode/Mistral (Phase 7+).
- CI workflow automation and matrix scheduling details beyond local CLI harness semantics (Phase 8 docs/migration pipeline).
- Full snapshot parity for all non-critical payload fields.

</deferred>

---

*Phase: 06-parity-test-harness*
*Context gathered: 2026-03-03*
