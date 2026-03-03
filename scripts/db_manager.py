#!/usr/bin/env python3
"""
SQLite database manager for the GTM automation system.
Handles companies, datapoints, emails, campaigns, and enrichment tracking.
"""

import sqlite3
import json
import csv
import sys
import os
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "gtm.db"


def get_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            domain TEXT UNIQUE,
            industry TEXT,
            sub_industry TEXT,
            size TEXT,
            location TEXT,
            business_model TEXT,
            funding_stage TEXT,
            source TEXT,
            source_reference TEXT,
            match_reason TEXT,
            campaign TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER REFERENCES companies(id),
            name TEXT NOT NULL,
            first_name TEXT,
            last_name TEXT,
            title TEXT,
            email TEXT,
            linkedin_url TEXT,
            source TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS datapoint_schemas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign TEXT NOT NULL,
            name TEXT NOT NULL,
            category TEXT CHECK(category IN ('segmentation', 'personalization')),
            description TEXT,
            search_query_template TEXT,
            priority TEXT CHECK(priority IN ('high', 'medium', 'low')),
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(campaign, name)
        );

        CREATE TABLE IF NOT EXISTS datapoints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER REFERENCES companies(id),
            schema_name TEXT NOT NULL,
            value TEXT,
            source_url TEXT,
            confidence TEXT CHECK(confidence IN ('high', 'medium', 'low')),
            enrichment_source TEXT,
            data_date TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            UNIQUE(company_id, schema_name)
        );

        CREATE TABLE IF NOT EXISTS campaigns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            segment TEXT,
            template_name TEXT,
            status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'prepared', 'uploaded', 'running', 'completed')),
            total_contacts INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER REFERENCES campaigns(id),
            company_id INTEGER REFERENCES companies(id),
            contact_id INTEGER REFERENCES contacts(id),
            subject TEXT,
            body TEXT,
            status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'ready', 'uploaded', 'sent')),
            version INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS campaign_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER REFERENCES campaigns(id),
            total_sent INTEGER DEFAULT 0,
            delivered INTEGER DEFAULT 0,
            opened INTEGER DEFAULT 0,
            replied INTEGER DEFAULT 0,
            bounced INTEGER DEFAULT 0,
            positive_replies INTEGER DEFAULT 0,
            neutral_replies INTEGER DEFAULT 0,
            negative_replies INTEGER DEFAULT 0,
            ooo_replies INTEGER DEFAULT 0,
            fetched_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS segments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            criteria TEXT,
            hypothesis TEXT,
            problem_research_file TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS company_segments (
            company_id INTEGER REFERENCES companies(id),
            segment_id INTEGER REFERENCES segments(id),
            tier TEXT CHECK(tier IN ('1', '2', '3')),
            PRIMARY KEY (company_id, segment_id)
        );

        CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(domain);
        CREATE INDEX IF NOT EXISTS idx_companies_campaign ON companies(campaign);
        CREATE INDEX IF NOT EXISTS idx_datapoints_company ON datapoints(company_id);
        CREATE INDEX IF NOT EXISTS idx_emails_campaign ON emails(campaign_id);
        CREATE INDEX IF NOT EXISTS idx_emails_company ON emails(company_id);
    """)
    conn.commit()
    conn.close()
    print("Database initialized at", DB_PATH)


def add_companies(source, reference=None, file_path=None, criteria=None):
    """Add companies from a JSON file."""
    conn = get_db()
    init_db()

    with open(file_path) as f:
        companies = json.load(f)

    added = 0
    skipped = 0
    for c in companies:
        try:
            conn.execute("""
                INSERT INTO companies (name, domain, industry, sub_industry, size, location,
                    business_model, funding_stage, source, source_reference, match_reason, campaign)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                c.get("name"), c.get("domain"), c.get("industry"), c.get("sub_industry"),
                c.get("size"), c.get("location"), c.get("business_model"), c.get("funding_stage"),
                source, reference or criteria, c.get("match_reason"), c.get("campaign")
            ))
            added += 1
        except sqlite3.IntegrityError:
            skipped += 1

    conn.commit()
    conn.close()
    print(json.dumps({"added": added, "skipped_duplicates": skipped, "total_in_file": len(companies)}))


def list_companies(with_datapoints=False, no_datapoints=False, campaign=None):
    """List companies, optionally with or without datapoints."""
    conn = get_db()

    if no_datapoints:
        rows = conn.execute("""
            SELECT c.* FROM companies c
            LEFT JOIN datapoints d ON c.id = d.company_id
            WHERE d.id IS NULL
            ORDER BY c.name
        """).fetchall()
    elif campaign:
        rows = conn.execute("SELECT * FROM companies WHERE campaign = ? ORDER BY name", (campaign,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM companies ORDER BY name").fetchall()

    results = []
    for r in rows:
        company = dict(r)
        if with_datapoints:
            dps = conn.execute("SELECT * FROM datapoints WHERE company_id = ?", (r["id"],)).fetchall()
            company["datapoints"] = {dp["schema_name"]: dict(dp) for dp in dps}
        results.append(company)

    conn.close()
    print(json.dumps(results, indent=2, default=str))


def get_company(name, with_datapoints=False):
    """Get a single company by name."""
    conn = get_db()
    row = conn.execute("SELECT * FROM companies WHERE name LIKE ?", (f"%{name}%",)).fetchone()
    if not row:
        print(json.dumps({"error": f"Company '{name}' not found"}))
        conn.close()
        return

    company = dict(row)
    if with_datapoints:
        dps = conn.execute("SELECT * FROM datapoints WHERE company_id = ?", (row["id"],)).fetchall()
        company["datapoints"] = {dp["schema_name"]: dict(dp) for dp in dps}

    contacts = conn.execute("SELECT * FROM contacts WHERE company_id = ?", (row["id"],)).fetchall()
    company["contacts"] = [dict(c) for c in contacts]

    conn.close()
    print(json.dumps(company, indent=2, default=str))


def define_datapoints(file_path):
    """Register datapoint schema from JSON file."""
    conn = get_db()
    init_db()

    with open(file_path) as f:
        schema = json.load(f)

    campaign = schema.get("campaign", "default")
    added = 0
    for dp in schema.get("datapoints", []):
        try:
            conn.execute("""
                INSERT OR REPLACE INTO datapoint_schemas (campaign, name, category, description, search_query_template, priority)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (campaign, dp["name"], dp["category"], dp["description"], dp.get("search_query_template"), dp.get("priority", "medium")))
            added += 1
        except Exception as e:
            print(f"Error adding {dp['name']}: {e}", file=sys.stderr)

    conn.commit()
    conn.close()
    print(json.dumps({"campaign": campaign, "datapoints_registered": added}))


def add_datapoints(company, file_path):
    """Add datapoints for a company from JSON file."""
    conn = get_db()

    row = conn.execute("SELECT id FROM companies WHERE name LIKE ?", (f"%{company}%",)).fetchone()
    if not row:
        print(json.dumps({"error": f"Company '{company}' not found"}))
        conn.close()
        return

    company_id = row["id"]
    with open(file_path) as f:
        data = json.load(f)

    datapoints = data.get("datapoints", data) if isinstance(data, dict) else data
    if isinstance(datapoints, dict):
        items = datapoints.items()
    else:
        items = [(d["name"], d) for d in datapoints]

    added = 0
    for name, dp in items:
        if isinstance(dp, dict):
            value = dp.get("value", "")
            source_url = dp.get("source", dp.get("source_url", ""))
            confidence = dp.get("confidence", "medium")
            data_date = dp.get("date", dp.get("data_date", ""))
        else:
            value, source_url, confidence, data_date = str(dp), "", "medium", ""

        # Don't overwrite high-confidence with low-confidence
        existing = conn.execute(
            "SELECT confidence FROM datapoints WHERE company_id = ? AND schema_name = ?",
            (company_id, name)
        ).fetchone()
        if existing and existing["confidence"] == "high" and confidence == "low":
            continue

        conn.execute("""
            INSERT OR REPLACE INTO datapoints (company_id, schema_name, value, source_url, confidence, data_date, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        """, (company_id, name, value, source_url, confidence, data_date))
        added += 1

    conn.commit()
    conn.close()
    print(json.dumps({"company": company, "datapoints_added": added}))


def show_datapoints(format="table"):
    """Show all companies and their datapoints."""
    conn = get_db()

    companies = conn.execute("SELECT * FROM companies ORDER BY name").fetchall()
    schemas = conn.execute("SELECT DISTINCT name FROM datapoint_schemas ORDER BY name").fetchall()
    schema_names = [s["name"] for s in schemas]

    if format == "table":
        header = ["Company", "Domain"] + schema_names
        print("\t".join(header))
        print("\t".join(["---"] * len(header)))

        for c in companies:
            dps = conn.execute("SELECT schema_name, value FROM datapoints WHERE company_id = ?", (c["id"],)).fetchall()
            dp_map = {dp["schema_name"]: dp["value"][:50] if dp["value"] else "" for dp in dps}
            row = [c["name"] or "", c["domain"] or ""] + [dp_map.get(s, "") for s in schema_names]
            print("\t".join(row))
    else:
        results = []
        for c in companies:
            dps = conn.execute("SELECT * FROM datapoints WHERE company_id = ?", (c["id"],)).fetchall()
            results.append({"company": dict(c), "datapoints": {dp["schema_name"]: dict(dp) for dp in dps}})
        print(json.dumps(results, indent=2, default=str))

    conn.close()


def enrichment_status(campaign=None):
    """Show enrichment progress."""
    conn = get_db()

    if campaign:
        companies = conn.execute("SELECT * FROM companies WHERE campaign = ?", (campaign,)).fetchall()
    else:
        companies = conn.execute("SELECT * FROM companies").fetchall()

    schemas = conn.execute("SELECT * FROM datapoint_schemas").fetchall()
    total_companies = len(companies)

    if total_companies == 0:
        print(json.dumps({"error": "No companies found", "campaign": campaign}))
        conn.close()
        return

    stats = {"total_companies": total_companies, "datapoints": {}}
    companies_with_any = 0

    for schema in schemas:
        filled = conn.execute("""
            SELECT COUNT(DISTINCT d.company_id) as cnt FROM datapoints d
            JOIN companies c ON d.company_id = c.id
            WHERE d.schema_name = ? AND d.value IS NOT NULL AND d.value != ''
        """, (schema["name"],)).fetchone()["cnt"]
        stats["datapoints"][schema["name"]] = {
            "filled": filled,
            "total": total_companies,
            "rate": round(filled / total_companies * 100, 1) if total_companies else 0,
            "priority": schema["priority"]
        }

    enriched = conn.execute("""
        SELECT COUNT(DISTINCT company_id) as cnt FROM datapoints
        WHERE value IS NOT NULL AND value != ''
    """).fetchone()["cnt"]
    stats["companies_enriched"] = enriched
    stats["enrichment_rate"] = round(enriched / total_companies * 100, 1) if total_companies else 0

    # Stale data check
    three_months_ago = (datetime.now() - timedelta(days=90)).isoformat()
    stale = conn.execute("""
        SELECT COUNT(*) as cnt FROM datapoints WHERE updated_at < ?
    """, (three_months_ago,)).fetchone()["cnt"]
    stats["stale_datapoints"] = stale

    # Low confidence
    low_conf = conn.execute("""
        SELECT COUNT(*) as cnt FROM datapoints WHERE confidence = 'low'
    """).fetchone()["cnt"]
    stats["low_confidence_datapoints"] = low_conf

    conn.close()
    print(json.dumps(stats, indent=2))


def validate_enrichment(campaign, strict=False):
    """Validate enrichment data quality."""
    conn = get_db()
    issues = []

    # Missing required datapoints
    high_priority = conn.execute(
        "SELECT name FROM datapoint_schemas WHERE priority = 'high'"
    ).fetchall()

    for schema in high_priority:
        missing = conn.execute("""
            SELECT c.name, c.domain FROM companies c
            LEFT JOIN datapoints d ON c.id = d.company_id AND d.schema_name = ?
            WHERE d.id IS NULL OR d.value IS NULL OR d.value = ''
        """, (schema["name"],)).fetchall()
        if missing:
            issues.append({
                "type": "missing_required",
                "datapoint": schema["name"],
                "count": len(missing),
                "companies": [m["name"] for m in missing[:10]]
            })

    # Stale data
    three_months_ago = (datetime.now() - timedelta(days=90)).isoformat()
    stale = conn.execute("""
        SELECT c.name, d.schema_name, d.updated_at FROM datapoints d
        JOIN companies c ON d.company_id = c.id
        WHERE d.updated_at < ?
    """, (three_months_ago,)).fetchall()
    if stale:
        issues.append({
            "type": "stale_data",
            "count": len(stale),
            "samples": [{"company": s["name"], "datapoint": s["schema_name"], "last_updated": s["updated_at"]} for s in stale[:5]]
        })

    # Low confidence
    low = conn.execute("""
        SELECT c.name, d.schema_name FROM datapoints d
        JOIN companies c ON d.company_id = c.id
        WHERE d.confidence = 'low'
    """).fetchall()
    if low:
        issues.append({
            "type": "low_confidence",
            "count": len(low),
            "samples": [{"company": l["name"], "datapoint": l["schema_name"]} for l in low[:5]]
        })

    conn.close()
    print(json.dumps({"valid": len(issues) == 0, "issues": issues}, indent=2))


def save_emails(campaign, file_path):
    """Save generated emails."""
    conn = get_db()
    init_db()

    # Ensure campaign exists
    existing = conn.execute("SELECT id FROM campaigns WHERE name = ?", (campaign,)).fetchone()
    if not existing:
        conn.execute("INSERT INTO campaigns (name) VALUES (?)", (campaign,))
        conn.commit()

    campaign_id = conn.execute("SELECT id FROM campaigns WHERE name = ?", (campaign,)).fetchone()["id"]

    with open(file_path) as f:
        emails = json.load(f)

    saved = 0
    for e in emails:
        company_row = conn.execute("SELECT id FROM companies WHERE name LIKE ?", (f"%{e.get('company', '')}%",)).fetchone()
        company_id = company_row["id"] if company_row else None

        contact_id = None
        if e.get("contact_email"):
            contact_row = conn.execute("SELECT id FROM contacts WHERE email = ?", (e["contact_email"],)).fetchone()
            contact_id = contact_row["id"] if contact_row else None

        conn.execute("""
            INSERT INTO emails (campaign_id, company_id, contact_id, subject, body, status)
            VALUES (?, ?, ?, ?, ?, 'ready')
        """, (campaign_id, company_id, contact_id, e.get("subject"), e.get("body")))
        saved += 1

    conn.execute("UPDATE campaigns SET total_contacts = ?, updated_at = datetime('now') WHERE id = ?", (saved, campaign_id))
    conn.commit()
    conn.close()
    print(json.dumps({"campaign": campaign, "emails_saved": saved}))


def get_emails(campaign, status=None):
    """Get emails for a campaign."""
    conn = get_db()
    query = """
        SELECT e.*, c.name as company_name, c.domain as company_domain,
               ct.name as contact_name, ct.email as contact_email
        FROM emails e
        LEFT JOIN companies c ON e.company_id = c.id
        LEFT JOIN contacts ct ON e.contact_id = ct.id
        JOIN campaigns cp ON e.campaign_id = cp.id
        WHERE cp.name = ?
    """
    params = [campaign]
    if status:
        query += " AND e.status = ?"
        params.append(status)

    rows = conn.execute(query, params).fetchall()
    conn.close()
    print(json.dumps([dict(r) for r in rows], indent=2, default=str))


def get_email(company):
    """Get the latest email for a company."""
    conn = get_db()
    row = conn.execute("""
        SELECT e.*, c.name as company_name FROM emails e
        JOIN companies c ON e.company_id = c.id
        WHERE c.name LIKE ?
        ORDER BY e.updated_at DESC LIMIT 1
    """, (f"%{company}%",)).fetchone()

    if row:
        print(json.dumps(dict(row), indent=2, default=str))
    else:
        print(json.dumps({"error": f"No email found for '{company}'"}))
    conn.close()


def update_email(company, file_path):
    """Update an email for a company."""
    conn = get_db()

    with open(file_path) as f:
        data = json.load(f)

    row = conn.execute("""
        SELECT e.id FROM emails e
        JOIN companies c ON e.company_id = c.id
        WHERE c.name LIKE ?
        ORDER BY e.updated_at DESC LIMIT 1
    """, (f"%{company}%",)).fetchone()

    if not row:
        print(json.dumps({"error": f"No email found for '{company}'"}))
        conn.close()
        return

    conn.execute("""
        UPDATE emails SET subject = ?, body = ?, version = version + 1, updated_at = datetime('now')
        WHERE id = ?
    """, (data.get("subject"), data.get("body"), row["id"]))
    conn.commit()
    conn.close()
    print(json.dumps({"updated": True, "company": company}))


def mark_uploaded(campaign):
    """Mark a campaign as uploaded."""
    conn = get_db()
    conn.execute("UPDATE campaigns SET status = 'uploaded', updated_at = datetime('now') WHERE name = ?", (campaign,))
    conn.execute("UPDATE emails SET status = 'uploaded', updated_at = datetime('now') WHERE campaign_id = (SELECT id FROM campaigns WHERE name = ?)", (campaign,))
    conn.commit()
    conn.close()
    print(json.dumps({"campaign": campaign, "status": "uploaded"}))


def save_results(campaign, file_path):
    """Save campaign results."""
    conn = get_db()

    campaign_row = conn.execute("SELECT id FROM campaigns WHERE name = ?", (campaign,)).fetchone()
    if not campaign_row:
        print(json.dumps({"error": f"Campaign '{campaign}' not found"}))
        conn.close()
        return

    with open(file_path) as f:
        results = json.load(f)

    conn.execute("""
        INSERT INTO campaign_results (campaign_id, total_sent, delivered, opened, replied, bounced,
            positive_replies, neutral_replies, negative_replies, ooo_replies)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        campaign_row["id"], results.get("total_sent", 0), results.get("delivered", 0),
        results.get("opened", 0), results.get("replied", 0), results.get("bounced", 0),
        results.get("positive_replies", 0), results.get("neutral_replies", 0),
        results.get("negative_replies", 0), results.get("ooo_replies", 0)
    ))
    conn.execute("UPDATE campaigns SET status = 'completed', updated_at = datetime('now') WHERE id = ?", (campaign_row["id"],))
    conn.commit()
    conn.close()
    print(json.dumps({"campaign": campaign, "results_saved": True}))


def campaign_results(campaign):
    """Get campaign results."""
    conn = get_db()
    row = conn.execute("""
        SELECT cr.*, cp.name as campaign_name FROM campaign_results cr
        JOIN campaigns cp ON cr.campaign_id = cp.id
        WHERE cp.name = ?
        ORDER BY cr.fetched_at DESC LIMIT 1
    """, (campaign,)).fetchone()

    if row:
        print(json.dumps(dict(row), indent=2, default=str))
    else:
        print(json.dumps({"error": f"No results found for campaign '{campaign}'"}))
    conn.close()


def export_data(campaign, format="csv", output=None):
    """Export enriched data."""
    conn = get_db()

    rows = conn.execute("""
        SELECT c.*, GROUP_CONCAT(d.schema_name || '=' || COALESCE(d.value, ''), '|||') as datapoints_raw
        FROM companies c
        LEFT JOIN datapoints d ON c.id = d.company_id
        WHERE c.campaign = ? OR ? IS NULL
        GROUP BY c.id
        ORDER BY c.name
    """, (campaign, campaign)).fetchall()

    if format == "csv":
        output = output or f"data/enriched/{campaign}_enriched.csv"
        Path(output).parent.mkdir(parents=True, exist_ok=True)
        with open(output, "w", newline="") as f:
            if rows:
                writer = csv.writer(f)
                base_fields = ["name", "domain", "industry", "size", "location", "source", "match_reason"]
                # Get all unique datapoint names
                dp_names = set()
                for r in rows:
                    if r["datapoints_raw"]:
                        for dp in r["datapoints_raw"].split("|||"):
                            if "=" in dp:
                                dp_names.add(dp.split("=", 1)[0])
                dp_names = sorted(dp_names)
                writer.writerow(base_fields + list(dp_names))

                for r in rows:
                    dp_map = {}
                    if r["datapoints_raw"]:
                        for dp in r["datapoints_raw"].split("|||"):
                            if "=" in dp:
                                k, v = dp.split("=", 1)
                                dp_map[k] = v
                    row = [r[f] or "" for f in base_fields] + [dp_map.get(n, "") for n in dp_names]
                    writer.writerow(row)

        print(json.dumps({"exported": len(rows), "format": format, "file": output}))
    else:
        results = []
        for r in rows:
            company = dict(r)
            del company["datapoints_raw"]
            dps = conn.execute("SELECT * FROM datapoints WHERE company_id = ?", (r["id"],)).fetchall()
            company["datapoints"] = {dp["schema_name"]: dict(dp) for dp in dps}
            results.append(company)
        if output:
            Path(output).parent.mkdir(parents=True, exist_ok=True)
            with open(output, "w") as f:
                json.dump(results, f, indent=2, default=str)
            print(json.dumps({"exported": len(results), "format": format, "file": output}))
        else:
            print(json.dumps(results, indent=2, default=str))

    conn.close()


def add_contacts(file_path):
    """Add contacts from a JSON file."""
    conn = get_db()
    init_db()

    with open(file_path) as f:
        contacts = json.load(f)

    added = 0
    for c in contacts:
        company_row = conn.execute("SELECT id FROM companies WHERE name LIKE ? OR domain = ?",
                                   (f"%{c.get('company', '')}%", c.get("domain", ""))).fetchone()
        company_id = company_row["id"] if company_row else None

        conn.execute("""
            INSERT INTO contacts (company_id, name, first_name, last_name, title, email, linkedin_url, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (company_id, c.get("name"), c.get("first_name"), c.get("last_name"),
              c.get("title"), c.get("email"), c.get("linkedin_url"), c.get("source")))
        added += 1

    conn.commit()
    conn.close()
    print(json.dumps({"contacts_added": added}))


def create_segment(name, criteria, hypothesis, problem_file=None):
    """Create a segment."""
    conn = get_db()
    init_db()
    conn.execute("""
        INSERT OR REPLACE INTO segments (name, criteria, hypothesis, problem_research_file)
        VALUES (?, ?, ?, ?)
    """, (name, criteria, hypothesis, problem_file))
    conn.commit()
    conn.close()
    print(json.dumps({"segment_created": name}))


def assign_segment(company_name, segment_name, tier):
    """Assign a company to a segment with a tier."""
    conn = get_db()
    company = conn.execute("SELECT id FROM companies WHERE name LIKE ?", (f"%{company_name}%",)).fetchone()
    segment = conn.execute("SELECT id FROM segments WHERE name = ?", (segment_name,)).fetchone()
    if not company or not segment:
        print(json.dumps({"error": "Company or segment not found"}))
        conn.close()
        return
    conn.execute("""
        INSERT OR REPLACE INTO company_segments (company_id, segment_id, tier)
        VALUES (?, ?, ?)
    """, (company["id"], segment["id"], tier))
    conn.commit()
    conn.close()
    print(json.dumps({"assigned": True, "company": company_name, "segment": segment_name, "tier": tier}))


COMMANDS = {
    "init": lambda args: init_db(),
    "add-companies": lambda args: add_companies(
        source=args.get("--source", "manual"),
        reference=args.get("--reference"),
        file_path=args.get("--file"),
        criteria=args.get("--criteria")
    ),
    "list-companies": lambda args: list_companies(
        with_datapoints="--with-datapoints" in args,
        no_datapoints="--no-datapoints" in args,
        campaign=args.get("--campaign")
    ),
    "get-company": lambda args: get_company(
        name=args.get("--name", ""),
        with_datapoints="--with-datapoints" in args
    ),
    "define-datapoints": lambda args: define_datapoints(file_path=args.get("--file")),
    "add-datapoints": lambda args: add_datapoints(
        company=args.get("--company", ""),
        file_path=args.get("--file")
    ),
    "show-datapoints": lambda args: show_datapoints(format=args.get("--format", "table")),
    "enrichment-status": lambda args: enrichment_status(campaign=args.get("--campaign")),
    "validate-enrichment": lambda args: validate_enrichment(
        campaign=args.get("--campaign", ""),
        strict="--strict" in args
    ),
    "save-emails": lambda args: save_emails(campaign=args.get("--campaign", ""), file_path=args.get("--file")),
    "get-emails": lambda args: get_emails(campaign=args.get("--campaign", ""), status=args.get("--status")),
    "get-email": lambda args: get_email(company=args.get("--company", "")),
    "update-email": lambda args: update_email(company=args.get("--company", ""), file_path=args.get("--file")),
    "mark-uploaded": lambda args: mark_uploaded(campaign=args.get("--campaign", "")),
    "save-results": lambda args: save_results(campaign=args.get("--campaign", ""), file_path=args.get("--file")),
    "campaign-results": lambda args: campaign_results(campaign=args.get("--campaign", args.get("_positional", ""))),
    "export": lambda args: export_data(
        campaign=args.get("--campaign", ""),
        format=args.get("--format", "csv"),
        output=args.get("--output")
    ),
    "add-contacts": lambda args: add_contacts(file_path=args.get("--file")),
    "create-segment": lambda args: create_segment(
        name=args.get("--name", ""),
        criteria=args.get("--criteria", ""),
        hypothesis=args.get("--hypothesis", ""),
        problem_file=args.get("--problem-file")
    ),
    "assign-segment": lambda args: assign_segment(
        company_name=args.get("--company", ""),
        segment_name=args.get("--segment", ""),
        tier=args.get("--tier", "2")
    ),
}


def parse_args(argv):
    """Simple arg parser: command --key value --flag"""
    if len(argv) < 2:
        print("Usage: db_manager.py <command> [--key value ...]")
        print("Commands:", ", ".join(sorted(COMMANDS.keys())))
        sys.exit(1)

    command = argv[1]
    args = {}
    i = 2
    positional_set = False
    while i < len(argv):
        if argv[i].startswith("--"):
            key = argv[i]
            if i + 1 < len(argv) and not argv[i + 1].startswith("--"):
                args[key] = argv[i + 1]
                i += 2
            else:
                args[key] = True
                i += 1
        else:
            if not positional_set:
                args["_positional"] = argv[i]
                positional_set = True
            i += 1

    return command, args


if __name__ == "__main__":
    command, args = parse_args(sys.argv)
    if command in COMMANDS:
        COMMANDS[command](args)
    else:
        print(f"Unknown command: {command}")
        print("Available:", ", ".join(sorted(COMMANDS.keys())))
        sys.exit(1)
