# Phase 4: Cross-Adapter State Continuity - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Guarantee pause/resume/progress continuity across adapters while preserving existing state/data schemas. This phase defines continuity rules and compatibility behavior, not new workflow capabilities.

</domain>

<decisions>
## Implementation Decisions

### Resume Source-of-Truth Priority
- Resume source precedence is:
  1. `.continue-here.md`
  2. `STATE.md` frontmatter
  3. Computed pipeline snapshot
- This applies consistently across Claude and Codex adapter entrypoints.

### Freshness Conflict Rule
- Between `.continue-here.md` and `STATE.md`, newest timestamped artifact wins.
- If timestamps are unavailable or equal, use default precedence (`.continue-here.md` first).

### Corrupt/Missing Artifact Fallback
- If top-priority resume artifact is missing/corrupt, fallback to next source.
- Fallback must emit a structured warning payload (not silent).
- Resume should not hard-fail solely due to one bad artifact if lower-priority sources are valid.

### Cross-Adapter Provenance Metadata
- Track provider provenance in state artifacts:
  - `last_provider`
  - `paused_by_provider`
- Provenance fields must be backward-compatible additions only (no schema break).

### Locked Prior Decisions Carried Forward
- State/data schema compatibility is non-negotiable (`SAFE-03`).
- Provider-native command surfaces remain unchanged (`/gmd:*`, `$gmd-*`).
- Alias remains optional and out of continuity-critical path.

### Claude's Discretion
- Exact warning payload structure and warning code names.
- Timestamp parsing tolerance/normalization details.
- Whether provenance fields live only in frontmatter or in both frontmatter + continue file headings.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/marketing-tools.js`:
  - `initResume()` already reads both `STATE.md` and `.continue-here.md`.
  - `determineSuggestedAction()` is current resume routing decision point.
  - `pause()` writes `.continue-here.md` and state fields (`paused_at`, `pause_reason`).
- `scripts/adapters/command-router.js`: central provider context entry for metadata propagation if needed.
- `scripts/verify_claude_parity.js`: parity validation pattern reusable for continuity checks in later phases.

### Established Patterns
- State is persisted in Markdown frontmatter + local files under `data/`.
- CLI failures/warnings are surfaced as structured JSON-like payloads.
- Adapter-specific behavior is isolated in adapter/runtime boundaries.

### Integration Points
- Resume precedence/fallback logic should be centralized where `initResume()` and `determineSuggestedAction()` resolve state.
- Provenance metadata writes should occur in pause/resume state mutation paths.
- Continuity validation should test both provider modes (`GMD_PROVIDER=claude|codex`) on same persisted artifacts.

</code_context>

<specifics>
## Specific Ideas

- Add a continuity check script for pause-in-one-provider/resume-in-other-provider scenarios before phase close.
- Include a deterministic warning field when fallback source is used (`resume_source_fallback`).
- Preserve existing `STATE.md` keys while extending with provenance keys only when known.

</specifics>

<deferred>
## Deferred Ideas

- Manual verification gate parity policy (Phase 5).
- Full cross-adapter parity harness and CI matrix (Phase 6+).
- Additional adapter scaffold continuity coverage (Phase 7).

</deferred>

---

*Phase: 04-cross-adapter-state-continuity*
*Context gathered: 2026-03-03*
