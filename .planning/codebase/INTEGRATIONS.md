# Integrations Map

## External Integrations

### HubSpot CRM API
- Integration script: `scripts/hubspot_importer.py`
- Transport: HTTPS via `urllib.request` (stdlib)
- Auth: Bearer token from `HUBSPOT_ACCESS_TOKEN` or `config.json`
- Endpoints used:
  - `/crm/v3/objects/companies`
  - `/crm/v3/objects/contacts`
  - `/crm/v3/objects/{type}/search`
- Resilience:
  - Retries on HTTP 429 with `Retry-After`
  - Exits on 401 invalid token

### Instantly
- Integration script: `scripts/instantly_uploader.py`
- Current mode:
  - Prepares CSV payloads (`data/instantly/{campaign}_upload.csv`)
  - Checks for API key readiness
  - Emits manual/API-next-step instructions
- Auth: `INSTANTLY_API_KEY` or `config.json`

### Extruct
- Integration script: `scripts/enrichment_runner.py`
- Current mode:
  - Validates API key and batch setup
  - Persists enrichment progress metadata
  - Notes SDK dependency (`extruct-sdk`) for full execution
- Auth: `EXTRUCT_API_KEY` or `config.json`

### Perplexity
- Mentioned as optional key in config and README
- No direct API invocation found in inspected scripts

## Local Platform Integrations
- SQLite CLI dependency in JS bootstrap: `scripts/marketing-tools.js` calls `sqlite3`
- Claude Code hooks configured in `settings.json`
- Local browser dashboard served by `scripts/report_server.py` at `127.0.0.1:8487`

## Data Interfaces
- JSON batch inputs/outputs for company/contact imports
- CSV export/import path for campaign upload workflow
- Markdown state/context docs for session continuity

## Security Notes
- `config.json` stores credential fields in plain JSON.
- Credential values should be treated as secrets and never copied into docs/logs.
- `.env` also exists in repository root and should remain git-ignored.
