# Phase 2: Codex Adapter Foundation - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement Codex-oriented adapter wiring so GTM stage commands run end-to-end through canonical actions. This phase covers Codex command parsing/translation plus runtime wiring across CLI ingress, installer, and skill registration paths.

</domain>

<decisions>
## Implementation Decisions

### Codex Command Surface
- Codex-native command format is `$gmd-*` only.
- `gmd:<action>` is not a Codex-native command format in this phase.
- Canonical alias syntax remains `gmd:<action>` for optional alias routing, but not as native Codex invocation.

### Routing Fallback Behavior
- If a Codex `$gmd-*` command is unmapped, the router must hard fail with a clear error.
- No fallback to alias resolution for unmapped native Codex commands.
- No compatibility shim table in this phase.

### Runtime Wiring Scope
- Phase 2 must include full wiring: CLI ingress + installer integration + skill registration path updates.
- Codex adapter support should not be limited to `scripts/marketing-tools.js` only.

### Phase Exit Validation
- Completion requires a full command sweep for exposed `$gmd-*` commands.
- Partial smoke coverage is insufficient for phase completion.

### Claude's Discretion
- Exact command inventory and grouping for full-sweep validation execution.
- Error payload shape for unmapped command hard-fail responses.
- Internal file layout details for Codex skill registration bridge.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/adapters/command-router.js`: existing native-first routing flow can enforce strict `$gmd-*` handling for Codex.
- `scripts/adapters/providers/codex.js`: current Codex provider map is the direct extension point.
- `scripts/marketing-tools.js`: ingress dispatch already supports routed command translation.
- `bin/install.js`: installer lifecycle and manifest/command wiring already centralized.
- `skills/*/SKILL.md`: source inventory for command exposure and registration.

### Established Patterns
- CommonJS modules and stdlib-only JS approach across tooling surface.
- Structured JSON error output for command failures in CLI paths.
- Local-first execution model with no provider-specific business logic embedded in Python workflows.

### Integration Points
- Codex native command acceptance should be enforced in adapter/provider map + router boundary.
- Installer updates should wire Codex-facing command registration without changing core workflow scripts.
- Skill registration changes should map `$gmd-*` commands to existing workflow intents via canonical actions.

</code_context>

<specifics>
## Specific Ideas

- Keep Codex UX strict and predictable: one native command family (`$gmd-*`) with explicit failures.
- Treat Phase 2 as operationally complete only when every exposed Codex command path is validated end-to-end.

</specifics>

<deferred>
## Deferred Ideas

- Cross-provider command harmonization strategy beyond Codex (handled in later phases).
- Alias UX refinements and compatibility heuristics (deferred due to strict fail policy in this phase).
- Formal parity contract with Claude outputs (primarily Phase 3 and Phase 6 concerns).

</deferred>

---

*Phase: 02-codex-adapter-foundation*
*Context gathered: 2026-03-03*
