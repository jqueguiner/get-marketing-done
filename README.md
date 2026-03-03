# Get Marketing Done

A Claude Code plugin for full-cycle GTM automation. From ICP definition through list building, enrichment, email generation, and campaign execution. Every session compounds on the last.

## The Problem

GTM teams start fresh every campaign, losing context across tools and people. ICP definitions live in one doc, prospect lists in another, email copy in a third, and campaign results in a fourth. Nothing connects.

## The Solution

A single system where context compounds. Past campaigns inform future ones. Win cases shape prospect lists. Reply data refines your ICP. All through Claude Code skills that chain together.

## Skills

| Step | Command | What it does |
|------|---------|--------------|
| 0 | `/company-context-builder` | Build company context — ICP, product lingo, win cases. Ingest call transcripts. |
| 1 | `/list-building` | Lookalike search (from wins) or instant search (new verticals). 200-500 companies. |
| 2 | `/market-problems-deep-research` | Deep research on industry problems + what leaders say. Education, not prospecting. |
| 3 | `/data-points-builder` | Define and collect company-level research signals — podcasts, launches, hiring signals. |
| 4 | `/table-enrichment` | Run enrichment via Extruct. SQLite tracks progress, quality, fill rates. |
| 5 | Re-run `/list-building refine` | Use enrichment datapoints to narrow the list to companies that actually match. |
| 6 | Tiering & segmentation | Built into the data layer — segment companies and align with problem hypotheses. |
| 7 | `/email-generation` | Strict instruction-based email assembly. Define the formula, iterate in chat. |
| 8 | `/copy-feedback` | Build prospect persona from social profiles, simulate cold read, refine per prospect. |
| 9 | `/run-instantly` | Prepare CSV, upload to Instantly, verification checklist. Never auto-sends. |
| 10 | `/company-context-builder` | Results feed back in. Every campaign makes the next one sharper. |

## Setup

```bash
# Clone
git clone git@github.com:jqueguiner/get-marketing-done.git

# Configure API keys
cp config.example.json config.json
# Edit config.json with your keys (Extruct, Instantly, Perplexity)

# Initialize the database
python3 scripts/db_manager.py init

# Load as Claude Code plugin
claude --plugin-dir /path/to/get-marketing-done
```

## How It Works

### The Compound Loop

```
Context → Lists → Research → Datapoints → Enrichment → Emails → Feedback → Send → Results
   ↑                                                                                  |
   └──────────────────────────────────────────────────────────────────────────────────────┘
```

Every campaign result feeds back into company context. Your ICP sharpens. Your messaging improves. Your lists get more targeted.

### Data Layer

- **SQLite** (`data/gtm.db`) — single source of truth for companies, contacts, datapoints, emails, campaigns, results
- **Markdown** (`data/company_context.md`) — living document that evolves with every interaction
- **JSON templates** (`data/templates/`) — strict email assembly formulas
- **Research files** (`data/research/`) — market problem deep dives

### Scripts

| Script | Purpose |
|--------|---------|
| `scripts/db_manager.py` | 20 CLI commands for all data operations |
| `scripts/email_assembler.py` | Template-based email generation with forbidden word checking |
| `scripts/enrichment_runner.py` | Extruct / deep research orchestration with progress tracking |
| `scripts/instantly_uploader.py` | CSV preparation, upload, and results fetching |

## API Integrations

| Service | Used For | Required? |
|---------|----------|-----------|
| Extruct | Data enrichment | Optional (can use deep research instead) |
| Instantly | Email sequencing | For sending campaigns |
| Perplexity | Deep research | Optional (falls back to web search) |

Set keys in `config.json` or as environment variables.

## Philosophy

- **Context compounds** — nothing gets thrown away between campaigns
- **Strict email assembly** — no AI freestyling, you define the exact formula
- **Manual verification** — never auto-sends, always requires human sign-off
- **Per-prospect refinement** — copy feedback runs one prospect at a time
- **Hypothesis-driven** — every list starts with a hypothesis, results validate or invalidate it
