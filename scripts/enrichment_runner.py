#!/usr/bin/env python3
"""
Enrichment runner — orchestrates data enrichment through Extruct or deep research.
Tracks progress in SQLite.
"""

import json
import sys
import os
import sqlite3
import time
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "data" / "gtm.db"
CONFIG_PATH = Path(__file__).parent.parent / "config.json"


def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def load_config():
    """Load API configuration."""
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH) as f:
            return json.load(f)
    return {}


def run_extruct(campaign, batch_size=50, datapoints=None):
    """Run enrichment through Extruct API."""
    config = load_config()
    extruct_api_key = config.get("extruct_api_key") or os.environ.get("EXTRUCT_API_KEY")

    if not extruct_api_key:
        print(json.dumps({
            "error": "Extruct API key not configured",
            "fix": "Set EXTRUCT_API_KEY env var or add 'extruct_api_key' to config.json"
        }))
        sys.exit(1)

    conn = get_db()

    # Get companies needing enrichment
    if campaign:
        companies = conn.execute("""
            SELECT c.id, c.name, c.domain FROM companies c
            WHERE c.campaign = ?
            ORDER BY c.name
        """, (campaign,)).fetchall()
    else:
        companies = conn.execute("SELECT id, name, domain FROM companies ORDER BY name").fetchall()

    # Get datapoint schemas
    if datapoints:
        dp_names = [d.strip() for d in datapoints.split(",")]
        schemas = conn.execute(
            f"SELECT * FROM datapoint_schemas WHERE name IN ({','.join('?' * len(dp_names))})",
            dp_names
        ).fetchall()
    else:
        schemas = conn.execute("SELECT * FROM datapoint_schemas").fetchall()

    total = len(companies)
    batches = [companies[i:i + batch_size] for i in range(0, total, batch_size)]

    progress = {
        "campaign": campaign,
        "provider": "extruct",
        "total_companies": total,
        "batch_size": batch_size,
        "total_batches": len(batches),
        "datapoints_requested": [s["name"] for s in schemas],
        "status": "ready",
        "started_at": datetime.now().isoformat(),
    }

    # Save progress file
    progress_path = Path(__file__).parent.parent / "data" / "enrichment_progress.json"
    with open(progress_path, "w") as f:
        json.dump(progress, f, indent=2)

    print(json.dumps(progress, indent=2))
    print(f"\nTo start enrichment, the Extruct API would be called for {total} companies.")
    print(f"Batches: {len(batches)} x {batch_size}")
    print(f"\nNote: Actual Extruct API calls require the extruct SDK.")
    print(f"Install with: pip install extruct-sdk")
    print(f"Then configure your API key in config.json or EXTRUCT_API_KEY env var.")

    conn.close()


def check_status(campaign=None):
    """Check enrichment progress."""
    progress_path = Path(__file__).parent.parent / "data" / "enrichment_progress.json"

    if progress_path.exists():
        with open(progress_path) as f:
            progress = json.load(f)
        print(json.dumps(progress, indent=2))
    else:
        # Fall back to DB-based status
        conn = get_db()
        total = conn.execute("SELECT COUNT(*) as cnt FROM companies").fetchone()["cnt"]
        enriched = conn.execute("""
            SELECT COUNT(DISTINCT company_id) as cnt FROM datapoints
            WHERE value IS NOT NULL AND value != ''
        """).fetchone()["cnt"]

        schemas = conn.execute("SELECT * FROM datapoint_schemas").fetchall()
        dp_status = {}
        for s in schemas:
            filled = conn.execute("""
                SELECT COUNT(*) as cnt FROM datapoints
                WHERE schema_name = ? AND value IS NOT NULL AND value != ''
            """, (s["name"],)).fetchone()["cnt"]
            dp_status[s["name"]] = {"filled": filled, "total": total, "rate_pct": round(filled / total * 100, 1) if total else 0}

        conn.close()
        print(json.dumps({
            "total_companies": total,
            "companies_with_data": enriched,
            "overall_rate_pct": round(enriched / total * 100, 1) if total else 0,
            "per_datapoint": dp_status
        }, indent=2))


COMMANDS = {
    "run": lambda args: run_extruct(
        campaign=args.get("--campaign"),
        batch_size=int(args.get("--batch-size", 50)),
        datapoints=args.get("--datapoints")
    ),
    "status": lambda args: check_status(campaign=args.get("--campaign")),
}


def parse_args(argv):
    if len(argv) < 2:
        print("Usage: enrichment_runner.py <command> [--key value ...]")
        print("Commands:", ", ".join(sorted(COMMANDS.keys())))
        sys.exit(1)

    command = argv[1]
    args = {}
    i = 2
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
            i += 1
    return command, args


if __name__ == "__main__":
    command, args = parse_args(sys.argv)
    if command in COMMANDS:
        COMMANDS[command](args)
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
