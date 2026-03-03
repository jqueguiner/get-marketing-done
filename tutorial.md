# Get Marketing Done — Tutorial

A full-cycle GTM automation framework for Claude Code. Build company context, research markets, build prospect lists, enrich data, generate personalized emails, and send campaigns — all from your terminal.

## Installation

```bash
npx get-marketing-done
```

Choose **Global** (recommended) to make commands available in every project, or **Local** for the current project only.

After install, all commands appear as `/gmd:*` in Claude Code.

## Configure API Keys (Optional)

Edit `~/.claude/get-marketing-done/config.json`:

```json
{
  "extruct_api_key": "",       // For automated enrichment
  "instantly_api_key": "",     // For email sending via Instantly
  "perplexity_api_key": ""     // For deep research
}
```

None are required to start. The framework uses web search and Playwright browser automation as fallbacks.

## The GTM Pipeline

The framework follows a 10-step pipeline. Each step builds on the last. You don't have to run them in strict order, but the quality gates will tell you if you're skipping something important.

```
Step 0   Context        Define your company, ICP, product, and wins
Step 1   Lists          Build a prospect list of 200-500 companies
Step 2   Research       Deep-dive the market problems your prospects face
Step 3   Datapoints     Define what to research about each company
Step 4   Enrichment     Fill in those datapoints (automated + manual)
Step 7   Emails         Generate personalized emails from templates
Step 8   Feedback       Simulate prospect reactions and refine
Step 9   Send           Upload to Instantly and verify before sending
Step 10  Learn          Pull results and feed learnings back into context
```

## Step-by-Step Walkthrough

### Step 0 — Build Company Context

```
/gmd:company-context-builder init
```

This is where everything starts. The skill walks you through 10 questions about your company: what you do, who you sell to, your wins, objections, and messaging. It writes everything to a `company_context.md` file that every other skill reads.

**Do this first.** Nothing else works well without it.

Other modes:
- `/gmd:company-context-builder show` — display current context
- `/gmd:company-context-builder update-from-call <path>` — ingest a sales call transcript
- `/gmd:company-context-builder update-from-results <campaign>` — learn from campaign results

### Step 1 — Build Your Prospect List

```
/gmd:list-building search <criteria>
/gmd:list-building lookalike <company_name>
```

Two approaches:
- **Search**: describe your target (e.g., "Series A SaaS companies in fintech, 50-200 employees")
- **Lookalike**: name a company you've already won and find similar ones

The skill uses web search and Playwright to find companies matching your ICP, then stores them in SQLite. Aim for 200-500 companies.

After enrichment, you can refine:
```
/gmd:list-building refine
```

### Step 2 — Research Market Problems

```
/gmd:market-problems-deep-research <industry or problem area>
```

This is not company-specific research. It's about understanding the *landscape* — what problems exist in your target market, what industry leaders are saying, what trends matter.

The output becomes the foundation for your email messaging angles. The skill searches conferences, analyst reports, surveys, and expert opinions, then writes structured research files.

### Step 3 — Define Datapoints

```
/gmd:data-points-builder define
```

Decide what you want to know about each prospect company. Examples:
- Recent funding round
- Hiring signals (open engineering roles)
- Tech stack
- CEO podcast appearances
- Recent product launches

The skill helps you define a schema, then you can research companies one at a time or in bulk:

```
/gmd:data-points-builder research <company>
/gmd:data-points-builder bulk-research
```

### Step 4 — Enrich Your List

```
/gmd:table-enrichment run <campaign>
```

This is the heavy lifting. The skill populates your datapoints across all companies using:
- **Extruct API** (if configured) — automated enrichment
- **Playwright** — browser-based scraping
- **Web research** — search-based data collection

Track progress and validate quality:
```
/gmd:table-enrichment status
/gmd:table-enrichment validate
```

The framework enforces a minimum enrichment rate (default 50%) before you can generate emails. This prevents sending generic outreach.

### Step 7 — Generate Emails

```
/gmd:email-generation create-template
```

First, define your email formula. The skill walks you through:
1. Subject line formula
2. Opening line (referencing a specific datapoint)
3. Problem statement (from your research)
4. Bridge to your solution
5. CTA
6. Tone and length constraints

Then generate:
```
/gmd:email-generation generate <company>         # one at a time
/gmd:email-generation bulk-generate <segment>     # all at once
/gmd:email-generation iterate                     # refine and A/B test
```

Every email must reference at least one company-specific datapoint. No generic outreach gets through.

### Step 8 — Get Copy Feedback

```
/gmd:copy-feedback <company_name>
```

Before sending, simulate how your prospect would react. The skill:
1. Deep-dives the prospect's LinkedIn, social profiles, and industry context
2. Builds a detailed persona
3. Reads your email through their eyes
4. Gives you honest feedback: what would make them reply, what would make them delete

Refine your emails based on the simulation, then re-generate.

### Step 9 — Send via Instantly

```
/gmd:run-instantly prepare <campaign>
/gmd:run-instantly upload <campaign>
/gmd:run-instantly verify <campaign>
```

Three phases, all mandatory:
1. **Prepare**: validates every email has a valid address, no broken merge fields, no forbidden words. Generates the upload CSV.
2. **Upload**: pushes to Instantly via API or Playwright dashboard automation.
3. **Verify**: presents a checklist you must manually confirm before sending. The framework will **never** auto-send.

### Step 10 — Learn From Results

```
/gmd:run-instantly results <campaign>
/gmd:company-context-builder update-from-results <campaign>
```

After your campaign runs, pull results (open rates, reply rates, reply classification) and feed them back into your company context. This closes the loop — every campaign makes the next one better.

## Supporting Commands

These work at any point in the pipeline:

### Check Progress

```
/gmd:campaign-progress
```

Visual pipeline status: which steps are complete, what's next, company counts, enrichment rates.

### Verify Campaign Readiness

```
/gmd:campaign-verify <campaign_name>
```

Three-level verification:
- **Exists**: do the artifacts exist? (context file, database, list, research, emails)
- **Substantive**: is the content real? (ICP defined with detail, win cases documented, glossary populated)
- **Wired**: are the pieces connected? (emails linked to companies, contacts have addresses)

Run this before uploading to Instantly.

### Pause and Resume

```
/gmd:pause-work <reason>
/gmd:resume-work
```

Save your exact position in the pipeline so you can pick up in a new session. The framework captures your current step, pipeline metrics, and what you were doing.

A session-start hook automatically detects paused work and reminds you to resume.

## Quality Gates

The framework enforces quality gates to prevent sending bad outreach. These are configurable in `config.json`:

| Gate | Default | What It Does |
|------|---------|--------------|
| `require_context_before_lists` | true | Can't build lists without company context |
| `require_research_before_emails` | true | Can't generate emails without market research |
| `require_enrichment_before_emails` | true | Can't generate emails below enrichment threshold |
| `require_copy_feedback_before_send` | false | Must run copy feedback before uploading |
| `manual_verify_before_send` | true | Must manually verify checklist before sending |

Minimum thresholds:
- `min_enrichment_rate`: 50% (companies must have datapoints filled)
- `min_list_size`: 200 (minimum prospect list size)
- `max_email_words`: 100 (keeps emails short and sharp)

## Tips

- **Start with `/gmd:company-context-builder init`**. Everything downstream depends on good context.
- **Run `/gmd:campaign-progress`** whenever you're unsure what to do next. It routes you to the right step.
- **Don't skip enrichment.** Generic emails with no company-specific references get ignored. The enrichment step is what makes your outreach personal.
- **Use `/gmd:copy-feedback`** on at least 3-5 prospects before bulk sending. It catches messaging issues you won't see yourself.
- **The context compounds.** After each campaign, run `update-from-results` to feed learnings back. Your second campaign will be significantly better than your first.

## Uninstall

```bash
npx get-marketing-done --uninstall --global
```

This removes all installed files but preserves your `data/` directory (campaign data, context, database).
