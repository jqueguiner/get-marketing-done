# Requirements: Get Marketing Done

**Defined:** 2026-03-03
**Milestone:** v1.1 HubSpot Campaign Launch Integrity
**Core Value:** Teams can run repeatable outbound campaigns with cumulative context and quality gates, regardless of which supported coding assistant they use.

## Legacy Completed Requirements (v1.0)

### Adapter Foundation
- [x] **ADPT-01**: Operator can run the same canonical workflow actions through a Codex-compatible command adapter.
- [x] **ADPT-02**: Operator can run existing Claude workflow commands without behavioral regression after adapter refactor.
- [x] **ADPT-03**: Maintainer can define assistant capability metadata in one support matrix used by adapters.

### Command and Workflow Parity
- [x] **CMD-01**: Operator can invoke core GTM pipeline steps with consistent state transitions across supported adapters.
- [x] **CMD-02**: Operator can resume paused work from persisted state even when switching assistant frontends.
- [x] **CMD-03**: Operator can run campaign progress/verification commands with equivalent outputs across adapters.

### Integration and State Safety
- [x] **SAFE-01**: Maintainer can keep provider-specific auth/config isolated from core workflow logic.
- [x] **SAFE-02**: Operator can execute manual verification gates before send actions in every supported adapter.
- [x] **SAFE-03**: System can preserve existing SQLite/CSV/Markdown schemas during adaptation.

### Quality and Documentation
- [x] **QUAL-01**: Maintainer can run parity checks that detect command-output/state mismatches between adapters.
- [x] **QUAL-02**: Maintainer can validate key flows (init, progress, pause/resume, send-prepare) in Codex + Claude adapters.
- [x] **DOC-01**: Operator can follow updated docs that explain assistant compatibility, setup differences, and supported commands.
- [x] **ADPT-04**: Operator can use Gemini-oriented adapter commands with parity guarantees.
- [x] **ADPT-05**: Operator can use OpenCode-oriented adapter commands with parity guarantees.
- [x] **ADPT-06**: Operator can use Mistral-compatible adapter patterns with parity guarantees.

## v1.1 Requirements

### HubSpot Campaign Execution
- [ ] **HUB-01**: Operator can create and manage HubSpot campaign objects through GMD commands.
- [ ] **HUB-02**: Operator can run preflight checks and launch eligible HubSpot campaigns from GMD.
- [ ] **HUB-03**: Operator can pull HubSpot campaign execution results into local reporting artifacts.

### Copy Approval and Launch Safety
- [ ] **CPY-01**: Operator must explicitly approve campaign copy before launch-adjacent actions are allowed.
- [ ] **CPY-02**: Copy approvals are invalidated automatically when approved copy changes.
- [ ] **SAFE-04**: System blocks launch/publish when required approvals or preflight checks are missing.

### Verification and Reliability
- [ ] **QUAL-03**: Maintainer can run deterministic validators for HubSpot launch-gate and copy-approval contracts.
- [ ] **QUAL-04**: Maintainer can detect HubSpot sync/launch regression paths with structured diagnostics.

## Deferred (Future Milestones)

- Full ABM orchestration and buying-committee automation
- Social AI campaign generation (X/LinkedIn/Instagram/TikTok + avatar video)
- Competitor scanner and announcement intelligence

## Out of Scope (v1.1)

| Feature | Reason |
|---------|--------|
| Autonomous sending without human approval | Violates safety posture |
| Full SaaS/backend rewrite | Conflicts with local-first architecture |
| Per-assistant forks for HubSpot logic | Increases maintenance/parity risk |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| HUB-01 | Phase 9 | Pending |
| CPY-01 | Phase 10 | Pending |
| CPY-02 | Phase 10 | Pending |
| SAFE-04 | Phase 11 | Pending |
| HUB-02 | Phase 11 | Pending |
| QUAL-03 | Phase 12 | Pending |
| QUAL-04 | Phase 12 | Pending |
| HUB-03 | Phase 13 | Pending |

**Coverage:**
- v1.1 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-04 after milestone v1.1 initialization*
