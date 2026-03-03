#!/usr/bin/env python3
"""
HubSpot CRM importer for the GTM pipeline.

Imports companies and contacts from HubSpot into the GTM system's
batch JSON format, ready for db_manager.py add-companies / add-contacts.

Uses stdlib only (urllib.request) — zero external dependencies.

Usage:
    python3 scripts/hubspot_importer.py preview
    python3 scripts/hubspot_importer.py fetch-companies [--owner X] [--since YYYY-MM-DD] [--property key=value] --output path.json
    python3 scripts/hubspot_importer.py fetch-contacts  [--owner X] [--since YYYY-MM-DD] [--property key=value] --output path.json
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path

# ─── Config ───

ROOT = Path(__file__).parent.parent
CONFIG_PATH = ROOT / "config.json"


def load_token():
    """Load HubSpot access token from config or env."""
    token = os.environ.get("HUBSPOT_ACCESS_TOKEN", "")
    if not token:
        try:
            config = json.loads(CONFIG_PATH.read_text())
            token = config.get("hubspot_access_token", "")
        except (FileNotFoundError, json.JSONDecodeError):
            pass
    return token


def print_setup_instructions():
    print("""
HubSpot access token not found.

Setup:
  1. Go to HubSpot → Settings → Integrations → Private Apps
  2. Create a private app with scopes:
     - crm.objects.companies.read
     - crm.objects.contacts.read
  3. Copy the access token, then either:

     a) Set environment variable:
        export HUBSPOT_ACCESS_TOKEN="pat-na1-..."

     b) Add to config.json:
        Edit config.json and set "hubspot_access_token"
""".strip())


# ─── HubSpot API ───

HUBSPOT_BASE = "https://api.hubapi.com"

COMPANY_PROPERTIES = [
    "name", "domain", "industry", "numberofemployees",
    "city", "state", "country", "type", "hs_object_id",
]

CONTACT_PROPERTIES = [
    "firstname", "lastname", "email", "jobtitle",
    "hs_linkedin_url", "associatedcompanyid",
]


def api_request(token, endpoint, method="GET", data=None):
    """Make an authenticated HubSpot API request with rate-limit handling."""
    url = HUBSPOT_BASE + endpoint
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    if data is not None:
        body = json.dumps(data).encode("utf-8")
    else:
        body = None

    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    max_retries = 3
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429:
                retry_after = int(e.headers.get("Retry-After", "10"))
                print(f"  Rate limited, waiting {retry_after}s...", file=sys.stderr)
                time.sleep(retry_after)
                continue
            elif e.code == 401:
                print("Error: Invalid or expired HubSpot access token.", file=sys.stderr)
                sys.exit(1)
            else:
                body_text = e.read().decode("utf-8", errors="replace")
                print(f"Error: HubSpot API returned {e.code}: {body_text}", file=sys.stderr)
                sys.exit(1)
        except urllib.error.URLError as e:
            print(f"Error: Could not connect to HubSpot API: {e.reason}", file=sys.stderr)
            sys.exit(1)

    print("Error: Max retries exceeded for rate limiting.", file=sys.stderr)
    sys.exit(1)


# ─── Field Mapping ───

def map_employee_count_to_range(count):
    """Map numeric employee count to the size ranges used by the GTM system."""
    if count is None:
        return ""
    try:
        n = int(count)
    except (ValueError, TypeError):
        return str(count)

    if n <= 10:
        return "1-10"
    elif n <= 50:
        return "11-50"
    elif n <= 200:
        return "51-200"
    elif n <= 500:
        return "201-500"
    elif n <= 1000:
        return "501-1000"
    elif n <= 5000:
        return "1001-5000"
    elif n <= 10000:
        return "5001-10000"
    else:
        return "10000+"


def build_location(props):
    """Build location string from city, state, country."""
    parts = []
    for key in ("city", "state", "country"):
        val = props.get(key)
        if val:
            parts.append(val)
    return ", ".join(parts)


def map_company(props):
    """Map HubSpot company properties to GTM batch format."""
    return {
        "name": props.get("name", ""),
        "domain": props.get("domain", ""),
        "industry": props.get("industry", ""),
        "size": map_employee_count_to_range(props.get("numberofemployees")),
        "location": build_location(props),
        "business_model": props.get("type", ""),
        "source": "hubspot",
        "source_reference": props.get("hs_object_id", ""),
    }


def map_contact(props, company_domain=""):
    """Map HubSpot contact properties to GTM batch format."""
    first = props.get("firstname", "") or ""
    last = props.get("lastname", "") or ""
    name = f"{first} {last}".strip()
    return {
        "name": name,
        "first_name": first,
        "last_name": last,
        "email": props.get("email", ""),
        "title": props.get("jobtitle", ""),
        "linkedin_url": props.get("hs_linkedin_url", ""),
        "domain": company_domain,
        "source": "hubspot",
    }


# ─── Pagination Helpers ───

def fetch_all_list(token, object_type, properties):
    """Fetch all objects using the list API (no filters). Paginates via 'after' cursor."""
    results = []
    props_param = "&".join(f"properties={p}" for p in properties)
    after = ""

    while True:
        endpoint = f"/crm/v3/objects/{object_type}?limit=100&{props_param}"
        if after:
            endpoint += f"&after={after}"

        data = api_request(token, endpoint)
        for item in data.get("results", []):
            results.append(item.get("properties", {}))

        paging = data.get("paging", {})
        next_page = paging.get("next", {})
        after = next_page.get("after", "")
        if not after:
            break

        time.sleep(0.15)

    return results


def fetch_all_search(token, object_type, properties, filters):
    """Fetch objects using the search API (with filters). Paginates via 'after' cursor."""
    results = []
    after = 0

    while True:
        body = {
            "filterGroups": [{"filters": filters}],
            "properties": properties,
            "limit": 100,
            "after": after,
        }

        data = api_request(token, f"/crm/v3/objects/{object_type}/search", method="POST", data=body)
        for item in data.get("results", []):
            results.append(item.get("properties", {}))

        total = data.get("total", 0)
        after += 100
        if after >= total:
            break

        time.sleep(0.15)

    return results


def build_filters(args):
    """Build HubSpot filter list from CLI args."""
    filters = []

    owner = args.get("--owner")
    if owner:
        filters.append({
            "propertyName": "hubspot_owner_id",
            "operator": "EQ",
            "value": owner,
        })

    since = args.get("--since")
    if since:
        filters.append({
            "propertyName": "createdate",
            "operator": "GTE",
            "value": since + "T00:00:00.000Z",
        })

    # Collect all --property key=value pairs
    prop_filters = args.get("--property", [])
    if isinstance(prop_filters, str):
        prop_filters = [prop_filters]
    for pf in prop_filters:
        if "=" in pf:
            key, val = pf.split("=", 1)
            filters.append({
                "propertyName": key,
                "operator": "EQ",
                "value": val,
            })

    return filters


# ─── Company domain cache for contact→company linking ───

_company_domain_cache = {}


def resolve_company_domain(token, company_id):
    """Resolve a HubSpot company ID to its domain. Caches results."""
    if not company_id:
        return ""
    if company_id in _company_domain_cache:
        return _company_domain_cache[company_id]

    try:
        data = api_request(token, f"/crm/v3/objects/companies/{company_id}?properties=domain")
        domain = data.get("properties", {}).get("domain", "")
    except SystemExit:
        domain = ""

    _company_domain_cache[company_id] = domain
    time.sleep(0.15)
    return domain


# ─── Commands ───

def cmd_preview(token):
    """Dry run — show sample records and overlap stats."""
    print("Fetching sample from HubSpot...\n")

    # Fetch a small sample of companies
    companies_raw = fetch_all_list(token, "companies", COMPANY_PROPERTIES)
    total_companies = len(companies_raw)

    sample_companies = [map_company(c) for c in companies_raw[:5]]

    print(f"Companies in HubSpot: {total_companies}")
    print(f"\nSample companies (first 5):")
    print("-" * 60)
    for c in sample_companies:
        print(f"  {c['name']:<30} {c['domain']:<25} {c['size']}")
    print()

    # Fetch a small sample of contacts
    contacts_raw = fetch_all_list(token, "contacts", CONTACT_PROPERTIES)
    total_contacts = len(contacts_raw)

    sample_contacts = [map_contact(c) for c in contacts_raw[:5]]

    print(f"Contacts in HubSpot: {total_contacts}")
    print(f"\nSample contacts (first 5):")
    print("-" * 60)
    for c in sample_contacts:
        print(f"  {c['name']:<30} {c['email']:<30} {c['title']}")
    print()

    # Check for overlap with existing DB
    db_path = ROOT / "data" / "gtm.db"
    if db_path.exists():
        try:
            import sqlite3
            conn = sqlite3.connect(str(db_path))
            existing_domains = {row[0] for row in conn.execute("SELECT domain FROM companies WHERE domain IS NOT NULL AND domain != ''").fetchall()}
            conn.close()

            hubspot_domains = {c.get("domain", "") for c in companies_raw if c.get("domain")}
            overlap = hubspot_domains & existing_domains
            new_domains = hubspot_domains - existing_domains

            print(f"Overlap check:")
            print(f"  Already in GTM DB:  {len(overlap)} companies")
            print(f"  New (would import): {len(new_domains)} companies")
        except Exception as e:
            print(f"  Could not check DB overlap: {e}")
    else:
        print("No existing GTM database found — all records would be new.")

    print(f"\nTo import, run:")
    print(f"  python3 scripts/hubspot_importer.py fetch-companies --output data/hubspot_companies.json")
    print(f"  python3 scripts/hubspot_importer.py fetch-contacts --output data/hubspot_contacts.json")


def cmd_fetch_companies(token, args):
    """Fetch companies from HubSpot and write batch JSON."""
    output = args.get("--output")
    if not output:
        print("Error: --output path is required", file=sys.stderr)
        sys.exit(1)

    filters = build_filters(args)

    print(f"Fetching companies from HubSpot...", file=sys.stderr)
    if filters:
        print(f"  Filters: {json.dumps(filters)}", file=sys.stderr)
        raw = fetch_all_search(token, "companies", COMPANY_PROPERTIES, filters)
    else:
        raw = fetch_all_list(token, "companies", COMPANY_PROPERTIES)

    companies = [map_company(c) for c in raw]

    # Filter out empty-name companies
    companies = [c for c in companies if c["name"]]

    output_path = Path(output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(companies, indent=2))

    print(json.dumps({
        "fetched": len(companies),
        "output": str(output_path),
        "source": "hubspot",
    }))


def cmd_fetch_contacts(token, args):
    """Fetch contacts from HubSpot, resolve company domains, write batch JSON."""
    output = args.get("--output")
    if not output:
        print("Error: --output path is required", file=sys.stderr)
        sys.exit(1)

    filters = build_filters(args)

    print(f"Fetching contacts from HubSpot...", file=sys.stderr)
    if filters:
        print(f"  Filters: {json.dumps(filters)}", file=sys.stderr)
        raw = fetch_all_search(token, "contacts", CONTACT_PROPERTIES, filters)
    else:
        raw = fetch_all_list(token, "contacts", CONTACT_PROPERTIES)

    print(f"  Resolving company associations...", file=sys.stderr)
    contacts = []
    seen_company_ids = set()
    for c in raw:
        company_id = c.get("associatedcompanyid", "")
        domain = ""
        if company_id:
            domain = resolve_company_domain(token, company_id)
        contacts.append(map_contact(c, company_domain=domain))

    # Filter out contacts with no name and no email
    contacts = [c for c in contacts if c["name"] or c["email"]]

    output_path = Path(output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(contacts, indent=2))

    print(json.dumps({
        "fetched": len(contacts),
        "output": str(output_path),
        "source": "hubspot",
    }))


# ─── CLI ───

def parse_args(argv):
    """Parse CLI arguments into command and args dict."""
    if len(argv) < 2:
        return None, {}

    command = argv[1]
    args = {}
    i = 2
    while i < len(argv):
        if argv[i].startswith("--"):
            key = argv[i]
            if key == "--property":
                # Collect multiple --property flags
                if i + 1 < len(argv) and not argv[i + 1].startswith("--"):
                    if key not in args:
                        args[key] = []
                    args[key].append(argv[i + 1])
                    i += 2
                else:
                    i += 1
            elif i + 1 < len(argv) and not argv[i + 1].startswith("--"):
                args[key] = argv[i + 1]
                i += 2
            else:
                args[key] = True
                i += 1
        else:
            i += 1

    return command, args


def main():
    command, args = parse_args(sys.argv)

    if not command:
        print(__doc__.strip())
        sys.exit(0)

    token = load_token()

    if not token:
        print_setup_instructions()
        sys.exit(1)

    if command == "preview":
        cmd_preview(token)
    elif command == "fetch-companies":
        cmd_fetch_companies(token, args)
    elif command == "fetch-contacts":
        cmd_fetch_contacts(token, args)
    else:
        print(f"Unknown command: {command}")
        print("Available: preview, fetch-companies, fetch-contacts")
        sys.exit(1)


if __name__ == "__main__":
    main()
