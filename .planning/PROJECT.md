# Get Marketing Done

## What This Is
Get Marketing Done is a GTM automation system that runs inside coding-assistant environments and drives the full outbound pipeline from company context through campaign results. It combines command skills, local scripts, and persistent campaign memory so each campaign improves the next one instead of restarting from zero. This milestone extends the existing Claude-first implementation into a multi-assistant architecture that also works cleanly with Codex-style workflows and compatible agent ecosystems.

## Core Value
Teams can run repeatable outbound campaigns with cumulative context and quality gates, regardless of which supported coding assistant they use.

## Requirements

### Validated

- ✓ Installable GTM command system with guided pipeline steps — existing
- ✓ Persistent campaign state and data storage using SQLite + Markdown — existing
- ✓ Structured workflows for list building, enrichment, segmentation, and email generation — existing
- ✓ Manual verification gates before send actions — existing
- ✓ Dashboard/reporting and session continuity hooks — existing

### Active

- [ ] Add cross-assistant compatibility layer so core workflows run in Codex-style environments without Claude-specific assumptions
- [ ] Keep feature parity for existing GTM pipeline commands while adapting execution semantics
- [ ] Support adapter patterns for Gemini/OpenCode/Mistral-style workflows where feasible without forking business logic
- [ ] Harden configuration and integration boundaries so provider-specific tokens and permissions remain isolated
- [ ] Preserve campaign memory and traceability during migration/adaptation work

### Out of Scope

- Native hosted SaaS product with remote multi-tenant backend — local-first architecture remains
- Fully autonomous campaign sending without human review — violates quality/safety model
- Rebuilding all workflow logic from scratch per assistant — adapt through shared abstractions

## Context
The repository is a brownfield project with Node installer/hooks and Python operational scripts. Existing commands and data models are implemented and actively used. Current architecture is Claude-first in command naming and hook integration, with portable script backends already present. The immediate work is architectural adaptation and compatibility hardening, not greenfield feature invention.

## Constraints

- **Compatibility**: Existing Claude command behavior must keep working — current users cannot be broken
- **Architecture**: Preserve local-first storage (`SQLite + CSV + Markdown`) — avoids platform lock-in
- **Execution model**: Maintain manual verify gates before send — safeguards outreach quality
- **Scope control**: Reuse current scripts and schemas where possible — avoid duplicate implementations per assistant
- **Delivery**: Changes should be incrementally shippable via phased roadmap — minimize migration risk

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Treat this as brownfield adaptation, not rewrite | Existing pipeline capabilities are already validated | — Pending |
| Prioritize assistant-agnostic orchestration boundary | Enables Codex/Gemini/OpenCode/Mistral support with shared core logic | — Pending |
| Keep manual verification as non-negotiable quality gate | Prevents unsafe/low-quality automated outreach | ✓ Good |

---
*Last updated: 2026-03-03 after initialization*
