# Requirements: Get Marketing Done

**Defined:** 2026-03-03
**Core Value:** Teams can run repeatable outbound campaigns with cumulative context and quality gates, regardless of which supported coding assistant they use.

## v1 Requirements

### Adapter Foundation

- [ ] **ADPT-01**: Operator can run the same canonical workflow actions through a Codex-compatible command adapter.
- [ ] **ADPT-02**: Operator can run existing Claude workflow commands without behavioral regression after adapter refactor.
- [ ] **ADPT-03**: Maintainer can define assistant capability metadata in one support matrix used by adapters.

### Command and Workflow Parity

- [ ] **CMD-01**: Operator can invoke core GTM pipeline steps with consistent state transitions across supported adapters.
- [ ] **CMD-02**: Operator can resume paused work from persisted state even when switching assistant frontends.
- [ ] **CMD-03**: Operator can run campaign progress/verification commands with equivalent outputs across adapters.

### Integration and State Safety

- [ ] **SAFE-01**: Maintainer can keep provider-specific auth/config isolated from core workflow logic.
- [ ] **SAFE-02**: Operator can execute manual verification gates before send actions in every supported adapter.
- [ ] **SAFE-03**: System can preserve existing SQLite/CSV/Markdown schemas during adaptation.

### Quality and Compatibility Validation

- [ ] **QUAL-01**: Maintainer can run parity checks that detect command-output/state mismatches between adapters.
- [ ] **QUAL-02**: Maintainer can validate key flows (init, progress, pause/resume, send-prepare) in Codex + Claude adapters.
- [ ] **DOC-01**: Operator can follow updated docs that explain assistant compatibility, setup differences, and supported commands.

## v2 Requirements

### Additional Adapter Coverage

- **ADPT-04**: Operator can use Gemini-oriented adapter commands with parity guarantees.
- **ADPT-05**: Operator can use OpenCode-oriented adapter commands with parity guarantees.
- **ADPT-06**: Operator can use Mistral-compatible adapter patterns with parity guarantees.

### Advanced Validation

- **QUAL-03**: Maintainer can run CI matrix tests across all supported adapters.
- **QUAL-04**: Maintainer can run migration checks for backward compatibility across minor versions.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full cloud rewrite with centralized backend orchestration | Conflicts with local-first design and current delivery scope |
| Autonomous send without mandatory human review | Violates existing quality and safety posture |
| Per-assistant fork of business scripts | Creates long-term maintenance and parity debt |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ADPT-01 | Unmapped | Pending |
| ADPT-02 | Unmapped | Pending |
| ADPT-03 | Unmapped | Pending |
| CMD-01 | Unmapped | Pending |
| CMD-02 | Unmapped | Pending |
| CMD-03 | Unmapped | Pending |
| SAFE-01 | Unmapped | Pending |
| SAFE-02 | Unmapped | Pending |
| SAFE-03 | Unmapped | Pending |
| QUAL-01 | Unmapped | Pending |
| QUAL-02 | Unmapped | Pending |
| DOC-01 | Unmapped | Pending |

**Coverage:**
- v1 requirements: 12 total
- Mapped to phases: 0
- Unmapped: 12 ⚠️

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-03 after initial definition*
