# Conventions Map

## Code Style

### JavaScript
- CommonJS module style (`require`, no ESM)
- Mostly `const`/`let`; some legacy `var` in hook scripts
- CLI scripts include shebang (`#!/usr/bin/env node`)
- Uses stdlib modules heavily (`fs`, `path`, `os`, `readline`)

### Python
- Shebang + module docstring in all scripts
- Standard library first approach (sqlite3, urllib, json)
- Function-level decomposition by command behavior
- Command dispatch maps (`COMMANDS` dict) for CLI routing

## CLI/Command Pattern
- Scripts follow `<command> [--key value]` argument style
- Errors return JSON payloads where possible for machine readability
- Help/usage text printed on invalid command input

## Data Conventions
- SQLite tables model campaign lifecycle entities
- Timestamps stored as ISO-like text (`datetime('now')`)
- JSON and CSV used for interchange between stages/tools

## Validation and Guardrails
- Email generation enforces forbidden-phrase checks
- Quality gates configurable in `config.json`
- Context monitor hook throttles warnings with debounce logic
- Readiness checks performed before upload/enrichment actions

## Documentation Conventions
- README carries step-indexed pipeline semantics
- Skills are markdown-based and command-focused
- Operational state is persisted in markdown + DB for continuity

## Security/Operational Conventions
- API keys read from env first or `config.json`
- Sensitive values are expected but should not be logged or committed
- Local-first execution, no mandatory SaaS dependency for baseline use
