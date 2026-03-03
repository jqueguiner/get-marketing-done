# Stack Research

## Recommended Cross-Assistant Strategy
Use a shared core workflow engine with thin assistant adapters instead of duplicating workflow logic per assistant.

## Current Baseline Stack (Validated)
- Node.js CLI and install/hook layer
- Python workflow execution scripts
- SQLite + CSV + Markdown for local-first state
- Command-skill driven orchestration

## Target Stack Additions for This Milestone
- Adapter interface for assistant command registration and invocation conventions
- Provider capability map (tools available, hook model, approval model, state bridge model)
- Compatibility test harness for command-level parity checks across adapters

## Why This Stack
- Preserves working backend scripts and data model
- Limits migration risk to orchestration boundaries
- Makes future provider support additive rather than rewrite-heavy

## Avoid
- Provider-specific branching spread across business logic scripts
- Hard-coding command syntax directly into core workflow logic
