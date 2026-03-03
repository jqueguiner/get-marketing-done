---
name: report-server
description: Start a local dashboard server to browse campaign reports in your browser.
user-invocable: true
allowed-tools: Bash, Read
argument-hint: "[start | stop | status]"
---

# Report Server

Start, stop, or check the status of a local dashboard server for browsing campaign reports.

## Process

1. Parse `$ARGUMENTS` for mode — default to `start` if empty.

2. **start**:
   - Check if already running: read `data/report_server.pid`, test if PID is alive (`kill -0`).
   - If running, show the URL and exit.
   - Start the server in the background:
     ```
     python3 scripts/report_server.py --port 8487 &
     ```
   - Wait 1 second, verify `data/report_server.pid` was created.
   - Show: `Dashboard running at http://127.0.0.1:8487`

3. **stop**:
   - Read `data/report_server.pid`.
   - If PID file exists and process is alive, kill it: `kill $(cat data/report_server.pid)`
   - Remove the PID file.
   - Show: `Dashboard server stopped.`
   - If not running, show: `Dashboard server is not running.`

4. **status**:
   - Read `data/report_server.pid`.
   - If PID file exists and process is alive:
     - Show: `Dashboard running at http://127.0.0.1:8487 (PID {pid})`
   - Otherwise:
     - Show: `Dashboard server is not running.`

## Rules

- The server binds to 127.0.0.1 only — local access.
- Default port is 8487. Pass `--port` to change.
- PID file: `data/report_server.pid`. Log file: `data/report_server.log`.
- Do not start a second server if one is already running.
