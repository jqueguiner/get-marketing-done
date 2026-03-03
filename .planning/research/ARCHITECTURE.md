# Architecture Research

## Proposed Component Boundaries
- Core workflow layer: phase/state transitions and command business rules
- Adapter layer: assistant command syntax, tool-call semantics, and hook integration
- Data layer: SQLite/CSV/Markdown contracts (unchanged)
- Integration layer: HubSpot/Instantly/Extruct and external IO (unchanged)

## Data Flow
1. User invokes assistant-specific command
2. Adapter translates invocation to canonical workflow action
3. Core workflow executes shared logic
4. Results persist to shared data/state artifacts
5. Adapter renders assistant-native responses and next-step routing

## Build Order
1. Define canonical command/action contracts
2. Implement Codex adapter first
3. Refactor Claude adapter to same interface (proves abstraction)
4. Add Gemini/OpenCode/Mistral-compatible adapters incrementally
5. Add parity checks and docs for support matrix
