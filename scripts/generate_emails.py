#!/usr/bin/env python3
"""
Generate emails from the peer-question-benchmark template.
Applies segment-specific conditionals and personalizes subject lines.
"""

import json
import csv
import re
import sys
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "gtm.db"
TEMPLATE_PATH = Path(__file__).parent.parent.parent / ".claude" / "get-marketing-done" / "data" / "templates" / "peer-question-benchmark.json"
CSV_PATH = Path(__file__).parent.parent / "pipeline_export.csv"

FORBIDDEN = [
    "just following up", "hope this finds you", "i'd love to",
    "circle back", "synergy", "leverage", "touch base",
    "excited to", "game-changing", "revolutionary", "cutting-edge",
    "best-in-class", "world-class", "end-to-end", "robust", "seamless"
]


def extract_short_provider(raw_provider):
    """Extract a short provider name for subject line."""
    raw = raw_provider.lower()
    providers = [
        ("deepgram", "Deepgram"),
        ("assemblyai", "AssemblyAI"),
        ("assembly ai", "AssemblyAI"),
        ("whisper", "Whisper"),
        ("openai", "Whisper"),
        ("google cloud", "Google Cloud STT"),
        ("google speech", "Google Cloud STT"),
        ("aws transcribe", "AWS Transcribe"),
        ("amazon transcribe", "AWS Transcribe"),
        ("azure", "Azure Speech"),
        ("microsoft", "Azure Speech"),
        ("speechmatics", "Speechmatics"),
        ("rev.ai", "Rev AI"),
        ("revai", "Rev AI"),
        ("vosk", "Vosk"),
        ("elevenlabs", "ElevenLabs"),
        ("eleven labs", "ElevenLabs"),
    ]
    for keyword, name in providers:
        if keyword in raw:
            return name

    # Filter out generic/bad provider names
    bad_names = ["proprietary", "unknown", "native", "custom", "in-house",
                 "internal", "built", "not disclosed", "n/a", "none", "unclear"]
    for bad in bad_names:
        if bad in raw:
            return "your STT setup"

    # Try to extract a proper noun
    words = raw_provider.split()
    if words and len(words[0]) > 2 and words[0][0].isupper():
        # Take first 1-2 capitalized words, skip generic starters
        skip_words = {"The", "Their", "Uses", "Likely", "Multiple", "Various", "Based", "Primary"}
        if words[0] not in skip_words:
            short = words[0]
            if len(words) > 1 and words[1][0].isupper() and not words[1].startswith("("):
                short += " " + words[1]
            if len(short) < 30:
                return short

    return "your STT setup"


def generate_all():
    """Generate emails for all companies using CSV data + DB segment assignments."""
    # Load template
    with open(TEMPLATE_PATH) as f:
        template = json.load(f)

    conditionals = {c["segment"]: c for c in template["conditionals"]}

    # Load CSV for enrichment data
    with open(CSV_PATH) as f:
        csv_rows = {r["domain"]: r for r in csv.DictReader(f)}

    # Load companies + segments from DB
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    companies = conn.execute("""
        SELECT c.*, s.name as segment_name, cs.tier
        FROM companies c
        JOIN company_segments cs ON c.id = cs.company_id
        JOIN segments s ON cs.segment_id = s.id
        ORDER BY cs.tier, c.name
    """).fetchall()
    conn.close()

    emails = []
    skipped = []

    for company in companies:
        name = company["name"]
        domain = company["domain"]
        segment = company["segment_name"]
        tier = company["tier"]

        # Get enrichment data from CSV
        csv_data = csv_rows.get(domain, {})
        if not csv_data:
            skipped.append({"company": name, "reason": "not in CSV"})
            continue

        stt_provider = csv_data.get("current_stt_provider", "")
        if not stt_provider:
            skipped.append({"company": name, "reason": "no STT provider data"})
            continue

        # Get conditional for this segment
        cond = conditionals.get(segment)
        if not cond:
            skipped.append({"company": name, "reason": f"no conditional for segment {segment}"})
            continue

        # Build subject
        short_provider = extract_short_provider(stt_provider)
        subject = f"question about {short_provider}"
        if len(subject) > 50:
            subject = "question about your STT setup"

        # Build body from conditional
        opening = cond["opening_question"]
        opening = opening.replace("{current_stt_provider}", short_provider)
        opening = opening.replace("{company_name}", name)
        opening = f"Quick question — {opening}"

        why = cond["why_it_matters"]
        bridge = cond["bridge"]
        cta = cond["cta"]

        body = f"{opening}\n\n{why}\n\n{bridge}\n\n{cta}"

        # Validate
        word_count = len(body.split())
        body_lower = body.lower()
        violations = [w for w in FORBIDDEN if w in body_lower]

        emails.append({
            "company": name,
            "domain": domain,
            "segment": segment,
            "tier": tier,
            "subject": subject,
            "body": body,
            "word_count": word_count,
            "violations": violations,
        })

    return emails, skipped


def save_to_db(emails):
    """Save generated emails to the database."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    # Create or get campaign
    conn.execute("""
        INSERT OR IGNORE INTO campaigns (name, status)
        VALUES (?, ?)
    """, ("meeting-recorders-ccaas-async", "draft"))
    campaign = conn.execute("SELECT id FROM campaigns WHERE name = ?",
                           ("meeting-recorders-ccaas-async",)).fetchone()
    campaign_id = campaign["id"]

    saved = 0
    for email in emails:
        company = conn.execute("SELECT id FROM companies WHERE domain = ?",
                              (email["domain"],)).fetchone()
        if not company:
            continue

        conn.execute("""
            INSERT OR REPLACE INTO emails (campaign_id, company_id, subject, body, status)
            VALUES (?, ?, ?, ?, 'draft')
        """, (campaign_id, company["id"], email["subject"], email["body"]))
        saved += 1

    conn.commit()
    conn.close()
    return saved


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "preview"

    emails, skipped = generate_all()

    if mode == "preview":
        # Show 3 samples
        for e in emails[:3]:
            print(f"\n=== {e['company']} ({e['segment']}, Tier {e['tier']}) ===")
            print(f"Subject: {e['subject']}")
            print(f"\n{e['body']}")
            print(f"\n[{e['word_count']} words]")
        print(f"\n--- Total: {len(emails)} emails ready, {len(skipped)} skipped ---")

    elif mode == "generate":
        saved = save_to_db(emails)
        result = {
            "generated": len(emails),
            "saved_to_db": saved,
            "skipped": len(skipped),
            "skipped_details": skipped[:10],
            "by_segment": {},
            "by_tier": {},
        }
        for e in emails:
            seg = e["segment"]
            tier = f"tier_{e['tier']}"
            result["by_segment"][seg] = result["by_segment"].get(seg, 0) + 1
            result["by_tier"][tier] = result["by_tier"].get(tier, 0) + 1

        print(json.dumps(result, indent=2))

    elif mode == "dump":
        # Dump all emails as JSON
        print(json.dumps(emails, indent=2))

    elif mode == "spot-check":
        # Show random samples for quality check
        import random
        samples = random.sample(emails, min(5, len(emails)))
        for e in samples:
            print(f"\n=== {e['company']} ({e['segment']}, Tier {e['tier']}) ===")
            print(f"Subject: {e['subject']}")
            print(f"\n{e['body']}")
            print(f"\n[{e['word_count']} words | violations: {e['violations']}]")
