#!/usr/bin/env python3
"""
Email assembler — generates emails from templates + enriched company data.
Strict formula-based assembly. No freestyling.
"""

import json
import sys
import re
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "gtm.db"
TEMPLATES_DIR = Path(__file__).parent.parent / "data" / "templates"


FORBIDDEN_WORDS = [
    "just following up", "hope this finds you", "i'd love to",
    "circle back", "synergy", "leverage", "touch base",
    "reaching out", "pick your brain", "low-hanging fruit",
    "move the needle", "paradigm shift", "thought leader",
    "at the end of the day", "deep dive", "bandwidth",
]


def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def load_template(template_name):
    """Load an email template."""
    template_path = TEMPLATES_DIR / f"{template_name}.json"
    if not template_path.exists():
        # Try finding it
        templates = list(TEMPLATES_DIR.glob("*.json"))
        if templates:
            print(f"Template '{template_name}' not found. Available: {[t.stem for t in templates]}", file=sys.stderr)
        else:
            print(f"No templates found in {TEMPLATES_DIR}", file=sys.stderr)
        sys.exit(1)

    with open(template_path) as f:
        return json.load(f)


def load_company_data(company_name):
    """Load company + datapoints from SQLite."""
    conn = get_db()
    company = conn.execute("SELECT * FROM companies WHERE name LIKE ?", (f"%{company_name}%",)).fetchone()
    if not company:
        print(json.dumps({"error": f"Company '{company_name}' not found"}))
        sys.exit(1)

    datapoints = conn.execute("SELECT * FROM datapoints WHERE company_id = ?", (company["id"],)).fetchall()
    contacts = conn.execute("SELECT * FROM contacts WHERE company_id = ?", (company["id"],)).fetchall()
    conn.close()

    return {
        "company": dict(company),
        "datapoints": {dp["schema_name"]: dict(dp) for dp in datapoints},
        "contacts": [dict(c) for c in contacts],
    }


def check_forbidden(text):
    """Check for forbidden words/phrases."""
    violations = []
    text_lower = text.lower()
    for word in FORBIDDEN_WORDS:
        if word in text_lower:
            violations.append(word)
    return violations


def count_words(text):
    """Count words in text."""
    return len(text.split())


def fill_template_vars(text, data):
    """Replace {variable} placeholders with actual data."""
    company = data["company"]
    datapoints = data["datapoints"]

    # Replace company fields
    for key, value in company.items():
        text = text.replace(f"{{company.{key}}}", str(value or ""))
        text = text.replace(f"{{{key}}}", str(value or ""))

    # Replace datapoint fields
    for dp_name, dp in datapoints.items():
        text = text.replace(f"{{datapoint.{dp_name}}}", str(dp.get("value", "")))
        text = text.replace(f"{{{dp_name}}}", str(dp.get("value", "")))

    # Replace contact fields
    if data["contacts"]:
        contact = data["contacts"][0]
        for key, value in contact.items():
            text = text.replace(f"{{contact.{key}}}", str(value or ""))

    return text


def generate_email(template_name, company_name):
    """Generate a single email from template + company data."""
    template = load_template(template_name)
    data = load_company_data(company_name)

    # Check which datapoints are available
    available_dps = set(data["datapoints"].keys())
    missing_dps = []

    result = {
        "company": company_name,
        "domain": data["company"].get("domain", ""),
        "template": template_name,
    }

    # Generate subject
    subject_formula = template.get("subject", {}).get("formula", "")
    result["subject"] = fill_template_vars(subject_formula, data)

    # Generate body sections
    body_parts = []
    body_config = template.get("body", {})
    for section_name in ["opening", "problem", "bridge", "value_prop", "cta"]:
        section = body_config.get(section_name, {})
        if not section:
            continue

        instruction = section.get("instruction", "")
        formula = section.get("formula", instruction)
        filled = fill_template_vars(formula, data)
        body_parts.append(filled)

    result["body"] = "\n\n".join(body_parts)
    result["sections"] = body_config

    # Validation
    violations = check_forbidden(result["body"] + " " + result["subject"])
    word_count = count_words(result["body"])
    max_words = template.get("constraints", {}).get("max_total_words", 100)

    result["validation"] = {
        "word_count": word_count,
        "max_words": max_words,
        "over_limit": word_count > max_words,
        "forbidden_words_found": violations,
        "missing_datapoints": missing_dps,
        "has_unfilled_vars": bool(re.findall(r'\{[^}]+\}', result["body"] + result["subject"])),
    }

    result["constraints"] = template.get("constraints", {})
    print(json.dumps(result, indent=2, default=str))


def bulk_generate(template_name, segment=None, campaign=None):
    """Generate emails for all companies in a segment or campaign."""
    template = load_template(template_name)
    conn = get_db()

    if segment:
        companies = conn.execute("""
            SELECT c.* FROM companies c
            JOIN company_segments cs ON c.id = cs.company_id
            JOIN segments s ON cs.segment_id = s.id
            WHERE s.name = ?
        """, (segment,)).fetchall()
    elif campaign:
        companies = conn.execute("SELECT * FROM companies WHERE campaign = ?", (campaign,)).fetchall()
    else:
        companies = conn.execute("SELECT * FROM companies").fetchall()

    conn.close()

    results = {"generated": 0, "skipped": 0, "errors": [], "emails": []}

    for company in companies:
        try:
            data = load_company_data(company["name"])

            # Check if we have minimum required datapoints
            if not data["datapoints"]:
                results["skipped"] += 1
                results["errors"].append({"company": company["name"], "reason": "no datapoints"})
                continue

            subject_formula = template.get("subject", {}).get("formula", "")
            subject = fill_template_vars(subject_formula, data)

            body_parts = []
            body_config = template.get("body", {})
            for section_name in ["opening", "problem", "bridge", "value_prop", "cta"]:
                section = body_config.get(section_name, {})
                if not section:
                    continue
                instruction = section.get("instruction", section.get("formula", ""))
                filled = fill_template_vars(instruction, data)
                body_parts.append(filled)

            body = "\n\n".join(body_parts)

            violations = check_forbidden(body + " " + subject)
            if violations:
                results["errors"].append({"company": company["name"], "reason": f"forbidden words: {violations}"})

            results["emails"].append({
                "company": company["name"],
                "domain": company["domain"],
                "subject": subject,
                "body": body,
                "contact_email": data["contacts"][0]["email"] if data["contacts"] else None,
                "word_count": count_words(body),
            })
            results["generated"] += 1

        except Exception as e:
            results["skipped"] += 1
            results["errors"].append({"company": company["name"], "reason": str(e)})

    print(json.dumps(results, indent=2, default=str))


def list_templates():
    """List available templates."""
    templates = list(TEMPLATES_DIR.glob("*.json"))
    result = []
    for t in templates:
        with open(t) as f:
            data = json.load(f)
        result.append({"name": t.stem, "created": data.get("created", ""), "constraints": data.get("constraints", {})})
    print(json.dumps(result, indent=2))


COMMANDS = {
    "generate": lambda args: generate_email(
        template_name=args.get("--template", ""),
        company_name=args.get("--company", "")
    ),
    "bulk-generate": lambda args: bulk_generate(
        template_name=args.get("--template", ""),
        segment=args.get("--segment"),
        campaign=args.get("--campaign")
    ),
    "list-templates": lambda args: list_templates(),
}


def parse_args(argv):
    if len(argv) < 2:
        print("Usage: email_assembler.py <command> [--key value ...]")
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
