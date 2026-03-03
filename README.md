<div align="center">

# Get Marketing Done

**Full-cycle GTM automation for Claude Code.**
**From ICP definition to closed deals. Every session compounds on the last.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Plugin-orange.svg?style=for-the-badge)](https://docs.anthropic.com/en/docs/claude-code)
[![Playwright](https://img.shields.io/badge/Playwright-MCP-green.svg?style=for-the-badge)](https://github.com/anthropics/claude-code)

```bash
git clone https://github.com/jqueguiner/get-marketing-done.git
```

```
Context → Lists → Research → Datapoints → Enrichment → Emails → Feedback → Send → Results
   ↑                                                                                  |
   └──────────────────────────────────────────────────────────────────────────────────────┘
```

*"GTM teams start fresh every campaign, losing context across tools and people.*
*This system remembers everything. Every campaign makes the next one sharper."*

---

[Install](#install) · [Commands](#commands) · [How It Works](#how-it-works) · [Configuration](#configuration) · [Playwright MCP](#playwright-mcp) · [Troubleshooting](#troubleshooting)

</div>

---

## Why This Exists

ICP definitions live in one doc. Prospect lists in a spreadsheet. Email copy in another tool. Campaign results in Instantly. Call notes in Notion. Nothing connects.

Every campaign starts from scratch. The SDR who ran the last campaign left. The messaging doc is outdated. The "learnings" from Q3 are in a Slack thread nobody can find.

Get Marketing Done keeps everything in one place — a SQLite database and a living context file that compounds across campaigns. Past wins shape future lists. Reply data refines your ICP. Objections from calls feed into email copy. Context never gets lost.

## Who This Is For

Founders, GTM leads, and operators who run outbound themselves and want a system that gets smarter with every campaign.

---

## Install

### Quick Start (Recommended)

```bash
# 1. Clone the repo
git clone https://github.com/jqueguiner/get-marketing-done.git
cd get-marketing-done

# 2. Initialize the database
python3 scripts/db_manager.py init

# 3. Configure API keys (optional — the system works without them)
cp config.example.json config.json
# Edit config.json with your keys

# 4. Install as a Claude Code plugin
claude /install-plugin /path/to/get-marketing-done
```

Then verify it works:

```
/marketing:company-context-builder init
```

> [!TIP]
> You don't need any API keys to start. The core workflow (context building, list building, research, email generation, copy feedback) runs entirely on Claude Code's built-in tools. API keys for Extruct, Instantly, and Perplexity unlock additional capabilities.

### Install Methods

There are three ways to install Get Marketing Done depending on your needs:

#### Option A: Global Install (all projects)

Makes the plugin available in every Claude Code session on your machine.

```bash
git clone https://github.com/jqueguiner/get-marketing-done.git ~/.claude/plugins/get-marketing-done
cd ~/.claude/plugins/get-marketing-done
python3 scripts/db_manager.py init
```

Then add it to your global Claude Code settings:

```bash
# Open your global settings
cat ~/.claude/settings.json
```

Add the plugin directory to your settings:

```json
{
  "plugins": [
    "~/.claude/plugins/get-marketing-done"
  ]
}
```

#### Option B: Local Install (current project only)

Keeps the plugin scoped to a specific project directory.

```bash
cd /your/project
git clone https://github.com/jqueguiner/get-marketing-done.git .claude/plugins/get-marketing-done
cd .claude/plugins/get-marketing-done
python3 scripts/db_manager.py init
```

Add to your project's `.claude/settings.json`:

```json
{
  "plugins": [
    ".claude/plugins/get-marketing-done"
  ]
}
```

#### Option C: Direct Plugin Flag

Load it on-demand without permanent installation:

```bash
claude --plugin-dir /path/to/get-marketing-done
```

<details>
<summary><strong>Development Install</strong></summary>

If you want to modify the plugin or contribute:

```bash
git clone https://github.com/jqueguiner/get-marketing-done.git
cd get-marketing-done
python3 scripts/db_manager.py init

# Run Claude Code with the local plugin
claude --plugin-dir .
```

All skills and scripts are plain files (Markdown + Python) — edit them directly, no build step.

</details>

### Verify Installation

After installing, start Claude Code and run:

```
/marketing:company-context-builder show
```

You should see a message about no context file existing yet. That means the plugin is loaded and working.

To see all available commands:

```
/help
```

Look for commands prefixed with `marketing:` in the list.

> [!IMPORTANT]
> The plugin requires Python 3.7+ for the data scripts (SQLite, CSV generation, email assembly). No pip dependencies needed — everything uses the Python standard library.

---

## Commands

All commands are prefixed with `marketing:` when used as a plugin. The full workflow runs in order, but you can jump to any step.

### Core Workflow

| Step | Command | What It Does |
|:----:|---------|--------------|
| 0 | `/marketing:company-context-builder` | Build company context — ICP, product lingo, win cases, objections. Ingest call transcripts. |
| 1 | `/marketing:list-building` | Lookalike search (from wins) or instant search (new verticals). 200-500 companies. |
| 2 | `/marketing:market-problems-deep-research` | Deep research on industry problems + what leaders say. Education, not prospecting. |
| 3 | `/marketing:data-points-builder` | Define and collect company-level signals — podcasts, launches, hiring, tech stack. |
| 4 | `/marketing:table-enrichment` | Run enrichment via Extruct, Playwright scraping, or deep research. SQLite tracks progress. |
| 5 | `/marketing:list-building refine` | Re-run list building with enrichment datapoints as search parameters. |
| 6 | *Built into data layer* | Tiering and segmentation — group companies by traits, align with problem hypotheses. |
| 7 | `/marketing:email-generation` | Strict instruction-based email assembly. Define the formula, iterate in chat. |
| 8 | `/marketing:copy-feedback` | Build prospect persona from social profiles, simulate cold read, refine per prospect. |
| 9 | `/marketing:run-instantly` | Prepare CSV, upload to Instantly, verification checklist. Never auto-sends. |
| 10 | `/marketing:company-context-builder` | Results feed back in. The compound loop closes. |

### Session Management

| Command | What It Does |
|---------|--------------|
| `/marketing:campaign-progress` | Visual pipeline dashboard — step markers, pipeline counts, next action routing. |
| `/marketing:campaign-verify` | Goal-backward verification — checks exists/substantive/wired across the entire pipeline. |
| `/marketing:pause-work` | Save campaign state to `.continue-here.md` for cross-session persistence. |
| `/marketing:resume-work` | Restore state from a previous session and route to the next action. |

### Command Arguments

| Command | Arguments | Example |
|---------|-----------|---------|
| `company-context-builder` | `init`, `update-from-call <path>`, `update-from-results <campaign>`, `show` | `/marketing:company-context-builder update-from-call ./calls/acme-demo.txt` |
| `list-building` | `lookalike <company>`, `search <criteria>`, `refine` | `/marketing:list-building lookalike Stripe` |
| `market-problems-deep-research` | `<industry or problem>` | `/marketing:market-problems-deep-research "data pipeline reliability"` |
| `data-points-builder` | `define`, `research <company>`, `bulk-research`, `show` | `/marketing:data-points-builder research "Acme Corp"` |
| `table-enrichment` | `run <campaign>`, `status`, `validate`, `export` | `/marketing:table-enrichment status` |
| `email-generation` | `create-template`, `generate <company>`, `bulk-generate <segment>`, `preview`, `iterate` | `/marketing:email-generation generate "Acme Corp"` |
| `copy-feedback` | `<company>` or `<person at company>` | `/marketing:copy-feedback "Jane Smith at Acme Corp"` |
| `run-instantly` | `prepare <campaign>`, `upload <campaign>`, `verify <campaign>`, `results <campaign>` | `/marketing:run-instantly prepare q1-fintech` |
| `campaign-progress` | *(none)* | `/marketing:campaign-progress` |
| `campaign-verify` | `<campaign_name>` | `/marketing:campaign-verify q1-fintech` |
| `pause-work` | `[reason]` | `/marketing:pause-work "switching to another project"` |
| `resume-work` | *(none)* | `/marketing:resume-work` |

---

## How It Works

### The Compound Loop

This is the core idea. Every step feeds into the next, and results feed back to the beginning:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ┌─────────┐   ┌───────┐   ┌──────────┐   ┌────────────┐   ┌──────────┐  │
│   │ Context │──▶│ Lists │──▶│ Research │──▶│ Datapoints │──▶│ Enrich   │  │
│   └─────────┘   └───────┘   └──────────┘   └────────────┘   └──────────┘  │
│        ▲                                                          │        │
│        │                                                          ▼        │
│   ┌─────────┐   ┌────────┐   ┌──────────┐   ┌────────────┐  ┌──────────┐  │
│   │ Results │◀──│  Send  │◀──│ Feedback │◀──│   Emails   │◀─│ Segment  │  │
│   └─────────┘   └────────┘   └──────────┘   └────────────┘  └──────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Layer

Everything lives in two places:

```
data/
├── gtm.db                    ← SQLite: companies, contacts, datapoints, emails, campaigns, results
├── company_context.md        ← Living document: ICP, glossary, win cases, learnings log
├── datapoint_schema.json     ← What signals to collect per company
├── research/                 ← Market problem deep dives (per industry)
├── templates/                ← Email assembly formulas (strict, no freestyling)
├── lists/                    ← Generated prospect lists (CSV)
├── enriched/                 ← Enriched data exports
├── instantly/                ← Instantly-ready upload CSVs
└── results/                  ← Campaign result imports
```

> [!NOTE]
> All runtime data (`data/`, `config.json`) is gitignored. Only the skills, scripts, and configuration templates are versioned. Your prospect data stays local.

### Scripts

| Script | Commands | Purpose |
|--------|----------|---------|
| `marketing-tools.js` | 17 CLI commands | **Single-call bootstrap** — returns all campaign context in one JSON blob |
| `db_manager.py` | 20 CLI commands | All SQLite operations — companies, datapoints, emails, campaigns, segments |
| `email_assembler.py` | `generate`, `bulk-generate`, `list-templates` | Template-based email assembly with forbidden word checking |
| `enrichment_runner.py` | `run`, `status` | Enrichment orchestration with progress tracking |
| `instantly_uploader.py` | `prepare`, `upload`, `results` | CSV generation, Instantly API upload, results fetching |

No pip dependencies — Python standard library only. Node.js scripts also dependency-free.

### State Management

Campaigns persist across sessions. The system tracks where you are and what happened:

- **`STATE.md`** — YAML frontmatter (machine-readable) + markdown body (human-readable). Tracks current step, campaign, pipeline counts, performance metrics, session log.
- **`.continue-here.md`** — Checkpoint file written by `/pause-work`. Contains everything needed to resume: position, pipeline snapshot, what was happening, suggested next action.
- **Session start hook** — Detects paused work when you open Claude Code and prompts to resume.

```
# Resume flow
Session starts → hook detects STATE.md → shows "Campaign in progress"
                                        → user runs /resume-work
                                        → reads .continue-here.md
                                        → routes to next action
```

### Context Window Monitoring

Three-component system adapted from GSD — prevents losing work when context runs low:

1. **Statusline hook** — Shows campaign step, writes bridge file to `/tmp/`
2. **Context monitor hook** (PostToolUse) — Reads bridge file, injects warnings:
   - **>35% remaining**: Normal, no warnings
   - **<=35% remaining**: "Complete current task, avoid new complex work"
   - **<=25% remaining**: "Save state NOW. Run `/marketing:pause-work`"
3. **Debouncing** — Warnings every 5 tool uses; severity escalation bypasses debounce

### Quality Gates

Configurable gates that prevent skipping steps:

```json
{
  "quality_gates": {
    "require_context_before_lists": true,
    "require_research_before_emails": true,
    "require_enrichment_before_emails": true,
    "require_copy_feedback_before_send": false,
    "manual_verify_before_send": true
  }
}
```

Each skill checks its gates at startup via `marketing-tools.js init`. If a gate fails, the skill warns the user and suggests the prerequisite step.

### Goal-Backward Verification

`/campaign-verify` checks campaign readiness at three levels:

| Level | What It Checks | Example |
|-------|---------------|---------|
| **Exists** | Do the artifacts exist? | Company context file, prospect list, research files |
| **Substantive** | Is the content real? | ICP has >500 chars, list has 200+ companies, enrichment >50% |
| **Wired** | Do pieces connect? | Emails linked to companies, contacts have email addresses |

### Wave-Based Execution

Bulk operations (research, enrichment, email generation) use parallel waves:

```
Wave 1: [Company A, Company B, Company C, ...]  ← 10-20 in parallel
            ↓ all complete
Wave 2: [Company K, Company L, Company M, ...]  ← next batch
            ↓ all complete
   ... until done or threshold met
```

Each wave runs companies in parallel via Agent subagents. After each wave, progress is checked against configured thresholds (`min_enrichment_rate`, `min_list_size`).

---

## Configuration

### API Keys

Copy the example config and add your keys:

```bash
cp config.example.json config.json
```

```json
{
  "extruct_api_key": "your-key-here",
  "instantly_api_key": "your-key-here",
  "perplexity_api_key": "your-key-here"
}
```

Or set as environment variables:

```bash
export EXTRUCT_API_KEY="your-key-here"
export INSTANTLY_API_KEY="your-key-here"
export PERPLEXITY_API_KEY="your-key-here"
```

| Service | Used For | Required? | Without It |
|---------|----------|:---------:|------------|
| Extruct | Structured data enrichment | No | Use Playwright scraping or deep research instead |
| Instantly | Email sequencing and sending | No | Generates CSVs for manual import into any email tool |
| Perplexity | Deep market research | No | Falls back to Claude's built-in WebSearch |

> [!TIP]
> You can run the entire workflow with zero API keys. The system uses Claude Code's built-in WebSearch, WebFetch, and Playwright MCP for research, and generates CSVs you can import into any email tool.

### Permissions & Hooks

The plugin ships with a `settings.json` that pre-approves common tool patterns and registers hooks:

```json
{
  "permissions": {
    "allow": [
      "Bash(python3 scripts/*)",
      "Bash(node scripts/*)",
      "Bash(sqlite3 data/gtm.db *)",
      "Read", "Write", "Edit",
      "Glob", "Grep",
      "WebSearch", "WebFetch"
    ]
  }
}
```

Three hooks are registered automatically:

| Hook | Trigger | Purpose |
|------|---------|---------|
| `hooks/statusline.js` | Status line | Shows current GTM step and campaign in the status bar |
| `hooks/context-monitor.js` | PostToolUse | Warns when context window is running low |
| `hooks/session-start.js` | SessionStart | Detects paused campaigns and prompts to resume |

You'll still be prompted for Playwright browser actions and any commands outside the allow list.

---

## Playwright MCP

Every skill is enhanced with Playwright MCP browser automation when available. This is optional but significantly upgrades the system's ability to gather real data.

### What Playwright Unlocks

| Skill | Without Playwright | With Playwright |
|-------|--------------------|-----------------|
| **List Building** | WebSearch snippets only | Navigate Crunchbase/G2/directories, paginate results, apply on-site filters |
| **Deep Research** | WebFetch for static HTML | Read full articles on JS-heavy sites, expand collapsed sections |
| **Data Points** | Search snippets + WebFetch | Visit careers pages, detect tech stack from loaded JS, scrape blogs |
| **Copy Feedback** | Search-based persona building | Navigate LinkedIn/Twitter profiles, read actual posts and career history |
| **Run Instantly** | CSV export + manual upload | Upload CSV via browser, walk through dashboard verification, scrape analytics |
| **Enrichment** | Extruct API or search-based | Direct website scraping — careers, about pages, blogs — with high confidence |
| **Context Builder** | Manual result entry | Scrape Instantly dashboard for campaign results when API key is unavailable |

### Setting Up Playwright MCP

If you already have the Playwright MCP server configured in Claude Code, the skills will detect and use it automatically. No additional setup needed.

If you don't have it yet:

```bash
# Install the Playwright MCP server
npm install -g @anthropic/mcp-playwright

# Add to your Claude Code MCP config (~/.claude/mcp.json)
```

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@anthropic/mcp-playwright"]
    }
  }
}
```

> [!NOTE]
> All skills gracefully fall back to WebSearch and WebFetch when Playwright is not available. The browser tools are additive — nothing breaks without them.

---

## Typical Session

Here's what a real session looks like, start to finish:

```
# 1. Start with context (first time only — after this it compounds)
/marketing:company-context-builder init

# 2. Build a prospect list based on a successful customer
/marketing:list-building lookalike "Acme Corp"

# 3. Research the problems this vertical faces
/marketing:market-problems-deep-research "data pipeline reliability in fintech"

# 4. Define what signals to collect per company
/marketing:data-points-builder define

# 5. Enrich the list
/marketing:table-enrichment run q1-fintech

# 6. Optional: refine the list based on what enrichment revealed
/marketing:list-building refine

# 7. Create an email template and generate
/marketing:email-generation create-template
/marketing:email-generation bulk-generate fintech-segment

# 8. Simulate how prospects will react (per prospect)
/marketing:copy-feedback "Jane Smith at FinCo"

# 9. Upload to Instantly and verify
/marketing:run-instantly prepare q1-fintech
/marketing:run-instantly verify q1-fintech

# 10. After the campaign runs, feed results back
/marketing:company-context-builder update-from-results q1-fintech

# --- Session management (use anytime) ---

# Check pipeline progress
/marketing:campaign-progress

# Verify campaign readiness before sending
/marketing:campaign-verify q1-fintech

# Pause and pick up later (context window low, switching tasks, etc.)
/marketing:pause-work "enrichment done, emails next"

# Next session — resume right where you left off
/marketing:resume-work
```

---

## Project Structure

```
get-marketing-done/
├── .claude-plugin/
│   └── plugin.json              ← Plugin manifest
├── skills/
│   ├── company-context-builder/
│   │   └── SKILL.md             ← Step 0 + 10: context compound loop
│   ├── list-building/
│   │   └── SKILL.md             ← Step 1 + 5: lookalike / instant / refine
│   ├── market-problems-deep-research/
│   │   └── SKILL.md             ← Step 2: industry problem education
│   ├── data-points-builder/
│   │   └── SKILL.md             ← Step 3: company research signals
│   ├── table-enrichment/
│   │   └── SKILL.md             ← Step 4: enrichment orchestration
│   ├── email-generation/
│   │   └── SKILL.md             ← Step 7: strict formula email assembly
│   ├── copy-feedback/
│   │   └── SKILL.md             ← Step 8: prospect persona simulation
│   ├── run-instantly/
│   │   └── SKILL.md             ← Step 9: Instantly upload + verification
│   ├── campaign-progress/
│   │   └── SKILL.md             ← Visual pipeline dashboard
│   ├── campaign-verify/
│   │   └── SKILL.md             ← Goal-backward verification
│   ├── pause-work/
│   │   └── SKILL.md             ← Save state for cross-session persistence
│   └── resume-work/
│       └── SKILL.md             ← Restore state and route to next action
├── hooks/
│   ├── statusline.js            ← Writes bridge file, shows GTM step in status bar
│   ├── context-monitor.js       ← PostToolUse: warns when context window runs low
│   └── session-start.js         ← Detects paused campaigns, prompts to resume
├── scripts/
│   ├── marketing-tools.js       ← Single-call bootstrap engine (17 commands)
│   ├── db_manager.py            ← SQLite data layer (20 commands)
│   ├── email_assembler.py       ← Template-based email generation
│   ├── enrichment_runner.py     ← Enrichment orchestration
│   └── instantly_uploader.py    ← Instantly CSV + API integration
├── data/                        ← Runtime data (gitignored)
│   ├── gtm.db                   ← SQLite database (companies, emails, campaigns)
│   ├── company_context.md       ← Living context doc (ICP, glossary, learnings)
│   ├── STATE.md                 ← Campaign state (YAML frontmatter + markdown)
│   └── .continue-here.md        ← Pause checkpoint (written by /pause-work)
├── config.example.json          ← API key template + workflow toggles
├── config.json                  ← Your config (gitignored)
├── settings.json                ← Permissions + hooks registration
└── .gitignore
```

---

## Troubleshooting

**Skills don't show up after install**

Make sure the plugin directory path is correct. Run `ls /path/to/get-marketing-done/.claude-plugin/plugin.json` to verify the manifest exists. Restart Claude Code after adding the plugin.

**"Database not found" errors**

Run `python3 scripts/db_manager.py init` from the plugin directory. This creates `data/gtm.db`.

**Playwright tools not available**

The Playwright MCP server needs to be configured separately in your Claude Code MCP settings. See [Playwright MCP](#playwright-mcp) section. Skills work without it — they fall back to WebSearch/WebFetch.

**"Company not found" when running commands**

Company names are matched with `LIKE %name%`. Use the exact name stored in the database. Run `python3 scripts/db_manager.py list-companies` to see what's there.

**Enrichment is slow**

Bulk research spawns parallel agents but is still bounded by API rate limits. Use smaller batch sizes (10-20) and monitor with `/marketing:table-enrichment status`.

**Emails contain {placeholder} text**

The company is missing required datapoints. Run `/marketing:table-enrichment validate` to see what's missing, then enrich before regenerating emails.

<details>
<summary><strong>Reset everything and start fresh</strong></summary>

```bash
# Remove the database and all runtime data
rm -f data/gtm.db
rm -rf data/lists data/enriched data/instantly data/results data/research data/templates
rm -f data/company_context.md data/datapoint_schema.json data/enrichment_progress.json

# Reinitialize
python3 scripts/db_manager.py init
```

This preserves your skills and scripts but clears all prospect data, campaigns, and context.

</details>

---

## Philosophy

- **Context compounds** — nothing gets thrown away between campaigns. The system remembers.
- **Strict email assembly** — no AI freestyling. You define the exact formula, the script assembles it.
- **Manual verification** — never auto-sends. Always requires human sign-off before emails go out.
- **Per-prospect refinement** — copy feedback runs one prospect at a time. Quality over speed.
- **Hypothesis-driven** — every list starts with a hypothesis. Results validate or invalidate it.
- **Zero lock-in** — SQLite + CSV + Markdown. Your data is yours. Export and leave anytime.

---

## License

MIT

<div align="center">

*Stop starting from scratch. Start compounding.*

</div>
