# Phase 3: Claude Adapter Parity Refactor - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Refactor existing Claude integration to run fully through the shared adapter contract while preserving existing `/gmd:*` behavior and removing Claude-specific assumptions from shared orchestration logic.

</domain>

<decisions>
## Implementation Decisions

### Claude Parity Baseline
- Regression comparison baseline is the **last tagged release**.
- Phase 3 validation must compare Claude behavior against tagged-release command expectations, not current branch drift.

### Parity Strictness Contract
- Use a **hybrid parity model**:
  - Strict equality for key fields that drive workflow behavior/state transitions.
  - Semantic equivalence for non-critical fields (ordering, ancillary message text, optional metadata).
- Key-field strictness is required for progress and verify outputs tied to `CMD-03`.

### User-Visible Behavior Policy
- No user-visible behavior changes are allowed in this refactor.
- Only internal diagnostics/adapter implementation details may change, provided command semantics and outputs remain stable per hybrid parity contract.

### Phase Failure Policy
- Any parity regression blocks phase completion.
- No waivers for Phase 3 parity breaks.

### Locked Prior Decisions Carried Forward
- Claude native surface remains `/gmd:*`.
- Canonical alias syntax remains `gmd:<action>` and is optional.
- Codex strict native policy (`$gmd-*` only with hard-fail on unknown native) remains unchanged and out of scope for modification in this phase.

### Claude's Discretion
- Exact list of key fields to treat as strict for each refactored Claude command path.
- Regression fixture format and comparison implementation details.
- Internal refactor granularity/order across router/provider/runtime files.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/adapters/providers/claude.js`: current Claude native command map to canonical actions.
- `scripts/adapters/command-router.js`: native-first routing and alias handling already centralized.
- `scripts/marketing-tools.js`: adapter routing entry point and action-to-command translation boundary.
- `scripts/verify_codex_command_sweep.js`: example of phase-gate command coverage validation pattern.

### Established Patterns
- Adapter provider modules export immutable command maps.
- Router returns canonical action payloads and uses explicit hard-fail errors where policy requires.
- Runtime emits structured JSON errors with provider-native command inventories.

### Integration Points
- Claude refactor should stay within adapter/provider/router/runtime boundaries.
- Shared orchestration should avoid Claude-specific assumptions after refactor.
- Progress/verify parity assertions should target command outputs and state-relevant fields.

</code_context>

<specifics>
## Specific Ideas

- Phase plans should include a tagged-release baseline capture step before refactor edits.
- Progress and verify command checks should explicitly classify strict vs semantic fields.
- Refactor completion should require a deterministic parity check pass for Claude command surface in-scope.

</specifics>

<deferred>
## Deferred Ideas

- Cross-adapter pause/resume state bridge details (Phase 4).
- Global verification-gate policy normalization across adapters (Phase 5).
- Full parity harness automation and diagnostics matrix (Phase 6).

</deferred>

---

*Phase: 03-claude-adapter-parity-refactor*
*Context gathered: 2026-03-03*
