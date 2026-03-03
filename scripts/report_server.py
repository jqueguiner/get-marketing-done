#!/usr/bin/env python3
"""
Lightweight HTTP dashboard server for GMD campaign data.
Serves a browser dashboard + JSON API from the SQLite database.
Stdlib only — no dependencies.
"""

import argparse
import json
import os
import signal
import sqlite3
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "gtm.db"
PID_PATH = Path(__file__).parent.parent / "data" / "report_server.pid"
LOG_PATH = Path(__file__).parent.parent / "data" / "report_server.log"

DEFAULT_PORT = 8487


def get_db():
    if not DB_PATH.exists():
        return None
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def safe_query(conn, query, params=()):
    """Run a query, returning [] if the table doesn't exist."""
    try:
        return [dict(r) for r in conn.execute(query, params).fetchall()]
    except sqlite3.OperationalError:
        return []


# ── API handlers ──────────────────────────────────────

def api_pipeline(conn):
    companies = safe_query(conn, "SELECT COUNT(*) as cnt FROM companies")
    total = companies[0]["cnt"] if companies else 0

    contacts = safe_query(conn, "SELECT COUNT(*) as cnt FROM contacts")
    total_contacts = contacts[0]["cnt"] if contacts else 0

    enriched = safe_query(conn, """
        SELECT COUNT(DISTINCT company_id) as cnt FROM datapoints
        WHERE value IS NOT NULL AND value != ''
    """)
    total_enriched = enriched[0]["cnt"] if enriched else 0

    emails = safe_query(conn, "SELECT COUNT(*) as cnt FROM emails")
    total_emails = emails[0]["cnt"] if emails else 0

    segments_count = safe_query(conn, "SELECT COUNT(*) as cnt FROM segments")
    total_segments = segments_count[0]["cnt"] if segments_count else 0

    uploaded_sent = safe_query(conn, "SELECT COUNT(*) as cnt FROM emails WHERE status = 'uploaded' OR status = 'sent'")
    total_uploaded = uploaded_sent[0]["cnt"] if uploaded_sent else 0

    results_count = safe_query(conn, "SELECT COUNT(*) as cnt FROM campaign_results")
    total_results = results_count[0]["cnt"] if results_count else 0

    campaigns = safe_query(conn, "SELECT name, status, total_contacts, created_at FROM campaigns ORDER BY created_at DESC")

    steps = [
        {"name": "Context", "done": True},
        {"name": "Lists", "done": total > 0},
        {"name": "Research", "done": total > 0},
        {"name": "Datapoints", "done": total_enriched > 0},
        {"name": "Enrichment", "done": total_enriched > 0 and total > 0 and (total_enriched / total) > 0.5},
        {"name": "Segments", "done": total_segments > 0},
        {"name": "Emails", "done": total_emails > 0},
        {"name": "Send", "done": total_uploaded > 0},
        {"name": "Learn", "done": total_results > 0},
    ]
    completed = sum(1 for s in steps if s["done"])

    return {
        "companies": total,
        "contacts": total_contacts,
        "enriched": total_enriched,
        "enrichment_rate": round(total_enriched / total * 100, 1) if total else 0,
        "emails": total_emails,
        "steps": steps,
        "completed_steps": completed,
        "total_steps": len(steps),
        "progress_pct": round(completed / len(steps) * 100),
        "campaigns": campaigns,
    }


def api_enrichment(conn):
    companies = safe_query(conn, "SELECT COUNT(*) as cnt FROM companies")
    total = companies[0]["cnt"] if companies else 0

    schemas = safe_query(conn, "SELECT name, category, priority FROM datapoint_schemas ORDER BY name")

    datapoints = []
    for schema in schemas:
        filled = safe_query(conn, """
            SELECT COUNT(DISTINCT d.company_id) as cnt FROM datapoints d
            WHERE d.schema_name = ? AND d.value IS NOT NULL AND d.value != ''
        """, (schema["name"],))
        cnt = filled[0]["cnt"] if filled else 0
        datapoints.append({
            "name": schema["name"],
            "category": schema["category"],
            "priority": schema["priority"],
            "filled": cnt,
            "total": total,
            "rate": round(cnt / total * 100, 1) if total else 0,
        })

    enriched = safe_query(conn, """
        SELECT COUNT(DISTINCT company_id) as cnt FROM datapoints
        WHERE value IS NOT NULL AND value != ''
    """)
    total_enriched = enriched[0]["cnt"] if enriched else 0

    return {
        "total_companies": total,
        "companies_enriched": total_enriched,
        "overall_rate": round(total_enriched / total * 100, 1) if total else 0,
        "datapoints": datapoints,
    }


def api_campaigns(conn):
    campaigns = safe_query(conn, """
        SELECT c.*, cr.total_sent, cr.delivered, cr.opened, cr.replied, cr.bounced,
               cr.positive_replies, cr.neutral_replies, cr.negative_replies, cr.ooo_replies
        FROM campaigns c
        LEFT JOIN campaign_results cr ON c.id = cr.campaign_id
        ORDER BY c.created_at DESC
    """)
    return {"campaigns": campaigns}


def api_segments(conn):
    segments = safe_query(conn, "SELECT * FROM segments ORDER BY name")
    results = []
    for s in segments:
        tiers = safe_query(conn, """
            SELECT tier, COUNT(*) as cnt FROM company_segments
            WHERE segment_id = ? GROUP BY tier
        """, (s["id"],))
        tier_map = {r["tier"]: r["cnt"] for r in tiers}
        total = sum(tier_map.values())
        results.append({
            "id": s["id"],
            "name": s["name"],
            "criteria": s["criteria"],
            "hypothesis": s["hypothesis"],
            "total": total,
            "tier_1": tier_map.get("1", 0),
            "tier_2": tier_map.get("2", 0),
            "tier_3": tier_map.get("3", 0),
        })
    return {"segments": results}


def api_emails(conn):
    rows = safe_query(conn, """
        SELECT cp.name as campaign, e.status, COUNT(*) as cnt
        FROM emails e
        JOIN campaigns cp ON e.campaign_id = cp.id
        GROUP BY cp.name, e.status
        ORDER BY cp.name, e.status
    """)
    by_campaign = {}
    for r in rows:
        name = r["campaign"]
        if name not in by_campaign:
            by_campaign[name] = {"campaign": name, "draft": 0, "ready": 0, "uploaded": 0, "sent": 0}
        by_campaign[name][r["status"]] = r["cnt"]
    return {"emails": list(by_campaign.values())}


# ── HTML Dashboard ────────────────────────────────────

DASHBOARD_HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>GMD Dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f1117; color: #e1e4e8; padding: 24px; }
  h1 { font-size: 22px; font-weight: 600; margin-bottom: 4px; }
  .subtitle { color: #8b949e; font-size: 13px; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 20px; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; }
  .card h2 { font-size: 15px; font-weight: 600; margin-bottom: 14px; color: #58a6ff; }
  .stat-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #21262d; font-size: 13px; }
  .stat-row:last-child { border-bottom: none; }
  .stat-label { color: #8b949e; }
  .stat-value { font-weight: 600; font-variant-numeric: tabular-nums; }
  .progress-bar { background: #21262d; border-radius: 4px; height: 8px; margin: 8px 0 12px; overflow: hidden; }
  .progress-fill { background: #58a6ff; height: 100%; border-radius: 4px; transition: width 0.5s; }
  .steps { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
  .step { font-size: 11px; padding: 3px 8px; border-radius: 4px; background: #21262d; color: #8b949e; }
  .step.done { background: #1f3d2a; color: #3fb950; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; color: #8b949e; font-weight: 500; padding: 6px 8px; border-bottom: 1px solid #30363d; }
  td { padding: 6px 8px; border-bottom: 1px solid #21262d; }
  .badge { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 11px; font-weight: 600; }
  .badge-draft { background: #30363d; color: #8b949e; }
  .badge-prepared, .badge-ready { background: #1c3049; color: #58a6ff; }
  .badge-uploaded { background: #2d1f00; color: #d29922; }
  .badge-running, .badge-sent { background: #1f3d2a; color: #3fb950; }
  .badge-completed { background: #1a3329; color: #3fb950; }
  .fill-bar { display: flex; align-items: center; gap: 8px; }
  .fill-track { flex: 1; background: #21262d; border-radius: 3px; height: 6px; overflow: hidden; }
  .fill-amount { height: 100%; border-radius: 3px; }
  .fill-high { background: #3fb950; }
  .fill-med { background: #d29922; }
  .fill-low { background: #f85149; }
  .pct { font-size: 12px; font-variant-numeric: tabular-nums; width: 42px; text-align: right; }
  .tier { display: inline-block; width: 18px; height: 18px; line-height: 18px; text-align: center; border-radius: 3px; font-size: 10px; font-weight: 700; margin-right: 2px; }
  .t1 { background: #1f3d2a; color: #3fb950; }
  .t2 { background: #1c3049; color: #58a6ff; }
  .t3 { background: #30363d; color: #8b949e; }
  .empty { color: #484f58; font-size: 13px; padding: 16px 0; text-align: center; }
  #status { position: fixed; bottom: 12px; right: 16px; font-size: 11px; color: #484f58; }
</style>
</head>
<body>
<h1>GMD Dashboard</h1>
<p class="subtitle">Campaign pipeline &mdash; auto-refreshes every 30s</p>

<div class="grid">
  <div class="card" id="pipeline-card">
    <h2>Pipeline</h2>
    <div id="pipeline">Loading...</div>
  </div>
  <div class="card" id="enrichment-card">
    <h2>Enrichment</h2>
    <div id="enrichment">Loading...</div>
  </div>
  <div class="card" id="campaigns-card">
    <h2>Campaigns</h2>
    <div id="campaigns">Loading...</div>
  </div>
  <div class="card" id="segments-card">
    <h2>Segments</h2>
    <div id="segments">Loading...</div>
  </div>
  <div class="card" id="emails-card">
    <h2>Emails</h2>
    <div id="emails">Loading...</div>
  </div>
</div>

<div id="status"></div>

<script>
function esc(s) {
  if (s == null) return '';
  var d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

function badge(status) {
  var s = esc(status);
  return '<span class="badge badge-' + s + '">' + s + '</span>';
}

function fillBar(rate) {
  var r = Number(rate) || 0;
  var cls = r >= 70 ? 'fill-high' : r >= 40 ? 'fill-med' : 'fill-low';
  return '<div class="fill-bar"><div class="fill-track"><div class="fill-amount ' + cls + '" style="width:' + r + '%"></div></div><span class="pct">' + r + '%</span></div>';
}

function renderPipeline(d) {
  var h = '';
  h += '<div class="steps">';
  d.steps.forEach(function(s) {
    h += '<span class="step' + (s.done ? ' done' : '') + '">' + (s.done ? '&#10003; ' : '') + esc(s.name) + '</span>';
  });
  h += '</div>';
  h += '<div class="progress-bar"><div class="progress-fill" style="width:' + Number(d.progress_pct) + '%"></div></div>';
  h += '<div class="stat-row"><span class="stat-label">Progress</span><span class="stat-value">' + esc(d.completed_steps) + '/' + esc(d.total_steps) + ' steps (' + esc(d.progress_pct) + '%)</span></div>';
  h += '<div class="stat-row"><span class="stat-label">Companies</span><span class="stat-value">' + esc(d.companies) + '</span></div>';
  h += '<div class="stat-row"><span class="stat-label">Contacts</span><span class="stat-value">' + esc(d.contacts) + '</span></div>';
  h += '<div class="stat-row"><span class="stat-label">Enriched</span><span class="stat-value">' + esc(d.enriched) + ' (' + esc(d.enrichment_rate) + '%)</span></div>';
  h += '<div class="stat-row"><span class="stat-label">Emails</span><span class="stat-value">' + esc(d.emails) + '</span></div>';
  if (d.campaigns && d.campaigns.length) {
    h += '<table style="margin-top:12px"><tr><th>Campaign</th><th>Status</th><th>Contacts</th></tr>';
    d.campaigns.forEach(function(c) {
      h += '<tr><td>' + esc(c.name) + '</td><td>' + badge(c.status) + '</td><td>' + esc(c.total_contacts || 0) + '</td></tr>';
    });
    h += '</table>';
  }
  return h;
}

function renderEnrichment(d) {
  if (!d.datapoints || !d.datapoints.length) return '<p class="empty">No datapoint schemas defined yet.</p>';
  var h = '';
  h += '<div class="stat-row"><span class="stat-label">Companies</span><span class="stat-value">' + esc(d.total_companies) + '</span></div>';
  h += '<div class="stat-row"><span class="stat-label">Enriched</span><span class="stat-value">' + esc(d.companies_enriched) + ' (' + esc(d.overall_rate) + '%)</span></div>';
  h += '<table style="margin-top:12px"><tr><th>Datapoint</th><th>Priority</th><th style="width:50%">Fill Rate</th></tr>';
  d.datapoints.forEach(function(dp) {
    h += '<tr><td>' + esc(dp.name) + '</td><td>' + badge(dp.priority || 'medium') + '</td><td>' + fillBar(dp.rate) + '</td></tr>';
  });
  h += '</table>';
  return h;
}

function renderCampaigns(d) {
  if (!d.campaigns || !d.campaigns.length) return '<p class="empty">No campaigns yet.</p>';
  var h = '<table><tr><th>Campaign</th><th>Status</th><th>Sent</th><th>Opened</th><th>Replied</th><th>Bounced</th></tr>';
  d.campaigns.forEach(function(c) {
    h += '<tr><td>' + esc(c.name) + '</td><td>' + badge(c.status) + '</td>';
    h += '<td>' + esc(c.total_sent || '\u2014') + '</td>';
    h += '<td>' + esc(c.opened || '\u2014') + '</td>';
    h += '<td>' + esc(c.replied || '\u2014') + '</td>';
    h += '<td>' + esc(c.bounced || '\u2014') + '</td></tr>';
  });
  h += '</table>';
  return h;
}

function renderSegments(d) {
  if (!d.segments || !d.segments.length) return '<p class="empty">No segments defined yet.</p>';
  var h = '<table><tr><th>Segment</th><th>Total</th><th>Tiers</th></tr>';
  d.segments.forEach(function(s) {
    h += '<tr><td>' + esc(s.name) + '</td><td>' + esc(s.total) + '</td>';
    h += '<td>';
    if (s.tier_1) h += '<span class="tier t1">' + esc(s.tier_1) + '</span>';
    if (s.tier_2) h += '<span class="tier t2">' + esc(s.tier_2) + '</span>';
    if (s.tier_3) h += '<span class="tier t3">' + esc(s.tier_3) + '</span>';
    h += '</td></tr>';
  });
  h += '</table>';
  return h;
}

function renderEmails(d) {
  if (!d.emails || !d.emails.length) return '<p class="empty">No emails yet.</p>';
  var h = '<table><tr><th>Campaign</th><th>Draft</th><th>Ready</th><th>Uploaded</th><th>Sent</th></tr>';
  d.emails.forEach(function(e) {
    h += '<tr><td>' + esc(e.campaign) + '</td>';
    h += '<td>' + esc(e.draft || 0) + '</td>';
    h += '<td>' + esc(e.ready || 0) + '</td>';
    h += '<td>' + esc(e.uploaded || 0) + '</td>';
    h += '<td>' + esc(e.sent || 0) + '</td></tr>';
  });
  h += '</table>';
  return h;
}

function refresh() {
  var endpoints = ['pipeline', 'enrichment', 'campaigns', 'segments', 'emails'];
  var renderers = {
    pipeline: renderPipeline,
    enrichment: renderEnrichment,
    campaigns: renderCampaigns,
    segments: renderSegments,
    emails: renderEmails,
  };
  endpoints.forEach(function(ep) {
    fetch('/api/' + ep)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        document.getElementById(ep).innerHTML = renderers[ep](d);
      })
      .catch(function() {
        document.getElementById(ep).innerHTML = '<p class="empty">Error loading data.</p>';
      });
  });
  document.getElementById('status').textContent = 'Last refresh: ' + new Date().toLocaleTimeString();
}

refresh();
setInterval(refresh, 30000);
</script>
</body>
</html>"""


# ── HTTP Handler ──────────────────────────────────────

class DashboardHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        try:
            with open(str(LOG_PATH), "a") as f:
                f.write("%s - - [%s] %s\n" % (self.client_address[0], self.log_date_time_string(), format % args))
        except Exception:
            pass

    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(DASHBOARD_HTML.encode("utf-8"))
            return

        api_routes = {
            "/api/pipeline": api_pipeline,
            "/api/enrichment": api_enrichment,
            "/api/campaigns": api_campaigns,
            "/api/segments": api_segments,
            "/api/emails": api_emails,
        }

        if self.path in api_routes:
            conn = get_db()
            if conn is None:
                self.send_json({"error": "Database not found"}, 404)
                return
            try:
                data = api_routes[self.path](conn)
                self.send_json(data)
            except Exception as e:
                self.send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        self.send_response(404)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"Not found")

    def send_json(self, data, status=200):
        body = json.dumps(data, indent=2, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)


# ── Lifecycle ─────────────────────────────────────────

def write_pid():
    PID_PATH.parent.mkdir(parents=True, exist_ok=True)
    PID_PATH.write_text(str(os.getpid()))


def remove_pid():
    try:
        PID_PATH.unlink()
    except FileNotFoundError:
        pass


def check_port(port):
    """Check if port is already in use."""
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind(("127.0.0.1", port))
        return True
    except OSError:
        return False
    finally:
        sock.close()


def shutdown_handler(signum, frame):
    remove_pid()
    sys.exit(0)


def main():
    parser = argparse.ArgumentParser(description="GMD Dashboard Server")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help=f"Port to listen on (default: {DEFAULT_PORT})")
    args = parser.parse_args()

    if not check_port(args.port):
        print(json.dumps({"error": f"Port {args.port} is already in use"}))
        sys.exit(1)

    signal.signal(signal.SIGTERM, shutdown_handler)
    signal.signal(signal.SIGINT, shutdown_handler)

    write_pid()

    server = HTTPServer(("127.0.0.1", args.port), DashboardHandler)
    print(json.dumps({
        "status": "running",
        "url": f"http://127.0.0.1:{args.port}",
        "pid": os.getpid(),
        "db": str(DB_PATH),
    }))
    sys.stdout.flush()

    try:
        server.serve_forever()
    finally:
        remove_pid()


if __name__ == "__main__":
    main()
