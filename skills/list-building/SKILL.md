---
name: list-building
description: Build prospect lists of 200-500 companies. Two modes — lookalike search from a successful case, or instant search for testing new verticals. Can re-run with refined datapoints from enrichment.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, Agent, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_snapshot, mcp__plugin_playwright_playwright__browser_click, mcp__plugin_playwright_playwright__browser_type, mcp__plugin_playwright_playwright__browser_evaluate, mcp__plugin_playwright_playwright__browser_wait_for, mcp__plugin_playwright_playwright__browser_take_screenshot, mcp__plugin_playwright_playwright__browser_tabs, mcp__plugin_playwright_playwright__browser_press_key, mcp__plugin_playwright_playwright__browser_fill_form, mcp__plugin_playwright_playwright__browser_run_code
argument-hint: "[lookalike <company_name> | search <criteria> | refine]"
---

# List Building

You build targeted prospect lists fast. 200 to 500 companies within seconds. Two modes based on hypothesis type.

## Bootstrap (run first)

Run `node scripts/marketing-tools.js init` and parse the JSON. This tells you:
- Whether context exists (`has_context`) — **if false, stop and tell user to run `/company-context-builder` first**
- Current pipeline counts (how many companies already exist)
- Quality gates: `config.quality_gates.require_context_before_lists`
- Available research files and segments

Then advance state: `node scripts/marketing-tools.js state-advance 1 "List Building"`

## Playwright MCP — when to use the browser

If the Playwright MCP is available, **prefer it over WebFetch** for scraping structured company data from websites. Use the browser when:

- **Scraping directory pages**: Navigate to Crunchbase, G2, Clutch, ProductHunt, BuiltWith, etc. and extract company lists directly from the page DOM
- **Paginated results**: Use `browser_click` to paginate through result pages and collect all entries
- **JS-heavy sites**: Many directories render company lists client-side — WebFetch returns empty HTML, Playwright renders the full page
- **Filtering on-site**: Use `browser_fill_form` to apply filters (industry, size, location) directly on directory search forms before scraping
- **LinkedIn company search**: Navigate to LinkedIn search, apply filters, snapshot results

### Playwright scraping pattern

1. `browser_navigate` to the directory URL
2. `browser_snapshot` to get the accessibility tree — this is your structured data source
3. Parse company names, domains, descriptions from the snapshot
4. If paginated: `browser_click` the next page link, `browser_wait_for` the new content, `browser_snapshot` again
5. Repeat until you have enough companies or pages are exhausted
6. For each company, `browser_navigate` to their profile page on the directory to grab size, industry, location
7. Fall back to `WebSearch` for directories you can't navigate or when Playwright is unavailable

### When to still use WebSearch

- Initial discovery: finding WHICH directories and lists exist for an industry
- Broad queries like "competitors of X" or "top {industry} companies"
- When you need many parallel searches fast (Playwright is single-threaded)

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
3. **Start with WebSearch** to find similar companies and discover relevant directories:
   - `"{industry}" "{business_model}" companies {geography} site:crunchbase.com`
   - `"{industry}" startups {employee_range} employees`
   - `competitors of {reference_company}`
   - `"{sub_industry}" SaaS companies list {year}`
4. **Then use Playwright** to scrape the most promising directory pages:
   - Navigate to Crunchbase/G2/ProductHunt search results for the industry
   - Apply filters matching the reference company's attributes
   - Paginate through results extracting company names, domains, and metadata
   - Visit individual company profile pages for size/location/description
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
2. **Use WebSearch** to discover relevant directories and initial company lists
3. **Use Playwright** to scrape those directories at scale:
   - Navigate to each directory URL
   - Apply search filters using `browser_fill_form` (industry, size, location)
   - `browser_snapshot` to extract structured company data from results
   - Paginate through all result pages
   - For enriching each found company: visit their profile page on the directory
4. For each company found, capture: name, domain, estimated size, location, brief description
5. Deduplicate and filter against Anti-ICP criteria
6. Store in SQLite: `python3 scripts/db_manager.py add-companies --source search --criteria "{criteria}" --file /tmp/companies_batch.json`
7. Present summary: total found, breakdown by sub-segment

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
