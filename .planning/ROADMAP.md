# Roadmap: Get Marketing Done Multi-Assistant Adaptation

## Overview

This milestone adapts the existing Claude-first GTM automation system into an assistant-agnostic architecture while preserving current behavior and data continuity. Work is sequenced to establish contracts first, ship Codex compatibility early, lock parity with Claude, then harden cross-adapter state, quality gates, and documentation.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Canonical Contracts** - Define canonical workflow actions, adapter interfaces, and provider capability matrix (completed 2026-03-03)
- [x] **Phase 2: Codex Adapter Foundation** - Implement Codex-oriented adapter wiring for canonical actions (completed 2026-03-03)
- [x] **Phase 3: Claude Adapter Parity Refactor** - Refactor existing Claude integration onto shared adapter interface without regressions (completed 2026-03-03)
- [x] **Phase 4: Cross-Adapter State Continuity** - Ensure pause/resume/progress behavior and persisted state compatibility across adapters (completed 2026-03-03)
- [x] **Phase 5: Verification Gate Consistency** - Enforce manual verification and safety gates uniformly for every adapter (completed 2026-03-03)
- [x] **Phase 6: Parity Test Harness** - Add compatibility checks for key command/state/output paths (completed 2026-03-03)
- [ ] **Phase 7: Additional Adapter Scaffolds** - Add Gemini/OpenCode/Mistral-compatible scaffolds against shared contracts
- [ ] **Phase 8: Docs and Migration Guide** - Publish compatibility matrix, setup docs, and migration notes

## Phase Details

### Phase 1: Canonical Contracts
**Goal**: Establish a provider-agnostic command/action contract that adapters implement consistently
**Depends on**: Nothing (first phase)
**Requirements**: ADPT-03, SAFE-01
**Success Criteria** (what must be TRUE):
  1. Canonical workflow action schema is documented and referenced by all adapters
  2. Provider capability matrix defines supported tools, hook semantics, and constraints per assistant
  3. Core workflow logic no longer requires assistant-specific branches for action dispatch
**Plans:** 2/2 plans complete

Plans:
- [x] 01-01-PLAN.md -- Define action contracts, adapter interface, and capability matrix artifacts
- [x] 01-02-PLAN.md -- Refactor core orchestration entry points to consume canonical actions

### Phase 2: Codex Adapter Foundation
**Goal**: Ship Codex-compatible command routing and workflow invocation over canonical actions
**Depends on**: Phase 1
**Requirements**: ADPT-01
**Success Criteria** (what must be TRUE):
  1. A Codex adapter maps command invocations to canonical workflow actions
  2. Core GTM stage commands execute end-to-end through the Codex adapter
  3. Adapter-specific behavior is isolated to adapter layer files
**Plans:** 2/2 plans complete

Plans:
- [x] 02-01-PLAN.md -- Implement Codex adapter command parser and action translator
- [x] 02-02-PLAN.md -- Wire adapter into install/runtime paths and validate baseline workflows

### Phase 3: Claude Adapter Parity Refactor
**Goal**: Move Claude integration onto the same adapter contract while preserving existing command behavior
**Depends on**: Phase 2
**Requirements**: ADPT-02, CMD-03
**Success Criteria** (what must be TRUE):
  1. Existing Claude command set works via adapter interface without breaking behavior
  2. Campaign progress and verify outputs remain equivalent pre/post refactor
  3. No Claude-specific orchestration assumptions remain in shared core logic
**Plans:** 2/2 plans complete

Plans:
- [x] 03-01-PLAN.md -- Refactor Claude command wiring to adapter contract
- [x] 03-02-PLAN.md -- Regression-check progress and verification flows

### Phase 4: Cross-Adapter State Continuity
**Goal**: Guarantee pause/resume/progress continuity across adapters with unchanged data schemas
**Depends on**: Phase 3
**Requirements**: CMD-02, SAFE-03
**Success Criteria** (what must be TRUE):
  1. Pause in one adapter can resume correctly from another adapter
  2. STATE/DB artifacts remain backward compatible
  3. Progress state transitions are consistent across adapters
**Plans:** 2/2 plans complete

Plans:
- [x] 04-01-PLAN.md -- Normalize adapter metadata and state bridge fields
- [x] 04-02-PLAN.md -- Validate cross-adapter resume/progress scenarios

### Phase 5: Verification Gate Consistency
**Goal**: Ensure manual verification and send-safety gates are enforced identically across adapters
**Depends on**: Phase 4
**Requirements**: SAFE-02
**Success Criteria** (what must be TRUE):
  1. Send preparation always requires explicit verification regardless of adapter
  2. No adapter bypasses mandatory quality gates
  3. Verification failures provide actionable remediation output
**Plans:** 2/2 plans complete

Plans:
- [x] 05-01-PLAN.md -- Centralize verification gate policy in shared core
- [x] 05-02-PLAN.md -- Enforce adapter compliance with gate policy hooks

### Phase 6: Parity Test Harness
**Goal**: Add parity checks for command behavior and key workflow outputs across supported adapters
**Depends on**: Phase 5
**Requirements**: CMD-01, QUAL-01, QUAL-02
**Success Criteria** (what must be TRUE):
  1. Parity checks compare command outcomes and state transitions between adapters
  2. Key flows (init, progress, pause/resume, send-prepare) are covered
  3. Mismatches fail checks with precise diagnostics
**Plans:** 2/2 plans complete

Plans:
- [x] 06-01-PLAN.md -- Build adapter parity test runner and fixtures
- [x] 06-02-PLAN.md -- Add command-flow smoke suite for critical workflows

### Phase 7: Additional Adapter Scaffolds
**Goal**: Provide contract-compliant scaffolds for Gemini/OpenCode/Mistral-style adapters
**Depends on**: Phase 6
**Requirements**: (Supports v2 ADPT-04/05/06 readiness)
**Success Criteria** (what must be TRUE):
  1. Scaffold packages for additional adapters compile and validate against contracts
  2. Capability gaps are documented explicitly per provider
  3. No core logic changes are required to add a new adapter scaffold
**Plans:** 1/2 plans executed

Plans:
- [ ] 07-01-PLAN.md -- Add adapter scaffold templates and registration hooks
- [ ] 07-02-PLAN.md -- Validate scaffold conformance with parity runner

### Phase 8: Docs and Migration Guide
**Goal**: Publish clear setup, compatibility, and migration documentation for multi-assistant support
**Depends on**: Phase 7
**Requirements**: DOC-01
**Success Criteria** (what must be TRUE):
  1. Docs explain supported adapters, command mappings, and setup differences
  2. Migration guide covers upgrade path from Claude-first installs
  3. Compatibility matrix states what is fully supported vs scaffold-only
**Plans:** 0 plans

Plans:
- [ ] 08-01-PLAN.md -- Update README/tutorial with adapter model and usage
- [ ] 08-02-PLAN.md -- Add migration and compatibility matrix documentation

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Canonical Contracts | 2/2 | Complete   | 2026-03-03 |
| 2. Codex Adapter Foundation | 2/2 | Complete    | 2026-03-03 |
| 3. Claude Adapter Parity Refactor | 2/2 | Complete   | 2026-03-03 |
| 4. Cross-Adapter State Continuity | 2/2 | Complete   | 2026-03-03 |
| 5. Verification Gate Consistency | 2/2 | Complete    | 2026-03-03 |
| 6. Parity Test Harness | 2/2 | Complete    | 2026-03-03 |
| 7. Additional Adapter Scaffolds | 1/2 | In Progress|  |
| 8. Docs and Migration Guide | 0/2 | Not started | — |
