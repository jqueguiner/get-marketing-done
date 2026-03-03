---
name: table-enrichment
description: Run enrichment through Extruct or deep research providers. SQLite tracks progress and quality. Monitor enrichment status and validate data quality.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, Agent
argument-hint: "[run <campaign> | status | validate | export]"
---

# Table Enrichment

You orchestrate data enrichment — filling in missing datapoints using Extruct or deep research. SQLite is the backbone for tracking progress and quality.

## Read context first

Read `data/company_context.md` and `data/datapoint_schema.json`.

## Mode 1: Run enrichment (`run <campaign>`)

1. Load companies and their current datapoint status:
   `python3 scripts/db_manager.py enrichment-status --campaign {campaign}`
2. Show the user a summary:
   - Total companies
   - Datapoints defined vs. filled
   - Fill rate per datapoint
   - Companies with zero datapoints
3. Ask the user which enrichment approach:

### Option A: Extruct API enrichment
If the user has Extruct configured:
```bash
python3 scripts/enrichment_runner.py run \
  --campaign {campaign} \
  --provider extruct \
  --batch-size 50 \
  --datapoints "{datapoint_list}"
```
Monitor progress: `python3 scripts/enrichment_runner.py status --campaign {campaign}`

### Option B: Deep research enrichment
For datapoints that need web research:
- Use Agent tool to spawn parallel research agents
- Each agent researches a batch of companies for specific datapoints
- Results feed back into SQLite

### Option C: Hybrid
Run Extruct for structured data (company size, industry, tech stack) and deep research for unstructured data (podcasts, news, hiring).

4. After enrichment, run validation: `python3 scripts/db_manager.py validate-enrichment --campaign {campaign}`
5. Show results: what was found, what's still missing, quality flags

## Mode 2: Check status (`status`)

```bash
python3 scripts/db_manager.py enrichment-status
```

Show a dashboard:
```
Campaign: {name}
Total Companies: 347
Enrichment Progress:
  ████████████░░░░░░░░  62% (215/347)

Per-Datapoint Fill Rate:
  company_size:    ██████████████████░░  89%
  tech_stack:      ████████████████░░░░  78%
  recent_podcast:  ██████░░░░░░░░░░░░░░  34%
  hiring_signals:  ████████████░░░░░░░░  58%
  ceo_linkedin:    ████░░░░░░░░░░░░░░░░  22%

Quality Flags:
  - 12 companies with stale data (>90 days)
  - 8 companies with low-confidence datapoints
  - 3 companies with conflicting information
```

## Mode 3: Validate data (`validate`)

```bash
python3 scripts/db_manager.py validate-enrichment --campaign {campaign} --strict
```

Check for:
- **Completeness**: Are all required datapoints filled?
- **Freshness**: Is data recent enough?
- **Consistency**: Do datapoints contradict each other?
- **Quality**: Are values meaningful or just filler?

Flag issues and present them to the user for manual review.

## Mode 4: Export enriched data (`export`)

```bash
python3 scripts/db_manager.py export --campaign {campaign} --format csv --output data/enriched/{campaign}_enriched.csv
```

Also supports JSON export for downstream processing.

## SQLite schema for enrichment tracking

The DB manager tracks:
- Which companies have been enriched
- Which datapoints are filled vs. missing
- Enrichment source (Extruct, web research, manual)
- Confidence scores
- Timestamps for freshness tracking
- Quality flags

## Rules

- Always show progress before starting a new enrichment run
- Never overwrite higher-confidence data with lower-confidence data
- Track the source of every enriched datapoint
- Warn the user if enrichment costs are high (Extruct API calls)
- After enrichment, suggest re-running `/list-building refine` if new patterns emerge
