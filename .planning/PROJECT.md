# Get Marketing Done

## What This Is
Get Marketing Done is a GTM automation system that runs inside coding-assistant environments and drives the full outbound pipeline from company context through campaign results. It combines command skills, local scripts, and persistent campaign memory so each campaign improves the next one instead of restarting from zero.

## Core Value
Teams can run repeatable outbound campaigns with cumulative context and quality gates, regardless of which supported coding assistant they use.

## Current Milestone: v1.1 HubSpot Campaign Launch Integrity

**Goal:** Ship production-safe HubSpot campaign execution with hard, non-bypass copy approval gates.

**Target features:**
- HubSpot-native campaign command surface (create/sync/preflight/launch/results)
- Mandatory copy approval artifacts and invalidation-on-edit behavior
- Shared launch gate policy that blocks publish without approvals and preflight readiness
- Deterministic verification scripts for launch and approval contracts
- Results ingestion/reporting updates for HubSpot campaign outcomes

## Requirements

### Validated (v1.0 complete)
- Multi-assistant compatibility foundation (Claude/Codex parity + scaffolds)
- Cross-adapter state continuity and safety gates
- Parity and flow validation harnesses
- Compatibility/migration documentation

### Active (v1.1)
- [ ] Add HubSpot campaign lifecycle commands with reliable sync/launch semantics
- [ ] Enforce non-bypass human copy approval before any launch-adjacent action
- [ ] Keep launch safety policy centralized in shared runtime (no provider-specific bypass)
- [ ] Add deterministic validators for approval and launch-gate contracts
- [ ] Preserve existing local-first schemas while adding HubSpot campaign artifacts

### Out of Scope (v1.1)
- Fully autonomous sending without human approval
- Full ABM orchestration (addressed in future milestone)
- Social/video generation engine (future milestone)
- Competitor scanner and announcement intelligence (future milestone)

## Context
The repository is a brownfield Node/Python project with local-first data and existing GTM command workflows. v1.0 completed assistant adaptation. v1.1 now focuses on operational campaign execution integrity through HubSpot and mandatory copy verification.

## Constraints

- **Safety:** Launch/publish must remain human-gated and auditable
- **Compatibility:** Existing command flows must remain stable while adding new HubSpot commands
- **Architecture:** Reuse shared runtime policy and validator patterns from prior phases
- **Data:** Maintain backward compatibility for local data artifacts
- **Delivery:** Build incrementally through phase-based execution (09+)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| HubSpot launch capability is first next milestone | Highest immediate operator value after multi-assistant foundation | ✓ Locked |
| Copy approval is a hard gate, not advisory | Prevents unsafe/unchecked outreach | ✓ Locked |
| Launch policy remains centralized in shared runtime | Avoids adapter-specific bypass drift | ✓ Locked |

---
*Last updated: 2026-03-04 after milestone v1.1 initialization*
