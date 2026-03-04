# Get Marketing Done — Tutorial

## Install

```bash
npx get-marketing-done
```

Choose **Global** (recommended) or **Local** (current project only). Verify with:

```
/gmd:campaign-progress
```

No API keys required to start.

## Command Styles (Claude + Codex)

Use the command style that matches your assistant runtime:

| Runtime | Command Style | Example |
|---------|---------------|---------|
| Claude | `/gmd:*` | `/gmd:campaign-progress` |
| Codex | `$gmd-*` | `$gmd-campaign-progress` |

Advanced mode:
- Canonical alias `gmd:<action>` is optional and off by default.
- Enable alias mode explicitly before using alias commands.

## The Workflow

Run these in order. Each step builds on the last.

### 1. Build Company Context

```
/gmd:company-context-builder init
```

Walks you through 10 questions about your company — ICP, product, wins, objections. Creates a `company_context.md` that every other command reads.

**Do this first.** Nothing works well without it.

### 2. Build Your Prospect List

```
/gmd:list-building search "Series A SaaS companies in fintech, 50-200 employees"
/gmd:list-building lookalike "Acme Corp"
```

Search by criteria or find companies similar to one you've already won. Aim for 200-500 companies.

### 3. Research Market Problems

```
/gmd:market-problems-deep-research "data pipeline reliability in fintech"
```

Not company-specific — this is about understanding the landscape. What problems exist, what leaders are saying, what trends matter. This shapes your email messaging.

### 4. Define Datapoints

```
/gmd:data-points-builder define
```

What do you want to know about each company? Funding round, hiring signals, tech stack, CEO podcast appearances, recent launches. Define the schema, then research in bulk:

```
/gmd:data-points-builder bulk-research
```

### 5. Enrich Your List

```
/gmd:table-enrichment run my-campaign
/gmd:table-enrichment status
```

Fills in your datapoints across all companies using Extruct API, Playwright scraping, or web research. You need 50%+ enrichment rate before you can generate emails.

### 6. Generate Emails

```
/gmd:email-generation create-template
/gmd:email-generation bulk-generate fintech-segment
```

Define your exact email formula — subject line, opening line, problem statement, bridge, CTA. Every email must reference at least one company-specific datapoint.

### 7. Get Copy Feedback

```
/gmd:copy-feedback "Jane Smith at FinCo"
```

Simulates how a prospect would react. Builds a persona from their social profiles, reads your email through their eyes, gives honest feedback. Run on 3-5 prospects before bulk sending.

### 8. Send via Instantly

```
/gmd:run-instantly prepare my-campaign
/gmd:run-instantly upload my-campaign
/gmd:run-instantly verify my-campaign
```

Prepare validates everything. Upload pushes to Instantly. Verify is a mandatory checklist before sending. The system **never** auto-sends.

### 9. Learn From Results

```
/gmd:run-instantly results my-campaign
/gmd:company-context-builder update-from-results my-campaign
```

Pull results and feed them back into your context. Every campaign makes the next one better.

## Session Management

```
/gmd:campaign-progress          # What's done, what's next
/gmd:campaign-verify my-campaign # Is it ready to send?
/gmd:pause-work "switching tasks" # Save state
/gmd:resume-work                 # Pick up where you left off
```

A session-start hook detects paused work and reminds you to resume.

## API Keys (Optional)

Edit `~/.claude/get-marketing-done/config.json`:

```json
{
  "extruct_api_key": "",
  "instantly_api_key": "",
  "perplexity_api_key": ""
}
```

None required. The system falls back to web search and Playwright.

## Update

```bash
npx get-marketing-done
```

## Uninstall

```bash
npx get-marketing-done --uninstall --global
```

Your campaign data is preserved.
