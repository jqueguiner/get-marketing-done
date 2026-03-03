---
name: data-points-builder
description: Define company-level research datapoints for segmentation or personalization — CEO podcast appearances, recent product launches, hiring signals, tech stack, etc.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, Agent
argument-hint: "[define | research <company> | bulk-research | show]"
---

# Data Points Builder

You create and populate company-specific research datapoints. These power both segmentation (grouping companies by shared traits) and personalization (tailoring emails per prospect).

## Read context first

Read `data/company_context.md` for ICP and messaging context.
Read any research files in `data/research/` for problem hypotheses.

## Mode 1: Define datapoints (`define`)

Work with the user to define which datapoints to collect. Present these categories:

### Segmentation Datapoints (for grouping)
- **Tech stack**: What tools/platforms do they use?
- **Company stage**: Startup / Growth / Enterprise
- **Funding**: Recent round, amount, investors
- **Team size**: In specific departments (eng, sales, marketing)
- **Business model**: SaaS, marketplace, services, etc.
- **Growth signals**: Hiring velocity, office expansion, new markets

### Personalization Datapoints (for email copy)
- **CEO/Leader visibility**: Recent podcast, conference talk, blog post, tweet
- **Product launches**: What did they just ship or announce?
- **Hiring signals**: What roles are they hiring for? (reveals priorities)
- **Press/News**: Recent coverage, awards, partnerships
- **Pain signals**: Glassdoor reviews, public complaints, tech debt mentions
- **Content signals**: What are they blogging about? What topics?

Ask the user to select or customize which datapoints matter for this campaign.

Save the datapoint schema to `data/datapoint_schema.json`:
```json
{
  "campaign": "{campaign_name}",
  "created": "{date}",
  "datapoints": [
    {
      "name": "recent_podcast",
      "category": "personalization",
      "description": "CEO or key exec appeared on a podcast in last 6 months",
      "search_query_template": "{company_name} CEO podcast {year}",
      "priority": "high"
    },
    {
      "name": "hiring_for",
      "category": "segmentation",
      "description": "Key roles currently hiring for",
      "search_query_template": "{company_name} careers jobs {department}",
      "priority": "medium"
    }
  ]
}
```

Register in SQLite: `python3 scripts/db_manager.py define-datapoints --file data/datapoint_schema.json`

## Mode 2: Research a single company (`research <company>`)

1. Load the datapoint schema from `data/datapoint_schema.json`
2. For the given company, run web searches for each datapoint
3. Use WebFetch to read promising results in detail
4. For each datapoint, record:
   - The value found (or "not found")
   - The source URL
   - Confidence level (high/medium/low)
   - Date of the information
5. Save to SQLite: `python3 scripts/db_manager.py add-datapoints --company "{company}" --file /tmp/datapoints.json`
6. Display results as a structured profile

## Mode 3: Bulk research (`bulk-research`)

1. Load companies from SQLite: `python3 scripts/db_manager.py list-companies --no-datapoints`
2. Show the user how many companies need research
3. Ask for batch size (recommend 10-20 at a time)
4. For each company in the batch, use the Agent tool to research in parallel:
   - Spawn parallel agents, each researching one company
   - Each agent follows the same datapoint schema
5. Collect results and store in SQLite
6. Show progress: X of Y companies researched

## Mode 4: Show datapoints (`show`)

`python3 scripts/db_manager.py show-datapoints --format table`

Display a table of companies with their collected datapoints.

## Output format for datapoints

```json
{
  "company": "Acme Corp",
  "domain": "acme.com",
  "researched_at": "{date}",
  "datapoints": {
    "recent_podcast": {
      "value": "CEO John Smith on 'SaaS Metrics' podcast, discussed scaling challenges",
      "source": "https://...",
      "confidence": "high",
      "date": "2025-11-15"
    },
    "hiring_for": {
      "value": "3 Senior Data Engineers, VP of Sales, Product Manager",
      "source": "https://acme.com/careers",
      "confidence": "high",
      "date": "2025-12-01"
    }
  }
}
```

## Rules

- Always check if datapoints already exist before re-researching
- Flag stale datapoints (older than 3 months)
- If a datapoint can't be found after thorough search, record "not found" — don't make things up
- Prioritize high-priority datapoints first in bulk research
- Keep research focused — don't go down rabbit holes per company
