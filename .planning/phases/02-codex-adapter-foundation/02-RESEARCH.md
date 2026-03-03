# Phase 2: Codex Adapter Foundation - Research

**Researched:** 2026-03-03
**Domain:** Codex-native command adapter implementation and end-to-end runtime wiring
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Codex-native command format is `$gmd-*` only.
- `gmd:<action>` is not a Codex-native command format in this phase.
- Canonical alias syntax remains `gmd:<action>` for optional alias routing, but not as native Codex invocation.
- If a Codex `$gmd-*` command is unmapped, the router must hard fail with a clear error.
- No fallback to alias resolution for unmapped native Codex commands.
- No compatibility shim table in this phase.
- Phase 2 must include full wiring: CLI ingress + installer integration + skill registration path updates.
- Completion requires a full command sweep for exposed `$gmd-*` commands.

### Claude's Discretion
- Exact command inventory and grouping for full-sweep validation execution.
- Error payload shape for unmapped command hard-fail responses.
- Internal file layout details for Codex skill registration bridge.

### Deferred Ideas (OUT OF SCOPE)
- Cross-provider command harmonization strategy beyond Codex (handled in later phases).
- Alias UX refinements and compatibility heuristics (deferred due to strict fail policy in this phase).
- Formal parity contract with Claude outputs (primarily Phase 3 and Phase 6 concerns).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ADPT-01 | Operator can run the same canonical workflow actions through a Codex-compatible command adapter | Define strict Codex command map, runtime wiring points, and command sweep validation approach |
</phase_requirements>

## Summary

Phase 2 should operationalize the Codex adapter as the first production-grade consumer of Phase 1 contracts. The repository already has adapter primitives (`command-router`, provider maps, capability matrix) and ingress routing in `scripts/marketing-tools.js`; this phase extends that implementation from partial support to strict Codex-native coverage with full install/runtime/skill wiring.

The locked command decision means Codex-native parsing must accept only `$gmd-*` tokens and hard-fail otherwise when evaluated in native mode. Alias syntax (`gmd:<action>`) remains an optional canonical path but is explicitly not part of Codex-native command surface in this phase.

**Primary recommendation:** split work into two plans: (1) strict Codex parser/translator and provider map hardening, (2) full wiring + exhaustive command sweep automation and docs parity updates.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js + CommonJS | Existing | Adapter routing, installer, command registration | Existing codebase command/runtime surface |
| Existing adapter modules | Existing | Route native commands to canonical actions | Built in Phase 1; reuse without business logic duplication |
| JSON outputs | Existing | Hard-fail diagnostics and sweep reports | Current CLI/tooling response convention |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `bin/install.js` | Existing | Install-time command/skill wiring | For Codex integration expansion |
| `skills/*/SKILL.md` | Existing | Skill registration inventory | For full `$gmd-*` command surface mapping |
| `scripts/marketing-tools.js` | Existing | Runtime ingress | Codex adapter dispatch and validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Strict `$gmd-*` native parser | Accept mixed native + alias native forms | Violates locked command-surface decision and weakens validation |
| Hard-fail unmapped codex native commands | Alias fallback | Violates locked routing behavior and hides mapping gaps |

## Architecture Patterns

### Pattern 1: Native Parser Gate Before Canonical Translation
**What:** Validate Codex-native command shape first, then translate.
**When to use:** All Codex-native command ingress paths.

### Pattern 2: Provider Isolation Boundary
**What:** Keep Codex-specific parsing/mapping in provider adapter modules.
**When to use:** Any command syntax or adapter behavior unique to Codex.

### Pattern 3: Full-Surface Validation Harness
**What:** Enumerate all exposed `$gmd-*` commands and run routed execution checks.
**When to use:** Phase-exit verification for ADPT-01.

### Anti-Patterns to Avoid
- Parsing `$gmd-*` and `gmd:*` as equivalent native codex forms.
- Implicit fallback that masks missing codex map entries.
- Modifying Python business scripts for adapter concerns.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Duplicate command mapping logic in many files | Per-file conditional mapping | Central Codex provider map + router helpers | Single source of truth |
| Ad-hoc validation for command sweep | Manual spot checks only | Scripted command inventory + automated sweep execution | Deterministic phase exit signal |
| Installer special-casing in many branches | Inline one-off logic | Existing install manifest/update flows in `bin/install.js` | Maintains update consistency |

## Common Pitfalls

### Pitfall 1: Native Surface Drift
**What goes wrong:** Codex provider map and documented commands diverge.
**How to avoid:** Generate sweep input from command map source and compare against docs/skills.

### Pitfall 2: Hidden Fallback Behavior
**What goes wrong:** Unmapped native commands appear to work via alias paths.
**How to avoid:** Explicitly disable alias fallback for native Codex route mode and add tests.

### Pitfall 3: Wiring Incompleteness
**What goes wrong:** Runtime works but installer/skill registration misses commands.
**How to avoid:** Include installer + skill registration updates and validate installed output paths.

## Code Examples

### Strict Codex Native Check
```javascript
function isCodexNative(command) {
  return typeof command === 'string' && command.startsWith('$gmd-');
}
```

### Native Hard-Fail Contract
```javascript
if (provider === 'codex' && isCodexNative(command) && !mappedAction) {
  throw new Error(`Unknown codex native command: ${command}`);
}
```

## Sources

### Primary (HIGH confidence)
- `.planning/phases/02-codex-adapter-foundation/02-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `scripts/adapters/command-router.js`
- `scripts/adapters/providers/codex.js`
- `scripts/marketing-tools.js`
- `bin/install.js`

### Secondary (MEDIUM confidence)
- `.planning/codebase/CONVENTIONS.md`
- `.planning/codebase/STRUCTURE.md`

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Command-surface constraints: HIGH - directly from locked context decisions
- Architecture and wiring approach: HIGH - grounded in current repository structure
- Pitfalls: HIGH - derived from current adapter transition risks

**Research date:** 2026-03-03
**Valid until:** 2026-04-03
