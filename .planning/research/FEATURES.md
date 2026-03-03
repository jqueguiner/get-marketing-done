# Feature Research

## Table Stakes
- End-to-end GTM workflow continuity across sessions
- Command discoverability and consistent stage progression
- Campaign state persistence and resumability
- Quality gates before outbound send actions

## Differentiators
- Cross-assistant compatibility with a shared execution core
- Adapter abstraction that keeps provider-specific behavior isolated
- Consistent data contracts regardless of assistant frontend

## Anti-Features
- Silent behavior drift between assistant variants
- Provider-specific rewrites of existing script logic
- Removing manual verification checkpoints for speed

## Complexity Notes
- Command mapping differences are medium complexity
- Hook/status integration varies by assistant and is high-risk
- Workflow parity validation across providers requires explicit tests
