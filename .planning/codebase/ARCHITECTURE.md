# Architecture Map

## System Pattern
Hybrid CLI + script orchestration pattern:
- Node.js layer handles installation, hooks, and unified init context
- Python layer handles operational GTM workflows and data processing
- SQLite is the system of record for pipeline entities and progress

## Core Components

### 1) Installer and Command Wiring
- Entrypoint: `bin/install.js`
- Responsibilities:
  - Install/update package files into Claude directories
  - Configure hooks and command mappings
  - Preserve local patches on update

### 2) Workflow Bootstrap API
- Entrypoint: `scripts/marketing-tools.js`
- Role:
  - Provides one-call init payloads (`initCampaign`, `initResearch`, etc.)
  - Aggregates config, DB metrics, and state into JSON
  - Reduces orchestration token overhead

### 3) Data and Domain Workflows
- `scripts/db_manager.py`: schema creation + CRUD for core GTM entities
- `scripts/hubspot_importer.py`: ingestion from external CRM
- `scripts/enrichment_runner.py`: enrichment orchestration and status
- `scripts/email_assembler.py` + `scripts/generate_emails.py`: message generation
- `scripts/instantly_uploader.py`: campaign packaging and upload readiness

### 4) Reporting and Visibility
- `scripts/report_server.py` serves dashboard + JSON API over HTTP
- Pipeline/segment/email status derived live from SQLite

### 5) Session Awareness Layer
- `hooks/statusline.js` writes runtime context bridge
- `hooks/context-monitor.js` emits context-capacity warnings
- `hooks/session-start.js` resumes or starts campaign flow

## Primary Data Flow
1. Context and campaign setup updates markdown + config + DB
2. Company/contact data is imported into SQLite
3. Datapoint schemas define enrichment targets
4. Enrichment fills datapoints and updates progress
5. Segmentation and template assembly create draft/ready emails
6. Instantly prep exports campaign CSV for sending
7. Results are recorded and fed back into next campaign loop

## Entry Points
- NPM executable: `get-marketing-done`
- Script CLIs: `python3 scripts/*.py`, `node scripts/marketing-tools.js`
- Dashboard server: `python3 scripts/report_server.py start`
