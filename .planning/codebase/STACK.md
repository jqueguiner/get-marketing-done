# Stack Map

## Overview
This project is a Claude Code plugin package for outbound marketing workflows.
It combines Node.js installer/hook tooling with Python workflow scripts and SQLite data storage.

## Languages and Runtimes
- JavaScript (Node.js >= 18) for installer, hooks, and bootstrap tooling
- Python 3 for operational workflow scripts in `scripts/`
- SQL (SQLite dialect) for persistent campaign state and analytics

## Package and Runtime Metadata
- Package file: `package.json`
- CLI entrypoint: `bin/install.js`
- Runtime requirement: `"node": ">=18.0.0"`
- NPM package name: `get-marketing-done`

## JavaScript Surface
- Installer and file lifecycle: `bin/install.js`
- Tool bootstrap CLI: `scripts/marketing-tools.js`
- Session hooks: `hooks/session-start.js`, `hooks/context-monitor.js`, `hooks/statusline.js`

## Python Surface
- Data layer and CRUD utilities: `scripts/db_manager.py`
- Enrichment orchestration: `scripts/enrichment_runner.py`
- Email generation/assembly: `scripts/generate_emails.py`, `scripts/email_assembler.py`
- CRM import: `scripts/hubspot_importer.py`
- Sending prep/results: `scripts/instantly_uploader.py`
- Dashboard server: `scripts/report_server.py`

## Storage and State
- Primary DB: `data/gtm.db`
- State markdown: `data/STATE.md`
- Context doc: `data/company_context.md`
- Pipeline export artifact: `pipeline_export.csv`

## Configuration
- User config: `config.json`
- Example config: `config.example.json`
- Claude integration config: `settings.json`
- Keys supported: Extruct, Instantly, Perplexity, HubSpot

## Build/Test Tooling
- No dedicated build pipeline for source transforms detected.
- No automated test framework configuration detected in `package.json`.
- CI present for publish/release in `.github/workflows/`.
