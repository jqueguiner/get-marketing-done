---
name: table-enrichment
description: Run enrichment through Extruct or deep research providers. SQLite tracks progress and quality. Monitor enrichment status and validate data quality.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, Agent, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_snapshot, mcp__plugin_playwright_playwright__browser_click, mcp__plugin_playwright_playwright__browser_evaluate, mcp__plugin_playwright_playwright__browser_wait_for, mcp__plugin_playwright_playwright__browser_take_screenshot, mcp__plugin_playwright_playwright__browser_run_code
argument-hint: "[run <campaign> | status | validate | export]"
---

# Table Enrichment

You orchestrate data enrichment — filling in missing datapoints using Extruct or deep research. SQLite is the backbone for tracking progress and quality.

## Bootstrap (run first)

Run `node scripts/marketing-tools.js init-enrichment "$ARGUMENTS"` and parse the JSON. This tells you:
- Unenriched companies count, stale data count, low-confidence count
- Recommended batch size
- Which providers are available (Extruct, Playwright, web research)
- Fill rates per datapoint
- Config: `workflow.enrichment_validation`, `workflow.min_enrichment_rate`

Then advance state: `node scripts/marketing-tools.js state-advance 4 "Enrichment"`

Use **wave-based parallel execution** for bulk enrichment: group companies into waves of `recommended_batch_size`. Run each wave's companies in parallel via Agent subagents. After each wave, run `python3 scripts/db_manager.py enrichment-status` and check against `min_enrichment_rate`. Stop when the threshold is met or all companies are enriched.

## Playwright MCP — browser-based enrichment

If the Playwright MCP is available, you have a third enrichment option beyond Extruct and agent-based research: **direct website scraping**.

### Option D: Playwright scraping enrichment

For datapoints that live on company websites (careers, about pages, blog, tech stack), Playwright is faster and more reliable than WebSearch + WebFetch:

1. Load the list of companies needing enrichment
2. For each company domain, run a Playwright scraping sequence:
   - `browser_navigate` to `https://{domain}/careers` → extract hiring signals
   - `browser_navigate` to `https://{domain}/about` → extract company size, leadership, locations
   - `browser_navigate` to `https://{domain}/blog` → extract recent posts, topics
   - `browser_navigate` to `https://{domain}` → `browser_evaluate` to detect tech stack from loaded scripts
3. Save each scraped datapoint with `enrichment_source = "playwright"` and `confidence = "high"` (direct from source)

### When to combine approaches

- **Extruct** for structured business data (firmographics, contact info, social profiles)
- **Playwright** for website-sourced data (careers, blog, tech stack, about page)
- **Agent deep research** for external data (podcasts, press coverage, Glassdoor)

The best enrichment runs use all three in a single pass.

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

### Option D: Playwright scraping (if available)
For datapoints sourced from company websites — see Playwright MCP section above. Best for: careers/hiring, blog/changelog, about page, tech stack detection. Produces high-confidence data because it's scraped directly from the source.

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
