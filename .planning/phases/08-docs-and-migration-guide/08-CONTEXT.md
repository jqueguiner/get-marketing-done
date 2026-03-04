# Phase 8: Docs and Migration Guide - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Publish clear setup, compatibility, and migration documentation for multi-assistant support. This phase clarifies usage and support levels; it does not add new runtime capabilities.

</domain>

<decisions>
## Implementation Decisions

### Area 1: Command Docs Structure and Naming Clarity
- Use a two-tier structure:
  - task-first summary in main docs,
  - provider appendix for Claude/Codex/alias specifics.
- Quick-start examples should show Claude and Codex side-by-side for immediate cross-assistant clarity.
- Canonical alias `gmd:<action>` is documented as advanced/optional and explicitly off by default.
- Include a compact error-contract table for unknown/unsupported command paths rather than verbose raw payload dumps.

### Area 2: Compatibility Matrix Policy (Full vs Scaffold)
- Define three explicit support levels in docs:
  - `Full`: behaviorally supported and parity-validated.
  - `Scaffold`: registered and contract-conformant with structured capability-gap diagnostics.
  - `Unsupported`: not available.
- Claude and Codex are documented as `Full` for validated flows.
- Gemini/OpenCode/Mistral are documented as `Scaffold` only in this milestone.
- Matrix wording must avoid implying full parity for scaffold providers.

### Area 3: Migration Guide Path (Claude-first installs)
- Migration keeps existing Claude-native usage unchanged by default (no breaking command renames).
- Add a clear "stay as-is" path for current Claude users.
- Add an opt-in Codex path (`$gmd-*`) with minimal setup and validation steps.
- Alias mode remains optional and separately documented as advanced compatibility mode.
- Include rollback guidance: disable optional modes and continue on Claude-native surface.

### Area 4: Validation and Runbook Presentation
- Provide two runbooks:
  - operator quick validation (minimal health checks before daily use),
  - maintainer release validation (full verify script sequence).
- Recommended default release sequence keeps scaffold conformance as explicit but separate from core parity default.
- Add failure-triage table mapping key validator failure codes/areas to remediation actions.
- Keep command list deterministic and copy-pasteable with expected pass/fail interpretation.

### Locked Prior Decisions Carried Forward
- Native surfaces remain primary (`/gmd:*` for Claude, `$gmd-*` for Codex).
- Canonical alias `gmd:<action>` is opt-in only.
- Scaffold providers remain config-gated and capability-gap explicit.
- Manual verification and quality-gate posture remains mandatory.

### Claude's Discretion
- Exact README section order and heading names.
- Exact table schema/column naming for compatibility matrix.
- Level of detail split between `README.md`, `tutorial.md`, and `docs/` pages.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `README.md` already contains command, validation, and compatibility narrative sections that should be extended rather than replaced.
- `tutorial.md` can host migration flow examples and onboarding depth without overloading README.
- `scripts/verify_*.js` scripts provide authoritative validation commands to document:
  - `verify_codex_command_sweep.js`
  - `verify_claude_parity.js`
  - `verify_cross_adapter_continuity.js`
  - `verify_quality_gate_consistency.js`
  - `verify_adapter_parity.js`
  - `verify_command_flow_smoke.js`
  - `verify_scaffold_conformance.js`
- `scripts/adapters/capability-matrix.js` is source-of-truth for support-level wording alignment.

### Established Patterns
- Validator docs in README use short command block + policy bullets.
- Structured diagnostics are stable and machine-readable; docs should reference contract semantics, not transient phrasing.
- Phase 7 established scaffold terminology and inactive/unsupported structured error contracts.

### Integration Points
- Compatibility matrix and migration wording must align with runtime behavior in `scripts/marketing-tools.js` and router/provider contracts.
- Documentation claims should map directly to verification artifacts from Phase 6 and Phase 7.
- Phase 8 plans should split between:
  - command/setup/readme/tutorial updates,
  - migration + compatibility matrix deep documentation.

</code_context>

<specifics>
## Specific Ideas

- Add one concise "Which command style should I use?" decision guide near command docs.
- Add one compatibility matrix table with support-level legend and validation proof links.
- Add one migration checklist for Claude-first teams with optional Codex adoption path.
- Add one maintainer validation section with strict ordering and non-zero failure policy.

</specifics>

<deferred>
## Deferred Ideas

- CI matrix automation across scaffold providers (`QUAL-03`) remains a later milestone item.
- Backward-compatibility migration checks across minor versions (`QUAL-04`) remain future work.
- Full command-surface parity claims for Gemini/OpenCode/Mistral remain out of scope.

</deferred>

---

*Phase: 08-docs-and-migration-guide*
*Context gathered: 2026-03-04*
