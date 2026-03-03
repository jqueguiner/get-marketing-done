# Testing Map

## Current State
No dedicated automated test suite was detected in this repository.
No `test` script, test framework dependency, or `tests/` directory was found in inspected files.

## Existing Verification Patterns
- Manual command verification through CLI runs
- JSON result payloads used as ad-hoc contract checks
- Dashboard/API checks available via `scripts/report_server.py`
- Data correctness often validated by SQLite queries and counts

## Areas with Implicit Validation
- `scripts/enrichment_runner.py` validates API key presence and emits actionable errors
- `scripts/instantly_uploader.py` checks missing email/data before CSV generation
- `scripts/hubspot_importer.py` handles API auth/rate limit/error branches
- `scripts/email_assembler.py` validates forbidden words and unresolved placeholders

## Testing Gaps
- No unit tests for command argument parsing
- No integration tests for SQLite schema migrations and data paths
- No regression tests for hook behavior (`hooks/*.js`)
- No fixture-based tests for CSV/JSON import/export transformations
- No automated checks for prompt/skill command wiring integrity

## Suggested Testing Strategy
1. Add Python `pytest` tests for `db_manager.py` and import/export scripts
2. Add Node-based tests for `marketing-tools.js` init payloads
3. Add snapshot or contract tests for dashboard JSON endpoints
4. Add smoke script that executes critical workflow commands in CI
5. Add secret-scanning and config-validation checks in CI workflows

## High-Priority Test Targets
- DB schema initialization and foreign-key relations
- HubSpot pagination and filter behavior
- Email generation constraints (max words, forbidden phrases)
- Instantly CSV correctness and required columns
- Context monitor warning thresholds and debounce behavior
