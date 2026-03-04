# Roadmap: v1.1 HubSpot Campaign Launch Integrity

## Overview

This milestone adds production-safe HubSpot campaign execution to the existing GTM system with mandatory copy approval gates and deterministic launch validation. Work is sequenced to establish campaign domain contracts first, then enforce non-bypass approval and launch controls, then harden verification and results reporting.

## Phases

- [ ] **Phase 9: HubSpot Campaign Command Foundation** - Define HubSpot campaign command surface, campaign model, and lifecycle scaffolding.
- [ ] **Phase 10: Copy Approval Artifact and Gate Engine** - Add required human copy approvals with invalidation-on-edit behavior.
- [ ] **Phase 11: HubSpot Preflight and Launch Enforcement** - Implement preflight + launch path with shared runtime blocking policy.
- [ ] **Phase 12: HubSpot Gate Verification Harness** - Add deterministic validators for launch-gate, approval, and sync/launch regressions.
- [ ] **Phase 13: HubSpot Results and Reporting Integration** - Ingest execution outcomes and expose reporting/feedback artifacts.

## Phase Details

### Phase 9: HubSpot Campaign Command Foundation
**Goal**: Introduce a clear HubSpot campaign command lifecycle and stable campaign data model.
**Depends on**: Phase 8
**Requirements**: HUB-01
**Success Criteria** (what must be TRUE):
  1. Operators can create/read/update campaign shells through new HubSpot command paths.
  2. Campaign metadata and lifecycle state are persisted with backward-compatible schema additions.
  3. Command routing/runtime integration follows existing shared adapter/runtime patterns.
**Plans:** 0 plans

Plans:
- [ ] 09-01-PLAN.md -- Add HubSpot campaign command routing and action translation
- [ ] 09-02-PLAN.md -- Add campaign persistence model and lifecycle state helpers

### Phase 10: Copy Approval Artifact and Gate Engine
**Goal**: Enforce explicit human copy approval before launch-adjacent actions.
**Depends on**: Phase 9
**Requirements**: CPY-01, CPY-02
**Success Criteria** (what must be TRUE):
  1. Launch-eligible campaign assets require approval records with reviewer metadata.
  2. Any approved-copy edit invalidates prior approval deterministically.
  3. Operators can inspect approval status and diffs before launch.
**Plans:** 0 plans

Plans:
- [ ] 10-01-PLAN.md -- Add copy approval artifact schema and approval commands
- [ ] 10-02-PLAN.md -- Add approval invalidation and status/diff reporting

### Phase 11: HubSpot Preflight and Launch Enforcement
**Goal**: Block unsafe launch paths and only allow launch when policy preconditions pass.
**Depends on**: Phase 10
**Requirements**: SAFE-04, HUB-02
**Success Criteria** (what must be TRUE):
  1. Preflight command evaluates approval + readiness requirements consistently.
  2. Launch command is blocked with structured remediation when policy fails.
  3. HubSpot sync/launch behavior is idempotent and auditable.
**Plans:** 0 plans

Plans:
- [ ] 11-01-PLAN.md -- Implement shared preflight policy evaluation for HubSpot campaigns
- [ ] 11-02-PLAN.md -- Implement launch command execution + structured block diagnostics

### Phase 12: HubSpot Gate Verification Harness
**Goal**: Provide deterministic checks that gate integrity and sync/launch behavior do not regress.
**Depends on**: Phase 11
**Requirements**: QUAL-03, QUAL-04
**Success Criteria** (what must be TRUE):
  1. Validators detect missing approvals and invalid launch attempts reliably.
  2. Validators detect HubSpot sync/launch regression paths with machine-readable diagnostics.
  3. Verification commands are CI-friendly and fail non-zero on policy drift.
**Plans:** 0 plans

Plans:
- [ ] 12-01-PLAN.md -- Add launch-gate and copy-approval contract validators
- [ ] 12-02-PLAN.md -- Add sync/launch regression scenario validator and aggregated harness entry

### Phase 13: HubSpot Results and Reporting Integration
**Goal**: Feed HubSpot execution outcomes back into campaign reporting and follow-up decisions.
**Depends on**: Phase 12
**Requirements**: HUB-03
**Success Criteria** (what must be TRUE):
  1. Operators can fetch campaign result snapshots from HubSpot into local artifacts.
  2. Reporting output includes launch metadata, gate status lineage, and outcome metrics.
  3. Results integration preserves existing local reporting schema compatibility.
**Plans:** 0 plans

Plans:
- [ ] 13-01-PLAN.md -- Add HubSpot results ingestion command and storage contract
- [ ] 13-02-PLAN.md -- Add reporting updates and milestone verification artifact

## Progress

**Execution Order:**
Phases execute in numeric order: 9 -> 10 -> 11 -> 12 -> 13

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 9. HubSpot Campaign Command Foundation | 0/2 | Not started | — |
| 10. Copy Approval Artifact and Gate Engine | 0/2 | Not started | — |
| 11. HubSpot Preflight and Launch Enforcement | 0/2 | Not started | — |
| 12. HubSpot Gate Verification Harness | 0/2 | Not started | — |
| 13. HubSpot Results and Reporting Integration | 0/2 | Not started | — |
