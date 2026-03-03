# Phase 1: Canonical Contracts - Research

**Researched:** 2026-03-03
**Domain:** Multi-assistant orchestration contracts for local-first GTM workflows
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Keep provider-native command surfaces per assistant.
- Add canonical aliases in addition to native commands.
- Canonical alias syntax: `gmd:<action>`.
- Aliases are opt-in via config and documented (not always-on by default).
- On naming conflicts, native command behavior wins; alias path warns and suggests alternative naming.

### Claude's Discretion
- Exact configuration key names for alias enablement.
- Warning message wording and conflict-resolution UX details.
- Internal mapping file layout for native-to-canonical command routing.

### Deferred Ideas (OUT OF SCOPE)
- Exact canonical action field schema strictness (coarse vs atomic granularity) — discuss in planning/research.
- Capability matrix enforcement mode (hard fail vs graceful degrade policy details) — discuss in planning/research.
- Formal parity definition (output parity vs state-transition parity) — addressed in later parity-focused phases.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADPT-03 | Maintainer can define assistant capability metadata in one support matrix used by adapters | Define capability schema, matrix file format, and loader used by all adapters |
| SAFE-01 | Maintainer can keep provider-specific auth/config isolated from core workflow logic | Keep provider auth in adapter modules/config; core contract layer only handles canonical actions/capabilities |
</phase_requirements>

## Summary

Phase 1 should produce a single canonical action contract plus a capability matrix that adapters consume before invoking workflow logic. The current codebase already separates business workflows (Python scripts + state model) from command entrypoints (Node installer/hooks/skills), so the highest-leverage approach is adding a lightweight adapter-contract layer in Node and routing existing command invocations through it.

The contract should model stable workflow intents (for example: `campaign.progress`, `work.pause`, `work.resume`, `outreach.prepare`) rather than assistant command strings. Assistant-specific commands (`/gmd:*`, `$gsd-*`, future variants) become adapter concerns mapped into this canonical action vocabulary.

**Primary recommendation:** Introduce canonical action and capability schemas in dedicated adapter modules, then refactor entrypoints to translate native commands into canonical actions while preserving current behavior.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js runtime | >=18 | Adapter contract and command translation layer | Already the command wiring/runtime surface in this repo |
| CommonJS modules | Existing convention | Contract/capability modules | Matches installer/hooks/tooling style in repository |
| JSON config files | Existing convention | Alias enablement and capability declarations | Already used for workflow/quality settings |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Python scripts in `scripts/` | Existing | Core workflow execution remains unchanged | Keep adapter changes out of business logic scripts |
| SQLite + Markdown state | Existing | Canonical actions operate on unchanged state model | Required to preserve backward compatibility |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node adapter contract modules | Rewrite Python scripts per assistant | High parity and maintenance risk |
| Canonical action vocabulary | Assistant-specific branching in every command handler | Faster short-term, long-term coupling and drift |

## Architecture Patterns

### Recommended Project Structure
```
scripts/
├── adapters/
│   ├── canonical-actions.js       # canonical action schema + validation
│   ├── capability-matrix.js       # provider capability model + lookup
│   ├── command-router.js          # native command -> canonical action
│   └── providers/
│       ├── claude.js              # native command map + provider metadata
│       └── codex.js               # native command map + provider metadata
└── marketing-tools.js             # consumes canonical actions
```

### Pattern 1: Native-to-Canonical Translation Boundary
**What:** Translate provider-native commands once at ingress, then execute canonical action handlers.
**When to use:** Every assistant command entrypoint.
**Example:**
```javascript
const canonical = routeNativeCommand({ provider: 'claude', command: '/gmd:campaign-progress' });
// => { action: 'campaign.progress', params: {} }
```

### Pattern 2: Capability-Gated Dispatch
**What:** Evaluate provider capability matrix before action execution.
**When to use:** Actions that depend on provider-only behavior (hooks, interactive approvals, etc.).
**Example:**
```javascript
if (!capabilities.supports.inlineOptions) {
  return fallbackPlainText(actionPayload);
}
```

### Anti-Patterns to Avoid
- Hard-coded provider checks inside core business scripts (`if provider === ...` in workflow logic).
- Storing provider secrets/credentials in canonical action payloads.
- Alias handling that mutates existing native command behavior by default.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-assistant command logic in every workflow | Repeated conditionals across scripts | Central router + provider map modules | Prevents drift and duplicated fixes |
| Provider feature detection ad hoc | Inline boolean checks everywhere | Shared capability matrix loader | Single source of truth for supported behavior |
| Action schema in prose only | Unstructured docs without code contract | Canonical action constants + validation helpers | Keeps planner/executor behavior deterministic |

**Key insight:** The contract layer should be intentionally small and explicit. Complexity should stay in provider adapters, not in core workflows.

## Common Pitfalls

### Pitfall 1: Contract Too Granular Too Early
**What goes wrong:** Dozens of fine-grained actions create mapping churn before behavior stabilizes.
**Why it happens:** Trying to solve future parity edge cases in Phase 1.
**How to avoid:** Start with stable workflow intent actions aligned to current commands.
**Warning signs:** Frequent action renames and backward-compatibility shims in early commits.

### Pitfall 2: Provider Secrets Leak into Core
**What goes wrong:** Core contract payloads start carrying provider auth/config details.
**Why it happens:** Shortcutting adapter boundaries during refactor.
**How to avoid:** Keep auth/config loading in provider modules; pass normalized, non-secret execution context to core.
**Warning signs:** Core modules reading provider-specific keys directly from config.

### Pitfall 3: Alias Surprises Existing Users
**What goes wrong:** Alias behavior changes native command expectations.
**Why it happens:** Enabling aliases by default or giving aliases precedence.
**How to avoid:** Opt-in alias mode and native-precedence conflict policy (locked decision).
**Warning signs:** Existing command examples stop working unchanged.

## Code Examples

### Canonical Action Declaration
```javascript
const ACTIONS = Object.freeze({
  CAMPAIGN_PROGRESS: 'campaign.progress',
  CAMPAIGN_VERIFY: 'campaign.verify',
  WORK_PAUSE: 'work.pause',
  WORK_RESUME: 'work.resume',
  OUTREACH_PREPARE: 'outreach.prepare'
});
```

### Provider Matrix Shape
```javascript
const capabilityMatrix = {
  claude: { supports: { inlineOptions: true, hooks: true, statusline: true } },
  codex: { supports: { inlineOptions: true, hooks: false, statusline: false } }
};
```

## Sources

### Primary (HIGH confidence)
- Internal codebase: `bin/install.js`, `scripts/marketing-tools.js`, `hooks/*.js`, `.planning/codebase/*.md`
- Phase context and requirements:
  - `.planning/phases/01-canonical-contracts/01-CONTEXT.md`
  - `.planning/REQUIREMENTS.md`
  - `.planning/ROADMAP.md`

### Secondary (MEDIUM confidence)
- None needed for this phase because decisions are architecture-bound to the existing codebase and user constraints.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - based on existing repository implementation
- Architecture: HIGH - derived from current code boundaries and locked decisions
- Pitfalls: HIGH - consistent with identified concerns and prior context docs

**Research date:** 2026-03-03
**Valid until:** 2026-04-03
