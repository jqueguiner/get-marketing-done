# Concerns Map

## Critical Concerns

### Secret Exposure Risk
- `config.json` currently includes credential fields and may contain live tokens.
- Risk: accidental commit/log leakage.
- Affected files: `config.json`, potential script outputs in `data/`.
- Mitigation:
  - Ensure `config.json` and `.env` are git-ignored where appropriate
  - Move secrets to environment-only in production usage
  - Add automated secret scanning in CI

## High Concerns

### Limited Automated Test Coverage
- Entire workflow depends on manual verification.
- Regression risk is high for data migrations and integration behavior.
- Mitigation: add baseline unit/integration smoke tests.

### Mixed Runtime Surface
- Cross-language system (Node + Python + sqlite3 CLI) increases environment drift risk.
- Missing dependency checks can fail at runtime.
- Mitigation: add preflight command that validates runtime prerequisites.

### Partial Integration Implementations
- Extruct and Instantly paths include readiness/manual-step placeholders.
- Risk: user expects full API execution but receives partial behavior.
- Mitigation: clarify status in docs and add explicit capability matrix.

## Medium Concerns

### State Duplication
- State exists in both markdown and SQLite, which can diverge.
- Mitigation: define authoritative source per datum and sync rules.

### Hook Robustness
- Hooks swallow errors and default silently.
- Good for UX continuity, but can hide operational breakages.
- Mitigation: optional debug logging mode for hook failures.

### Data Quality Drift
- Enrichment confidence and freshness checks are present but not enforced globally.
- Mitigation: hard gates before segmentation/send with override logging.

## Watchlist
- DB growth/locking under larger campaigns
- CSV schema drift with external tools
- Backward compatibility for installed local patches during updates
