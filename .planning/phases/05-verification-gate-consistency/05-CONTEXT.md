# Phase 5: Verification Gate Consistency - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Enforce manual verification and send-safety gates uniformly across adapters. This phase standardizes gate authority, enforcement behavior, and failure output contracts for gated actions.

</domain>

<decisions>
## Implementation Decisions

### Gate Authority Model
- Single source of truth is a shared runtime gate policy object in `scripts/marketing-tools.js` backed by `config.json` (`quality_gates`).
- Skill-level checks are advisory/UX-level, not authoritative for enforcement.

### Adapter Consistency Scope
- Gate enforcement behavior must be identical for Claude and Codex.
- No provider-specific gate bypass or leniency paths.

### Policy Evaluation Timing
- Gate policy is evaluated at command execution time for every gated action.
- Session-level caching is not authoritative.

### Policy Storage Model
- Continue using `config.json` `quality_gates` as policy storage.
- Keep backward-compatible defaults via `config-ensure` path.

### Locked Prior Decisions Carried Forward
- Manual verify before send remains required by default.
- Provider-native command surfaces remain unchanged.
- State/schema compatibility requirements from prior phases stay intact.

### Claude's Discretion
- Exact internal policy API shape for gate checks.
- Gated action inventory granularity and mapping details.
- Remediation field naming for blocked responses.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/marketing-tools.js`:
  - `configEnsure()` already defines `quality_gates` defaults.
  - `verify()` already emits structured readiness checks.
  - `outreach` action mapping exists through canonical route path.
- `skills/run-instantly/SKILL.md` already communicates manual-verify expectations and checklist semantics.
- Adapter routing path (`scripts/adapters/command-router.js`) already standardizes provider ingress.

### Established Patterns
- Structured JSON outputs are used for runtime success/failure responses.
- Provider-specific behavior is isolated to adapter layer; core runtime is shared.
- Config-driven behavior is centralized in `config.json` + `config-ensure`.

### Integration Points
- Gate enforcement should occur in shared runtime command execution path, not per-provider map.
- Blocked actions should emit consistent payloads regardless of provider.
- `verify` data can be used as remediation context for blocked send-adjacent commands.

</code_context>

<specifics>
## Specific Ideas

- Introduce a centralized `evaluateQualityGates` helper for send-adjacent actions.
- Add explicit blocked response code (for example `QUALITY_GATE_BLOCKED`) with remediation checklist links.
- Add adapter-uniform gate check validator script for critical send paths.

</specifics>

<deferred>
## Deferred Ideas

- Full parity harness matrix assertions (Phase 6).
- Additional adapter-specific gate nuances for scaffold providers (Phase 7).
- Extended docs/migration narratives (Phase 8).

</deferred>

---

*Phase: 05-verification-gate-consistency*
*Context gathered: 2026-03-03*
