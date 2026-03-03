# Phase 5: Verification Gate Consistency - Research

**Researched:** 2026-03-03
**Domain:** Uniform manual verification and send-safety gate enforcement across adapters
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Gate authority is a shared runtime policy object in `scripts/marketing-tools.js` backed by `config.json` `quality_gates`.
- Claude and Codex gate behavior must be identical.
- Gate policy evaluates at command execution time for every gated action.
- Policy storage remains in `config.json` with backward-compatible defaults.

### Claude's Discretion
- Internal gate-evaluation helper API shape.
- Exact gated action inventory.
- Blocked-response remediation payload field naming.

### Deferred Ideas (OUT OF SCOPE)
- Full parity harness matrix assertions (Phase 6).
- Additional adapter-specific scaffold nuances (Phase 7).
- Extended migration docs (Phase 8).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SAFE-02 | Operator can execute manual verification gates before send actions in every supported adapter | Define centralized gate evaluator, blocked response contract, and adapter-uniform validation flow |
</phase_requirements>

## Summary

Phase 5 should close the gap between documented quality-gate policy and runtime enforcement. Current code exposes quality gate defaults in `configEnsure()` and documents manual verify flow in `skills/run-instantly/SKILL.md`, but send-adjacent command execution in shared runtime is not centrally gate-enforced yet.

Recommended split:
1. Centralize gate policy evaluation in shared runtime before send-adjacent actions.
2. Add adapter-uniform gate compliance validator and phase verification evidence.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js + CommonJS | Existing | Shared runtime and adapter command handling | Existing execution surface |
| `scripts/marketing-tools.js` | Existing | Command dispatch and config-backed policy defaults | Single runtime authority point |
| `config.json` `quality_gates` | Existing | Policy persistence and overrides | Locked storage model |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `scripts/adapters/command-router.js` | Existing | Provider normalization and consistent ingress | Adapter-uniform enforcement |
| `skills/run-instantly/SKILL.md` | Existing | UX-level gate checklist guidance | Keep aligned with runtime blocking behavior |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Runtime-central gate checks | Skill-only checks | Inconsistent enforcement and adapter drift risk |
| Config-backed policy | Hardcoded gate values | Removes operator control and violates locked model |
| Per-command runtime checks | Session-level check cache | Can miss state drift between actions |

## Architecture Patterns

### Pattern 1: Shared Gate Evaluator
**What:** A runtime helper evaluates gate readiness for target action + current state/config.
**When to use:** Any send-adjacent command path (`outreach.prepare`, `outreach.upload`, related canonical mappings).

### Pattern 2: Uniform Blocked Response Contract
**What:** Consistent JSON block payload with code, failed gates, and remediation steps.
**When to use:** Gate failures across Claude and Codex.

### Pattern 3: Adapter-Uniform Gate Validator
**What:** Script executes equivalent blocked/allowed scenarios under both providers.
**When to use:** Phase exit for SAFE-02.

### Anti-Patterns to Avoid
- Enforcing gates only in skills and not runtime.
- Different blocked payload shapes by provider.
- Gate bypasses hidden behind provider-specific branches.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Duplicate gate logic | Per-command ad hoc checks | Shared `evaluateQualityGates` helper | Prevents drift |
| Free-text gate failures | Manual strings only | Structured JSON with stable fields | Machine-readable remediation |
| Adapter-divergent tests | One-provider checks only | Cross-provider validator script | Ensures uniform behavior |

## Common Pitfalls

### Pitfall 1: Policy/readiness mismatch
**What goes wrong:** `quality_gates` config exists but runtime ignores it for some actions.
**How to avoid:** Route all gated actions through one evaluator.

### Pitfall 2: Partial enforcement
**What goes wrong:** `prepare` blocked but `upload` bypasses gate (or vice versa).
**How to avoid:** Define explicit gated action inventory and validate all entries.

### Pitfall 3: Unactionable failure output
**What goes wrong:** User sees blocked state with no clear next steps.
**How to avoid:** Include remediation checklist and suggested command(s) in blocked response payload.

## Code Examples

### Blocked response contract shape
```javascript
{ code: 'QUALITY_GATE_BLOCKED', failed_gates: ['manual_verify_before_send'], remediation: ['run verify <campaign>'] }
```

### Gate evaluator call shape
```javascript
evaluateQualityGates({ action: 'outreach.upload', campaign, config, state })
```

## Sources

### Primary (HIGH confidence)
- `.planning/phases/05-verification-gate-consistency/05-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `scripts/marketing-tools.js`
- `config.json`
- `skills/run-instantly/SKILL.md`

### Secondary (MEDIUM confidence)
- `scripts/adapters/command-router.js`
- `.planning/phases/04-cross-adapter-state-continuity/04-VERIFICATION.md`

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Gate authority and enforcement decisions: HIGH (locked in context)
- Integration approach: HIGH (matches existing runtime architecture)
- Validation strategy: HIGH (aligned with existing phase gate script patterns)

**Research date:** 2026-03-03
**Valid until:** 2026-04-03
