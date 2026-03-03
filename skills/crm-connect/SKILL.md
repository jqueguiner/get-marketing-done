---
name: crm-connect
description: Import companies and contacts from HubSpot CRM into the GTM pipeline. Preview what would be imported, run full imports, and check import status.
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep
argument-hint: "[preview | import | status]"
---

# CRM Connect — HubSpot Import

Import your existing HubSpot CRM data directly into the GTM pipeline instead of re-discovering companies via scraping.

## Bootstrap (run first)

Run `node scripts/marketing-tools.js init` and parse the JSON. Check:
- `config.has_hubspot_token` — if false, guide the user through token setup (see Setup section below)
- Current pipeline counts — how many companies/contacts already exist

## Mode 1: Preview (`preview`)

Dry run showing what would be imported. No data is written.

1. Run: `python3 scripts/hubspot_importer.py preview`
2. Show the user:
   - Total companies and contacts in HubSpot
   - 5-record sample of each
   - Overlap with existing GTM database (how many already imported vs new)
3. Ask if they want to proceed with a full import

## Mode 2: Import (`import`)

Full import of companies and contacts from HubSpot.

### Step 1: Fetch companies

```
python3 scripts/hubspot_importer.py fetch-companies --output data/hubspot_companies.json
```

Optional filters (pass through from user):
- `--owner <owner_id>` — only companies owned by this HubSpot user
- `--since YYYY-MM-DD` — only companies created after this date
- `--property key=value` — filter by any HubSpot property (can repeat)

### Step 2: Load companies into GTM database

```
python3 scripts/db_manager.py add-companies --source hubspot --file data/hubspot_companies.json
```

Show the result: how many added, how many skipped (domain duplicates).

### Step 3: Fetch contacts

```
python3 scripts/hubspot_importer.py fetch-contacts --output data/hubspot_contacts.json
```

Same filters apply as for companies.

### Step 4: Load contacts into GTM database

```
python3 scripts/db_manager.py add-contacts --file data/hubspot_contacts.json
```

Show the result: how many added, how many skipped (email duplicates).

### Step 5: Advance state

```
node scripts/marketing-tools.js state-advance 1 "List Building (HubSpot import)"
```

Tell the user what's next: "Your HubSpot data is loaded. Run `/data-points-builder` to define enrichment datapoints, then `/table-enrichment` to fill them in."

## Mode 3: Status (`status`)

Check what's been imported from HubSpot.

1. Run: `python3 scripts/db_manager.py list-companies` and filter for `source = 'hubspot'`
2. Show:
   - Total companies imported from HubSpot
   - Total contacts imported from HubSpot
   - How many have been enriched
   - When the last import was run (from created_at timestamps)

## Setup (when token is missing)

If `has_hubspot_token` is false, walk the user through these steps:

### Step 1: Create a HubSpot Private App

1. Log into HubSpot at https://app.hubspot.com
2. Go to **Settings** (gear icon, top right)
3. In the left sidebar: **Integrations → Private Apps**
4. Click **Create a private app**
5. Give it a name (e.g. "GTM Pipeline Import")
6. Go to the **Scopes** tab and enable:
   - `crm.objects.companies.read`
   - `crm.objects.contacts.read`
7. Click **Create app** and confirm
8. Copy the access token shown (starts with `pat-na1-...`)

### Step 2: Save the token

Tell the user to pick one of these options:

**Option A — Save in config (recommended, persists across sessions):**
```
node scripts/marketing-tools.js config-set hubspot_access_token "pat-na1-your-token-here"
```

**Option B — Environment variable (temporary, current session only):**
```
export HUBSPOT_ACCESS_TOKEN="pat-na1-your-token-here"
```

### Step 3: Verify

After the user saves their token, run:
```
python3 scripts/hubspot_importer.py preview
```

If the token is valid, this will show a sample of their HubSpot data. If it fails with a 401 error, the token is invalid or expired — ask them to check and re-copy it.

Once verified, tell the user: "HubSpot is connected. Run `/crm-connect preview` to see your data, then `/crm-connect import` to pull it into the pipeline."

## Rules

- Always run `preview` before `import` so the user can see what they're getting
- Companies are deduplicated by domain — re-imports skip existing domains
- Contacts are deduplicated by email — re-imports skip existing emails
- The HubSpot importer uses only Python stdlib (no pip install needed)
- Rate limiting is built in (0.15s between requests, 429 retry)
