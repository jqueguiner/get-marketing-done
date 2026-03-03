# Phase 7: Additional Adapter Scaffolds - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Add contract-compliant scaffold adapters for Gemini, OpenCode, and Mistral against the shared canonical contracts. This phase focuses on scaffold registration and conformance signaling, not full behavior parity or feature completeness.

</domain>

<decisions>
## Implementation Decisions

### Scaffold Command-Surface Policy
- New scaffold providers use minimal command maps for this phase (critical command subset only).
- Unknown native commands for scaffold providers must hard-fail.
- Canonical alias mode remains opt-in (`gmd:<action>`) and not enabled by default.

### Capability-Gap Declaration Contract
- Capability gaps remain centralized in `scripts/adapters/capability-matrix.js` with per-provider flags.
- Gap handling must be machine-enforced via router/runtime diagnostics, not docs-only.
- Unsupported paths must return structured diagnostics including:
  - stable error code,
  - capability key,
  - remediation hint.

### Registration and Activation Model
- Scaffold providers are registered in routing/install surfaces but activation is gated by explicit configuration.
- Installer scope in this phase is non-invasive scaffold registration hooks only (no full provider UX flows).
- Shared core runtime behavior must not change to accommodate scaffold providers.

### Scaffold Conformance Validation
- Scaffold completeness requires conformance checks for:
  - command registration,
  - contract-compliant routing,
  - expected-failure behavior for unsupported capabilities.
- Validation should reuse the Phase 6 parity harness pattern with scaffold mode/filters where appropriate.
- Pass criteria: scaffold commands route correctly and unsupported capabilities fail with structured diagnostics.

### Locked Prior Decisions Carried Forward
- Native command surfaces for existing providers remain unchanged.
- Shared runtime and router boundaries remain source-of-truth for behavior.
- Adapter additions must avoid forking business logic.

### Claude's Discretion
- Exact scaffold command subset per provider.
- Specific config key names for scaffold activation gates.
- Validator naming and section-level integration details.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/adapters/capability-matrix.js` already contains scaffold provider entries (`gemini`, `opencode`, `mistral`) and supports metadata surface.
- `scripts/adapters/canonical-actions.js` defines the stable action contract scaffolds must target.
- `scripts/adapters/command-router.js` provides centralized provider normalization and command-to-action routing guardrails.
- `bin/install.js` already includes multi-runtime conversion hooks and command transformation utilities that can host scaffold registration.
- Phase 6 validators (`verify_adapter_parity.js`, `verify_command_flow_smoke.js`) provide reusable conformance and expected-failure validation patterns.

### Established Patterns
- Adapter modules expose immutable `commandMap` exports under `scripts/adapters/providers/`.
- Runtime errors use structured JSON outputs with stable codes.
- Validation scripts are Node/CommonJS stdlib-only and suitable for scaffold conformance checks.

### Integration Points
- Router provider registry currently only includes `claude` and `codex`; scaffold providers need explicit module registration.
- Capability matrix entries for scaffold providers should align with router diagnostics and gating behavior.
- Installer registration should map scaffold command artifacts without changing shared runtime workflow semantics.

</code_context>

<specifics>
## Specific Ideas

- Add provider modules for `gemini`, `opencode`, and `mistral` with minimal critical command subsets mapped to canonical actions.
- Introduce scaffold activation config gates so dormant scaffolds do not affect default operator paths.
- Add scaffold conformance checks that validate expected structured failures for unsupported capabilities.

</specifics>

<deferred>
## Deferred Ideas

- Full command-surface parity for scaffold providers.
- CI matrix expansion across all scaffold providers.
- End-user setup/migration narratives and compatibility UX polish (Phase 8).

</deferred>

---

*Phase: 07-additional-adapter-scaffolds*
*Context gathered: 2026-03-03*
