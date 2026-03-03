# Pitfalls Research

## Pitfall 1: Adapter Leakage into Core Logic
- Warning signs: `if provider == ...` appearing in business scripts
- Prevention: strict adapter interface and contract tests
- Address in: Phase 1-2

## Pitfall 2: Command Parity Drift
- Warning signs: same command produces different state transitions by assistant
- Prevention: parity test cases over canonical actions and expected outputs
- Address in: Phase 3-4

## Pitfall 3: State Incompatibility
- Warning signs: resume/progress commands break after switching assistant
- Prevention: preserve storage schemas and normalize adapter metadata
- Address in: Phase 2-4

## Pitfall 4: Over-expanding Initial Scope
- Warning signs: attempting perfect support for all providers in one phase
- Prevention: Codex-first rollout, then incremental provider adapters
- Address in: Phase 1 and roadmap governance
