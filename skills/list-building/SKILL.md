---
name: list-building
description: Build prospect lists of 200-500 companies. Two modes — lookalike search from a successful case, or instant search for testing new verticals. Can re-run with refined datapoints from enrichment.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, Agent
argument-hint: "[lookalike <company_name> | search <criteria> | refine]"
---

# List Building

You build targeted prospect lists fast. 200 to 500 companies within seconds. Two modes based on hypothesis type.

## Read context first

Before anything, read `data/company_context.md` to understand:
- ICP definition (who to target)
- Anti-ICP (who to exclude)
- Win cases (what success looks like)
- Past campaigns (what's been tried)

If `data/company_context.md` doesn't exist, tell the user to run `/company-context-builder` first.

## Mode 1: Lookalike Search (`lookalike <company_name>`)

Use when: "I have a company similar to a successful case"

1. Ask the user which win case or reference company to base the search on
2. Extract the key attributes of that company:
   - Industry / sub-industry
   - Employee count range
   - Tech stack signals
   - Geography
   - Business model (B2B/B2C, SaaS/services, etc.)
   - Funding stage
3. Use WebSearch to find similar companies. Run multiple parallel searches:
   - `"{industry}" "{business_model}" companies {geography} site:crunchbase.com`
   - `"{industry}" startups {employee_range} employees`
   - `competitors of {reference_company}`
   - `"{sub_industry}" SaaS companies list {year}`
4. For each search, extract company names and domains
5. Deduplicate results
6. Store in SQLite: `python3 scripts/db_manager.py add-companies --source lookalike --reference {company_name} --file /tmp/companies_batch.json`
7. Present results as a table: Company | Domain | Industry | Size | Match Reason

## Mode 2: Instant Search (`search <criteria>`)

Use when: Testing demand in a completely new vertical

1. Ask the user for search parameters:
   - **Vertical/Industry**: What space are you testing?
   - **Company size**: Employee count or revenue range
   - **Geography**: Where?
   - **Signals**: Any specific criteria? (e.g., "recently raised Series A", "hiring for data engineers", "uses Snowflake")
   - **Exclusions**: Any companies or types to skip?
2. Run aggressive parallel web searches:
   - Industry directories and lists
   - Crunchbase / LinkedIn company search patterns
   - Industry-specific databases
   - "Top {industry} companies {year}" lists
   - Trade publication company mentions
3. For each company found, capture: name, domain, estimated size, location, brief description
4. Deduplicate and filter against Anti-ICP criteria
5. Store in SQLite: `python3 scripts/db_manager.py add-companies --source search --criteria "{criteria}" --file /tmp/companies_batch.json`
6. Present summary: total found, breakdown by sub-segment

## Mode 3: Refined Search (`refine`)

Use when: Re-running after enrichment revealed which datapoints matter most

1. Read existing companies from DB: `python3 scripts/db_manager.py list-companies --with-datapoints`
2. Ask the user which datapoints to use as search parameters
3. Build refined search queries using those specific signals
4. Run searches and add new companies, marking them as `source=refined`
5. Show what's new vs. what was already in the list

## Output format

Always save the list to `data/lists/{list_name}.csv` and to SQLite.

Write a batch JSON file for the DB manager:
```json
[
  {
    "name": "Acme Corp",
    "domain": "acme.com",
    "industry": "FinTech",
    "size": "50-200",
    "location": "San Francisco, CA",
    "source": "lookalike",
    "reference": "BigCorp",
    "match_reason": "Same vertical, similar size, B2B SaaS"
  }
]
```

Then run: `python3 scripts/db_manager.py add-companies --source {source} --file /tmp/companies_batch.json`

## Rules

- Always deduplicate against existing companies in the DB
- Never include companies matching Anti-ICP criteria
- Minimum 200, target 300-500 companies per run
- Track the source and hypothesis for every company added
- If web search yields too few results, tell the user and suggest broadening criteria
