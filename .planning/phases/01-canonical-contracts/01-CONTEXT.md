# Phase 1: Canonical Contracts - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Define a provider-agnostic command/action contract and capability matrix that all assistant adapters implement consistently. This phase sets contract structure and naming policy, not full adapter implementation.

</domain>

<decisions>
## Implementation Decisions

### Command Naming Model
- Keep provider-native command surfaces per assistant.
- Add canonical aliases in addition to native commands.
- Canonical alias syntax: `gmd:<action>`.
- Aliases are opt-in via config and documented (not always-on by default).
- On naming conflicts, native command behavior wins; alias path warns and suggests alternative naming.

### Contract Scope Anchor
- Canonical contracts in this phase define shared action vocabulary and adapter obligations.
- New assistant capabilities are out of scope for this phase and remain in later roadmap phases.

### Claude's Discretion
- Exact configuration key names for alias enablement.
- Warning message wording and conflict-resolution UX details.
- Internal mapping file layout for native-to-canonical command routing.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/marketing-tools.js`: existing single-call initialization pattern can inform canonical action payload conventions.
- `bin/install.js`: installer/update flow can host adapter-specific command registration with shared manifest logic.
- `skills/*/SKILL.md`: current command skill topology provides source inventory for native command mapping.

### Established Patterns
- CLI command scripts follow structured argument parsing and JSON-like machine-readable outputs.
- Local-first state model (`SQLite + Markdown + JSON`) should remain unchanged by contract design.
- Existing workflow quality gates and manual verification checks are already enforced and must be preserved.

### Integration Points
- Adapter command routing should connect at command invocation layer (skills/installer/hook wiring), not deep inside Python business scripts.
- Capability matrix should be referenced by adapter dispatch layer before workflow invocation.

</code_context>

<specifics>
## Specific Ideas

- Keep user ergonomics native per assistant, but allow portable canonical aliases for cross-assistant users.
- Make alias behavior explicit and configurable to avoid surprising existing users.

</specifics>

<deferred>
## Deferred Ideas

- Exact canonical action field schema strictness (coarse vs atomic granularity) — discuss in planning/research.
- Capability matrix enforcement mode (hard fail vs graceful degrade policy details) — discuss in planning/research.
- Formal parity definition (output parity vs state-transition parity) — addressed in later parity-focused phases.

</deferred>

---

*Phase: 01-canonical-contracts*
*Context gathered: 2026-03-03*
