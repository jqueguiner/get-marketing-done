# Structure Map

## Repository Layout
- `bin/` - Installer and package entry scripts
- `hooks/` - Claude Code hook scripts for session lifecycle and context feedback
- `scripts/` - Operational CLIs (Python + JS)
- `skills/` - Command skill definitions (`SKILL.md` per command)
- `templates/` - Prompt/data templates used by workflows
- `data/` - Runtime state, SQLite database, logs, exports
- `.github/workflows/` - Release/publish automation

## Key Root Files
- `README.md` - Product and command documentation
- `tutorial.md` - Guided usage content
- `package.json` - NPM metadata and bin mapping
- `config.example.json` - Default config schema
- `config.json` - Local runtime configuration
- `settings.json` - Claude permissions/hooks/statusline wiring

## Script Inventory
- `scripts/db_manager.py` - DB schema and data ops
- `scripts/marketing-tools.js` - single-call orchestration init
- `scripts/enrichment_runner.py` - enrichment orchestration/status
- `scripts/hubspot_importer.py` - HubSpot ingestion
- `scripts/email_assembler.py` - template-driven email assembly
- `scripts/generate_emails.py` - segment-conditioned generation flow
- `scripts/instantly_uploader.py` - CSV prep + upload/readiness
- `scripts/report_server.py` - dashboard API/UI server

## Data Artifacts
- `data/gtm.db` - primary datastore
- `data/report_server.log` - server logs
- `pipeline_export.csv` - exported pipeline dataset
- `data/*.md` - campaign state/context docs

## Naming and Organization Patterns
- Python filenames are snake_case and task-specific
- JS support files are kebab or camel variants, purpose-driven
- Skills use one folder per command with `SKILL.md`
- Integration and workflow code are separated by domain script
