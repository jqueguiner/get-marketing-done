# Phase 7: Additional Adapter Scaffolds - Research

**Researched:** 2026-03-03
**Domain:** Contract-compliant Gemini/OpenCode/Mistral scaffold adapters with explicit capability-gap signaling
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Scaffold providers use minimal command maps in this phase.
- Unknown native scaffold commands hard-fail.
- Alias remains opt-in and disabled by default.
- Capability gaps are centralized in capability matrix and machine-enforced.
- Unsupported paths must emit structured diagnostics (`code`, capability key, remediation).
- Scaffold providers must be config-gated for activation.
- Shared runtime behavior cannot change to support scaffolds.
- Conformance must validate registration + expected-failure behavior.

### Claude's Discretion
- Exact scaffold command subset.
- Config key naming for scaffold activation.
- Validator script boundaries and naming.

### Deferred Ideas (OUT OF SCOPE)
- Full command parity for scaffold providers.
- CI matrix expansion for scaffolds.
- End-user docs/migration polish (Phase 8).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ADPT-04/05/06 readiness | Scaffold providers for Gemini/OpenCode/Mistral exist and conform to shared contracts | Add provider modules, config gating, and scaffold conformance validator with expected-failure checks |
</phase_requirements>

## Summary

Phase 7 should wire scaffold providers as first-class registry entries without claiming runtime feature parity. The existing code already contains capability matrix entries for `gemini`, `opencode`, and `mistral`, but router provider registry and provider modules currently only support Claude/Codex. The clean approach is to add minimal provider modules, gate activation through config, and produce a scaffold-specific conformance validator that ensures routing works and unsupported capability paths fail with structured diagnostics.

Recommended split:
1. Add scaffold provider modules + router/config/installer registration hooks under explicit activation gates.
2. Add scaffold conformance validator and verification/docs evidence for readiness signals.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js + CommonJS | Existing | Adapter modules, router, and validators | Existing architecture |
| `scripts/adapters/*` | Existing | Canonical action + routing contracts | Single adapter authority boundary |
| `bin/install.js` | Existing | Command registration conversion hooks | Non-invasive scaffold onboarding |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `scripts/verify_adapter_parity.js` | Existing | Reusable sectioned validator patterns | Scaffold conformance mode/filter integration |
| `scripts/verify_command_flow_smoke.js` | Existing | Expected-failure and requirement-tagged check patterns | Scaffold diagnostics tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Config-gated scaffold activation | Always-on provider registration | Unexpected behavior shifts for existing operator flows |
| Minimal command maps | Full maps now | Implies parity guarantees not yet delivered |
| Machine-enforced gap diagnostics | Docs-only gap notes | Non-testable readiness claims |

## Architecture Patterns

### Pattern 1: Dormant-By-Default Scaffolds
**What:** Provider modules exist and register, but only activate when explicit config allows.
**When to use:** Initial readiness scaffolds to avoid changing default runtime behavior.

### Pattern 2: Structured Unsupported Capability Errors
**What:** Unsupported scaffold paths emit deterministic error contract (`code`, `capability`, `remediation`).
**When to use:** Any scaffold feature not fully implemented in this phase.

### Pattern 3: Conformance-Only Validator
**What:** Validator asserts command registration, route validity, and expected structured failures.
**When to use:** Phase 7 completion gate.

### Anti-Patterns to Avoid
- Advertising scaffold providers as parity-complete.
- Allowing scaffold providers to silently fallback to unrelated provider behavior.
- Coupling scaffold-specific logic into shared business workflow runtime.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| New command contract model | Provider-local bespoke action names | Existing canonical-actions contract | Keeps cross-provider compatibility |
| Free-text unsupported errors | Generic strings only | Structured machine-readable diagnostics | Validator-friendly and operator actionable |
| Separate validator framework | New infra stack | Existing Node script validator pattern | Fast, consistent with prior phases |

## Common Pitfalls

### Pitfall 1: Scaffold provider accidentally active by default
**What goes wrong:** Existing environments change behavior without explicit opt-in.
**How to avoid:** Gate activation via config and default deny for scaffold providers.

### Pitfall 2: Router silently normalizes unsupported providers to default provider
**What goes wrong:** False-positive “working” scaffold commands.
**How to avoid:** Add explicit scaffold provider detection + structured unsupported diagnostics when inactive.

### Pitfall 3: Conformance checks validate only module loading
**What goes wrong:** Broken route/diagnostic behavior passes phase gate.
**How to avoid:** Include route and expected structured-failure assertions in validator.

## Code Examples

### Structured unsupported diagnostic contract
```javascript
{ code: 'SCAFFOLD_CAPABILITY_UNSUPPORTED', capability: 'hooks', remediation: 'Enable provider-specific implementation or use supported provider' }
```

### Scaffold section check payload
```javascript
{ provider: 'gemini', status: 'passed', checks: [{ check: 'route.native_command', pass: true }] }
```

## Sources

### Primary (HIGH confidence)
- `.planning/phases/07-additional-adapter-scaffolds/07-CONTEXT.md`
- `.planning/ROADMAP.md`
- `scripts/adapters/capability-matrix.js`
- `scripts/adapters/command-router.js`
- `scripts/adapters/canonical-actions.js`
- `bin/install.js`

### Secondary (MEDIUM confidence)
- `scripts/verify_adapter_parity.js`
- `scripts/verify_command_flow_smoke.js`
- `README.md`

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Scaffold integration direction: HIGH
- Activation/gap-diagnostic model: HIGH
- Conformance validation approach: HIGH

**Research date:** 2026-03-03
**Valid until:** 2026-04-03
