# Phase 8: Docs and Migration Guide - Research

**Researched:** 2026-03-04
**Domain:** Multi-assistant documentation completion (command model, compatibility matrix, migration path, validation runbooks)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Docs must use a two-tier structure: task-first summary + provider appendix.
- Quick-start command examples must show Claude and Codex side-by-side.
- Canonical alias `gmd:<action>` must be documented as advanced/optional and off by default.
- Compatibility docs must use explicit support levels: `Full`, `Scaffold`, `Unsupported`.
- Claude and Codex are `Full` for validated flows in this milestone.
- Gemini/OpenCode/Mistral are `Scaffold` only (no parity overclaims).
- Migration path must preserve existing Claude-native usage by default and provide optional Codex path.
- Validation docs must include operator quick checks, maintainer full checks, and failure-triage guidance.

### Claude's Discretion
- Exact section order and heading naming across README/tutorial/docs.
- Exact compatibility matrix table schema and field names.
- Split depth between README quick-reference and deeper docs pages.

### Deferred Ideas (OUT OF SCOPE)
- CI matrix automation across scaffold providers (`QUAL-03`).
- Minor-version migration check framework (`QUAL-04`).
- Full parity claims for Gemini/OpenCode/Mistral.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DOC-01 | Operator can follow updated docs that explain assistant compatibility, setup differences, and supported commands | Update README/tutorial and add dedicated compatibility + migration + validation runbook docs with aligned support-level language |
</phase_requirements>

## Summary

Phase 8 should consolidate all adapter-facing documentation into a clear operator path and maintainer path without changing runtime behavior. Existing README already contains most validation commands and command compatibility notes, but it lacks: (1) formal support-level matrix language (`Full` vs `Scaffold`), (2) explicit migration checklist for Claude-first installs, and (3) centralized failure triage order.

The architecture capability matrix doc also contains a policy drift: it currently lists Codex prefixes as ``$gmd-`, `gmd:``, while runtime source-of-truth in `scripts/adapters/capability-matrix.js` has Codex native prefix only `'$gmd-'` and alias mode as separate optional behavior. Phase 8 should correct this drift and ensure docs match runtime and validators.

Recommended split:
1. README/tutorial refresh for command model clarity, decision guide, and runbook ordering.
2. Dedicated compatibility + migration docs with explicit support-level contract and rollout/rollback instructions.

## Standard Stack

### Core
| Artifact | Purpose | Why Standard |
|----------|---------|--------------|
| `README.md` | Primary operator entrypoint and command reference | Already used for all validation gates and install guidance |
| `tutorial.md` | Step-by-step onboarding and workflow learning path | Existing learning surface; best place for usage flow examples |
| `docs/architecture/assistant-capability-matrix.md` | Contract-level capability reference | Already designated as capability source documentation |

### Supporting
| Artifact | Purpose | When to Use |
|----------|---------|-------------|
| New migration doc (`docs/migration/*`) | Claude-first to multi-assistant adoption and rollback guide | Detailed upgrade path and setup differences |
| New compatibility doc (`docs/compatibility/*`) | Support-level matrix and command mapping reference | Explicitly communicate Full vs Scaffold boundaries |
| Validation scripts (`scripts/verify_*.js`) | Objective command contract for runbook steps | Drive maintainers toward deterministic release checks |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dedicated docs pages | README-only expansion | Becomes too long; migration + matrix details harder to maintain |
| Support prose only | Explicit matrix levels | Prose invites ambiguity and parity overclaims |
| Unordered validation list | Ordered runbook | Harder incident triage and release repeatability |

## Architecture Patterns

### Pattern 1: Runtime-Aligned Documentation
**What:** Doc claims must map directly to current runtime contracts and validator behavior.
**When to use:** Capability and migration sections where drift causes operator confusion.

### Pattern 2: Support-Level Taxonomy
**What:** `Full`, `Scaffold`, `Unsupported` labels used consistently across README + docs pages.
**When to use:** Any provider capability statement.

### Pattern 3: Layered Documentation Depth
**What:** Quick decisions in README; deep procedures in dedicated docs pages.
**When to use:** Migration and validation workflows that need clarity without bloating the landing page.

### Anti-Patterns to Avoid
- Describing scaffold providers as parity-complete.
- Listing alias syntax as native Codex command surface.
- Mixing operator quick checks with maintainer release gates without clear separation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Compatibility definitions | New ad-hoc terminology | `Full/Scaffold/Unsupported` labels from Phase 8 context | Maintains consistent claims |
| Validation guidance | New script wrappers | Existing `scripts/verify_*.js` commands | No extra maintenance or behavior drift |
| Migration state logic | New migration tooling | Documentation checklist + existing config/runtime behavior | Phase is docs-only, not runtime changes |

## Common Pitfalls

### Pitfall 1: Prefix policy drift in docs
**What goes wrong:** Users try unsupported native command formats due to stale tables.
**How to avoid:** Cross-check command prefixes against `scripts/adapters/capability-matrix.js` and router behavior.

### Pitfall 2: Support-level overclaims
**What goes wrong:** Scaffold providers are treated as production parity.
**How to avoid:** Prominent support legend and explicit scaffold limitations/remediation notes.

### Pitfall 3: Migration path missing rollback
**What goes wrong:** Teams fear enabling optional Codex/alias modes.
**How to avoid:** Include exact rollback steps (disable optional flags, keep Claude-native commands unchanged).

## Sources

### Primary (HIGH confidence)
- `.planning/phases/08-docs-and-migration-guide/08-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `README.md`
- `tutorial.md`
- `scripts/adapters/capability-matrix.js`
- `scripts/adapters/command-router.js`

### Secondary (MEDIUM confidence)
- `docs/architecture/assistant-capability-matrix.md`
- `scripts/verify_adapter_parity.js`
- `scripts/verify_command_flow_smoke.js`
- `scripts/verify_scaffold_conformance.js`

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Documentation scope and required artifacts: HIGH
- Runtime-policy alignment needs: HIGH
- Validation runbook ordering: HIGH

**Research date:** 2026-03-04
**Valid until:** 2026-04-04
