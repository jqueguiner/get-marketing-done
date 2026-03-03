---
name: data-points-builder
description: Define company-level research datapoints for segmentation or personalization — CEO podcast appearances, recent product launches, hiring signals, tech stack, etc.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, Agent, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_snapshot, mcp__plugin_playwright_playwright__browser_click, mcp__plugin_playwright_playwright__browser_type, mcp__plugin_playwright_playwright__browser_evaluate, mcp__plugin_playwright_playwright__browser_wait_for, mcp__plugin_playwright_playwright__browser_take_screenshot, mcp__plugin_playwright_playwright__browser_tabs, mcp__plugin_playwright_playwright__browser_fill_form, mcp__plugin_playwright_playwright__browser_run_code
argument-hint: "[define | research <company> | bulk-research | show]"
---

# Data Points Builder

You create and populate company-specific research datapoints. These power both segmentation (grouping companies by shared traits) and personalization (tailoring emails per prospect).

## Bootstrap (run first)

Run `node scripts/marketing-tools.js init` and parse the JSON. This tells you:
- Whether a datapoint schema already exists (`has_schema`)
- Pipeline: how many companies exist, how many have datapoints
- Fill rates per datapoint (what's missing)
- Research files available (for informing which datapoints matter)

Then advance state: `node scripts/marketing-tools.js state-advance 3 "Data Points"`

For `bulk-research` mode, use **wave-based parallel execution**: spawn Agent subagents in batches of 10-20 companies. Each wave runs in parallel. Wait for a wave to complete before starting the next. Track progress with `node scripts/marketing-tools.js state-set companies_researched {N}`.

## Playwright MCP — when to use the browser

If the Playwright MCP is available, **use it as your primary research tool** for company-specific datapoints. This is where Playwright gives the biggest advantage over WebSearch/WebFetch — you're visiting specific pages and extracting structured data.

### Datapoint-specific Playwright patterns

**Careers/Hiring signals**:
1. `browser_navigate` to `{company_domain}/careers` or `{company_domain}/jobs`
2. `browser_snapshot` to get all open positions
3. Extract role titles, departments, seniority levels, locations
4. Count roles per department to identify priorities (hiring 5 engineers vs 1 = engineering is the priority)
5. If the careers page uses filters, use `browser_fill_form` to filter by department

**Product launches / What they shipped**:
1. `browser_navigate` to `{company_domain}/blog` or `{company_domain}/changelog`
2. `browser_snapshot` to get recent posts
3. Click into the most recent product announcement
4. Extract what was launched, when, and the language they use

**CEO/Leader podcast appearances**:
1. WebSearch `"{ceo_name}" podcast {year}` to find episodes
2. `browser_navigate` to the podcast episode page
3. `browser_snapshot` to get the episode description, topics discussed, key quotes

**Tech stack signals**:
1. `browser_navigate` to `{company_domain}`
2. `browser_evaluate` with `() => { const scripts = Array.from(document.querySelectorAll('script[src]')); return scripts.map(s => s.src); }` to detect loaded JS libraries
3. Check for common tool indicators: Segment, Mixpanel, Intercom, Drift, HubSpot, etc.
4. Also check BuiltWith or Wappalyzer pages for the domain

**Press/News**:
1. `browser_navigate` to `{company_domain}/press` or `{company_domain}/newsroom`
2. `browser_snapshot` for recent press releases and media coverage

**Company about page**:
1. `browser_navigate` to `{company_domain}/about`
2. `browser_snapshot` for team size, mission statement, office locations, founding year

### When to still use WebSearch

- Initial discovery of WHERE to find a datapoint (e.g., "which podcast was the CEO on?")
- Glassdoor reviews (search for them, then navigate with Playwright)
- Cross-referencing claims across multiple sources

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
2. For the given company, first get their domain from SQLite
3. **Use Playwright** to visit the company's website directly:
   - Careers page for hiring signals
   - Blog/changelog for product launches
   - About page for company info
   - Homepage for tech stack detection (via `browser_evaluate`)
4. **Use WebSearch** to find external sources (podcasts, press, reviews)
5. **Use Playwright** to read those external sources in full
6. For each datapoint, record:
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
