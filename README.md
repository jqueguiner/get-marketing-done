<div align="center">

# Get Marketing Done

**Full-cycle GTM automation for Claude Code.**
**From ICP definition to closed deals. Every session compounds on the last.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Plugin-orange.svg?style=for-the-badge)](https://docs.anthropic.com/en/docs/claude-code)

```bash
npx get-marketing-done
```

```
Context → Lists → Research → Datapoints → Enrichment → Emails → Feedback → Send → Results
   ↑                                                                                  |
   └──────────────────────────────────────────────────────────────────────────────────────┘
```

*"GTM teams start fresh every campaign, losing context across tools and people.*
*This system remembers everything. Every campaign makes the next one sharper."*

---

[Getting Started](#getting-started) · [The Pipeline](#the-pipeline) · [Commands](#commands) · [Configuration](#configuration)

</div>

---

## Getting Started

```bash
npx get-marketing-done
```

The installer prompts you to choose:

- **Location** — Global (all projects) or local (current project only)

Verify with:

```
/gmd:campaign-progress
```

> [!NOTE]
> No API keys required to start. The system uses Claude Code's built-in WebSearch, WebFetch, and Playwright MCP. API keys for Extruct, Instantly, and Perplexity unlock additional capabilities.

### Staying Updated

```bash
npx get-marketing-done
```

Re-running the installer updates all files. Locally modified files are backed up automatically.

### Uninstall

```bash
npx get-marketing-done --uninstall --global
```

Your campaign data (`data/` directory) is preserved.

---

## The Pipeline

Every step builds on the last. Results feed back to the beginning.

| Step | Command | What It Does |
|:----:|---------|--------------|
| 0 | `/gmd:company-context-builder init` | Define your company, ICP, product, wins, objections |
| 1 | `/gmd:list-building search <criteria>` | Build a prospect list of 200-500 companies |
| 2 | `/gmd:market-problems-deep-research <topic>` | Research market problems and what leaders are saying |
| 3 | `/gmd:data-points-builder define` | Define what signals to collect per company |
| 4 | `/gmd:table-enrichment run <campaign>` | Enrich companies with those signals |
| 5 | `/gmd:crm-connect import` | Import companies and contacts from HubSpot CRM |
| 6 | `/gmd:segmentation create` | Segment companies by signals, industry, or custom criteria |
| 7 | `/gmd:email-generation create-template` | Define email formula and generate personalized emails |
| 8 | `/gmd:copy-feedback <company>` | Simulate how a prospect would react to your email |
| 9 | `/gmd:run-instantly prepare <campaign>` | Upload to Instantly, verify before sending |
| 10 | `/gmd:company-context-builder update-from-results` | Feed results back — the loop closes |

> [!TIP]
> Start with `/gmd:company-context-builder init`. Everything downstream depends on good context.

---

## Commands

### Multi-Assistant Command Compatibility

- Native command surfaces are primary:
  - Claude: `/gmd:*`
  - Codex: `$gmd-*`
- Canonical alias mode (`gmd:<action>`) is advanced and opt-in only (off by default).
- On collisions, native commands take precedence and alias routing warns.

#### Which command style should I use?

| Situation | Use This | Example |
|-----------|----------|---------|
| Default Claude workflow | Claude-native command | `/gmd:campaign-progress` |
| Codex workflow | Codex-native command | `$gmd-campaign-progress` |
| Cross-assistant canonical testing (advanced) | Alias mode command (opt-in) | `gmd:campaign.progress` |

Provider appendix:
- Claude-native examples: see Core Workflow + Session Management commands below.
- Codex-native examples: use `$gmd-*` equivalents for the same actions (for example `$gmd-campaign-progress`, `$gmd-resume-work`).
- Alias mode: enable adapter alias mode explicitly in config before using `gmd:<action>`.
- Compatibility matrix: `docs/compatibility/assistant-support-matrix.md`
- Migration path: `docs/migration/claude-first-to-multi-assistant.md`

#### Error Contract Reference

| Code | Meaning | Typical remediation |
|------|---------|---------------------|
| `UNKNOWN_CODEX_COMMAND` | Unmapped native Codex command | Use a supported `$gmd-*` command |
| `SCAFFOLD_PROVIDER_INACTIVE` | Scaffold provider is disabled by config | Enable `adapters.scaffolds.<provider>=true` |
| `SCAFFOLD_CAPABILITY_UNSUPPORTED` | Native scaffold command not supported in scaffold map | Use supported scaffold command or extend provider map |

Codex command sweep:

```bash
node scripts/verify_codex_command_sweep.js
```

Claude parity gate (baseline = latest tagged release, currently `v1.1.1`):

```bash
node scripts/verify_claude_parity.js
```

Parity policy:
- `progress` and `verify` enforce strict key fields.
- Non-critical structures are checked semantically.
- Any regression fails the validator and blocks phase completion.

Cross-adapter continuity gate:

```bash
node scripts/verify_cross_adapter_continuity.js
```

Continuity policy checks:
- Pause in one provider resumes correctly in the other (Claude <-> Codex).
- Resume source selection follows precedence + timestamp arbitration.
- Invalid top resume source falls back with structured warnings.
- State schema remains backward-compatible with additive provenance metadata.

Verification gate consistency:

```bash
node scripts/verify_quality_gate_consistency.js
```

Verification gate policy checks:
- Claude and Codex both block send-adjacent prepare actions when verification is missing.
- Blocked payloads match contract (`QUALITY_GATE_BLOCKED`, `failed_gates`, `remediation`).
- Prepare action is allowed after verification state preconditions are satisfied.
- Any mismatch or bypass exits non-zero and should block merge/release.

Adapter parity harness:

```bash
node scripts/verify_adapter_parity.js
```

Parity harness coverage:
- Executes provider parity sections sequentially (fail-fast).
- Aggregates requirement-tagged diagnostics for `CMD-01`, `QUAL-01`, `QUAL-02`.
- Exits non-zero on the first failing section.

Critical command-flow smoke suite:

```bash
node scripts/verify_command_flow_smoke.js
```

Smoke suite coverage:
- Validates `init`, `progress`, `pause/resume`, and `send-prepare` across Claude + Codex.
- Asserts strict state-driving fields plus semantic flow consistency.
- Produces JSON check/failure output suitable for release gating.

Scaffold adapter conformance:

```bash
node scripts/verify_scaffold_conformance.js
```

Scaffold conformance coverage:
- Validates Gemini/OpenCode/Mistral scaffold provider registration and minimal command routing.
- Verifies inactive-by-default behavior returns structured diagnostics (`SCAFFOLD_PROVIDER_INACTIVE`).
- Verifies unsupported scaffold native commands return structured capability-gap diagnostics (`SCAFFOLD_CAPABILITY_UNSUPPORTED`).

Validation runbook (operator quick checks + maintainer release checks):
- `docs/runbooks/validation.md`

### Core Workflow

| Command | Arguments | Example |
|---------|-----------|---------|
| `company-context-builder` | `init`, `show`, `update-from-call <path>`, `update-from-results <campaign>` | `/gmd:company-context-builder init` |
| `list-building` | `search <criteria>`, `lookalike <company>`, `refine` | `/gmd:list-building lookalike Stripe` |
| `market-problems-deep-research` | `<industry or problem>` | `/gmd:market-problems-deep-research "data pipeline reliability"` |
| `data-points-builder` | `define`, `research <company>`, `bulk-research` | `/gmd:data-points-builder define` |
| `table-enrichment` | `run <campaign>`, `status`, `validate` | `/gmd:table-enrichment status` |
| `email-generation` | `create-template`, `generate <company>`, `bulk-generate <segment>`, `iterate` | `/gmd:email-generation bulk-generate fintech` |
| `copy-feedback` | `<company or person>` | `/gmd:copy-feedback "Jane Smith at Acme"` |
| `hubspot-campaign` | `create <campaign>`, `list`, `get <campaign>`, `set-state <campaign> <state>`, `link-id <campaign> <hubspot_id>`, `update <campaign>` | `/gmd:hubspot-campaign create q2-pipeline` |
| `crm-connect` | `preview`, `import`, `status` | `/gmd:crm-connect preview` |
| `segmentation` | `create`, `assign`, `review`, `auto` | `/gmd:segmentation auto` |
| `run-instantly` | `prepare <campaign>`, `upload <campaign>`, `verify <campaign>`, `results <campaign>` | `/gmd:run-instantly prepare q1-fintech` |

### Session Management

| Command | What It Does |
|---------|--------------|
| `/gmd:campaign-progress` | Visual pipeline dashboard — what's done, what's next |
| `/gmd:campaign-verify <campaign>` | Verify campaign readiness (exists / substantive / wired) |
| `/gmd:report-server start` | Launch a local browser dashboard at `http://127.0.0.1:8487` |
| `/gmd:pause-work <reason>` | Save state for cross-session persistence |
| `/gmd:resume-work` | Restore state and route to the next action |
| `/gmd:update` | Update GMD to latest version |

---

## Configuration

### API Keys (Optional)

Edit `~/.claude/get-marketing-done/config.json`:

```json
{
  "extruct_api_key": "",
  "instantly_api_key": "",
  "perplexity_api_key": ""
}
```

| Service | Used For | Without It |
|---------|----------|------------|
| Extruct | Structured data enrichment | Playwright scraping or web research |
| Instantly | Email sequencing and sending | CSV export for any email tool |
| Perplexity | Deep market research | Claude's built-in WebSearch |

### Quality Gates

Configurable in `config.json`. Prevents sending bad outreach:

| Gate | Default |
|------|---------|
| Context required before lists | true |
| Research required before emails | true |
| Enrichment rate minimum (50%) | true |
| Copy feedback before send | false |
| Manual verify before send | true |

---

## Releasing

Two ways to publish a new version:

### From the terminal

```bash
export GH_TOKEN=ghp_your_token
gh workflow run release.yml -f bump=patch --repo jqueguiner/get-marketing-done
```

Replace `patch` with `minor` or `major` as needed.

### By pushing a tag

```bash
npm version patch
git push origin main --tags
```

Both paths automatically bump the version, generate a changelog, create a GitHub Release, and publish to npm.

### Required secrets (GitHub repo settings)

| Secret | Where to get it |
|--------|----------------|
| `NPM_TOKEN` | npmjs.com → Access Tokens → Granular Access Token (with 2FA bypass enabled) |
| `GITHUB_TOKEN` | Automatic, no setup needed |

---

## How It Works

- **Context compounds** — nothing gets thrown away between campaigns
- **Strict email assembly** — you define the formula, a script assembles it. No AI freestyling
- **Manual verification** — never auto-sends. Always requires human sign-off
- **Zero lock-in** — SQLite + CSV + Markdown. Your data is yours

---

## License

MIT

<div align="center">

*Stop starting from scratch. Start compounding.*

</div>
