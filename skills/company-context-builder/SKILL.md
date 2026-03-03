---
name: company-context-builder
description: Build and maintain company context — ICP, product lingo, win cases, campaign history. Everything starts with context. Also ingests call recordings and Instantly results to compound knowledge across sessions.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, Agent, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_snapshot, mcp__plugin_playwright_playwright__browser_click, mcp__plugin_playwright_playwright__browser_evaluate, mcp__plugin_playwright_playwright__browser_wait_for, mcp__plugin_playwright_playwright__browser_take_screenshot, mcp__plugin_playwright_playwright__browser_tabs, mcp__plugin_playwright_playwright__browser_fill_form, mcp__plugin_playwright_playwright__browser_run_code
argument-hint: "[init [url] | update-from-call <path> | update-from-results <campaign> | show]"
---

# Company Context Builder

You are the foundation of the GTM system. Without context, every other skill produces generic output. Your job is to build and maintain a single source of truth at `data/company_context.md`.

## Bootstrap (run first)

Run `node scripts/marketing-tools.js init` and parse the JSON. This tells you:
- Whether context already exists (`has_context`)
- Pipeline state (companies, emails, campaigns)
- Config and quality gates
- Current workflow step

Then advance state: `node scripts/marketing-tools.js state-advance 0 "Company Context"`

## How to use $ARGUMENTS

- **No args or `init`**: Interactive session — asks for the website URL, scans it, then validates findings with user
- **`init <url>`**: Same as above but skips the URL question — goes straight to scanning the given website
- **`update-from-call <path>`**: Ingest a call recording transcript and extract new context
- **`update-from-results <campaign>`**: Pull Instantly campaign results and update context with learnings
- **`show`**: Display current context

## When building context from scratch (init)

### Phase 1: Website Discovery (automated)

Start by asking the user for their company website URL. Then scan it automatically before asking any questions.

**Step 1 — Get the website URL:**

If `$ARGUMENTS` contains a URL (starts with `http` or contains `.com`, `.io`, etc.), use it directly. Otherwise ask:
> "What's your company website? I'll scan it first so you don't have to explain everything from scratch."

Normalize the URL: ensure it starts with `https://`. Strip trailing slashes.

Tell the user what you're about to do:
> "Got it — scanning {url} now. I'll check the homepage, about, pricing, features, blog, and careers pages, then search the web for competitive intel and reviews. This takes a minute."

**Step 2 — Scan the website with Playwright (preferred) or WebFetch (fallback):**

**If Playwright MCP is available**, use it to navigate and extract structured information. Run these in sequence:

1. **Homepage** → `browser_navigate` to the URL, then `browser_snapshot`
   - Extract: company one-liner, hero text, value propositions, product name
   - Look for: tagline, "what we do" sections, social proof (logos, testimonials)

2. **About page** → `browser_navigate` to `{url}/about` (or find the link in the snapshot), then `browser_snapshot`
   - Extract: company description, founding story, team size, mission
   - Look for: leadership names/titles, company values, office locations

3. **Pricing page** → `browser_navigate` to `{url}/pricing` (or find the link), then `browser_snapshot`
   - Extract: pricing model (per-seat, usage-based, flat), plan tiers, target segments per tier
   - Look for: enterprise tier (signals upmarket ICP), free tier (signals PLG)

4. **Product/Features page** → find and navigate to product or features page, then `browser_snapshot`
   - Extract: core product capabilities, feature categories, product lingo/terminology
   - Look for: internal jargon (their word for workflows, projects, dashboards, etc.)

5. **Blog/Changelog** (if exists) → navigate, then `browser_snapshot`
   - Extract: recent launches, company narrative, topics they write about
   - Look for: case studies, customer stories (these become win case seeds)

6. **Careers page** (if exists) → navigate, then `browser_snapshot`
   - Extract: open roles (signals growth areas), team structure, company size hints
   - Look for: department sizes, engineering vs sales ratio

If any page 404s or doesn't exist, skip it silently — don't mention missing pages to the user.

**If Playwright MCP is NOT available**, fall back to WebFetch:

1. `WebFetch` the homepage URL with prompt: "Extract the company name, tagline, one-liner description, value propositions, product name, social proof logos, and testimonials from this page."
2. `WebFetch` `{url}/about` with prompt: "Extract the company description, founding story, team size, mission, leadership names and titles."
3. `WebFetch` `{url}/pricing` with prompt: "Extract the pricing model, plan tiers, pricing amounts, and what segments each tier targets."
4. `WebFetch` `{url}/features` or `{url}/product` with prompt: "Extract the core product capabilities, feature list, and any product-specific terminology or jargon."

WebFetch won't render JavaScript, so you'll get less data than Playwright. Compensate by running more WebSearch queries in Step 3.

**Step 3 — Enrich with WebSearch:**

Run parallel WebSearch queries to fill gaps the website didn't cover:

- `"{company_name}" competitors OR alternative OR "compared to"` → competitive landscape
- `"{company_name}" review site:g2.com OR site:capterra.com` → how customers describe them, objections
- `"{company_name}" funding OR raised OR series` → company stage and investor profile
- `"{company_name}" case study OR customer story` → win case seeds
- `"{company_name}" "{product_name}" integration OR "works with"` → ecosystem and tech partners

Use WebFetch on the most relevant 2-3 search results to extract deeper detail (G2 reviews are gold for objections and ICP signals).

**Step 4 — Compile a discovery draft:**

Organize everything you found into a draft covering each context area. Be specific — include exact quotes from the website, exact pricing numbers, exact terminology.

### Phase 2: User Validation (interactive)

Present your findings to the user grouped by topic. For each topic, show what you found and ask them to confirm, correct, or expand. Use this exact pattern:

**For each of the 10 context areas below**, present your discovery findings first, then ask the validation question:

1. **Company basics**
   > Here's what I found: {your summary from homepage + about page}
   > "Is this accurate? Anything to add or correct?"

2. **Product & pricing**
   > Here's what I found: {product description from features page, pricing model from pricing page}
   > "Is this right? Any nuance I'm missing about the product or pricing?"

3. **Product lingo**
   > Here's what I found: {terminology table extracted from website copy}
   > "Do you use these terms internally, or do you call things differently? Any terms I missed?"

4. **ICP definition**
   > Here's what I inferred: {ICP guess based on pricing tiers, testimonial logos, case study industries, G2 reviews}
   > "Who is your ideal customer? Industry, company size, buyer title, user title — did I get close?"

5. **Anti-ICP**
   > Here's what I think: {anti-ICP guess based on pricing floor, enterprise-only features, etc.}
   > "Who should you avoid targeting? Anyone that looks like a fit but isn't?"

6. **Win cases**
   > Here's what I found: {case studies or customer stories from website/search}
   > "Can you describe 2-3 recent wins in more detail? Company, problem, solution, result."

7. **Competitive landscape**
   > Here's what I found: {competitors from search results, G2 alternatives, comparison pages}
   > "Who do prospects actually compare you to? What's your real differentiation?"

8. **Objections**
   > Here's what I found: {negative themes from G2/Capterra reviews, common complaints}
   > "What are the top 3 objections you hear? How do you handle them?"

9. **Messaging**
   > Here's what I found: {tagline from homepage, value props from hero/features}
   > "Is this the messaging that resonates? What's your go-to one-liner in a sales conversation?"

10. **Past campaigns**
    > I didn't find evidence of past outbound campaigns on your website.
    > "Have you run any outbound campaigns? What worked, what didn't?"

**Important**: Ask these one at a time. Wait for the user's response before moving to the next. If the user says "looks good" or confirms, move on. If they correct or add detail, incorporate it. Do NOT skip any.

After collecting answers, write `data/company_context.md` with this structure:

```markdown
# Company Context
> Last updated: {date}

## Company Overview
{answer to #1}

## Product
{answer to #2}

## Product Glossary
| Internal Term | External Term | Notes |
|---|---|---|
{answer to #3}

## ICP Definition
### Ideal Customer
{answer to #4}
### Anti-ICP
{answer to #5}

## Win Cases
{answer to #6, structured per case}

## Competitive Landscape
{answer to #7}

## Objection Handling
| Objection | Response |
|---|---|
{answer to #8}

## Messaging
### One-liner
{answer to #9}
### Value Props
{answer to #9}

## Campaign History
{answer to #10, or "No campaigns yet"}

## Learnings Log
> Append-only log of insights from calls, campaigns, and iterations
```

## When updating from a call recording (update-from-call)

1. Read the transcript file at the given path
2. Read existing `data/company_context.md`
3. Extract from the call:
   - New product lingo or terminology
   - New objections and how they were handled
   - New competitive mentions
   - New use cases or pain points mentioned
   - Any ICP refinements (who was on the call, what was their profile)
   - Win/loss signals
4. Update the relevant sections of `data/company_context.md` using Edit
5. Append a dated entry to the Learnings Log section:
   ```
   ### {date} — Call with {company/person}
   - Key insight 1
   - Key insight 2
   - Action items
   ```

## Playwright MCP — pull results from Instantly dashboard

If the Playwright MCP is available and the user is logged into Instantly, you can pull campaign results directly from the dashboard instead of relying on the API or manual export:

1. `browser_navigate` to the Instantly campaign analytics page
2. `browser_snapshot` to extract open rates, reply rates, bounces
3. `browser_click` into individual replies to classify them (positive/negative/neutral/OOO)
4. Feed the extracted data into the context update flow below

This is especially useful for `update-from-results` when the Instantly API key isn't configured.

## When updating from campaign results (update-from-results)

1. Read `data/company_context.md`
2. If Playwright is available and user is logged into Instantly, scrape results from the dashboard (see above)
3. Otherwise run: `python3 scripts/db_manager.py campaign-results {campaign_name}`
3. Parse the results (open rates, reply rates, bounces, positive/negative replies)
4. Update the Campaign History section with results
5. Append to Learnings Log:
   ```
   ### {date} — Campaign "{campaign}" Results
   - Sent: X, Opened: X%, Replied: X%
   - Best performing segment: {segment}
   - Worst performing segment: {segment}
   - Key learnings: {analysis}
   - ICP adjustments: {if any}
   ```
6. If results suggest ICP refinement, update the ICP Definition section
7. If new objections surfaced in replies, add them to Objection Handling

## Critical rules

- NEVER overwrite existing context — always merge and append
- Always update the "Last updated" date
- Keep the Learnings Log in reverse chronological order (newest first)
- Use the product glossary terms consistently in all output
- If context file doesn't exist yet, create it with init flow
