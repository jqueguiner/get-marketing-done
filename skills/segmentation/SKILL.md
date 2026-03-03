---
name: segmentation
description: Segment companies by enrichment data, industry, size, or custom criteria. Create segments with hypotheses, assign companies with tiering, and review segment breakdown before email generation.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
argument-hint: "[create | assign | review | auto]"
---

# Segmentation

Group enriched companies into segments for targeted email campaigns. Each segment has a hypothesis about which problem resonates with that group, driving message personalization.

## Bootstrap (run first)

Run `node scripts/marketing-tools.js init` and parse the JSON. Check:
- `has_context` — if false, tell user to run `/company-context-builder` first
- `pipeline.companies` — need companies to segment
- `pipeline.enrichment_rate` — segmentation works best with enriched data (warn if < 50%)
- `segments` — any existing segments

Then advance state: `node scripts/marketing-tools.js state-advance 6 "Segmentation"`

## Read context first

Read these files before segmenting:
- `data/company_context.md` — ICP definition, win cases, problem hypotheses
- `data/datapoint_schema.json` — available datapoints and categories
- Latest research in `data/research/` — problem hypotheses per vertical

## Mode 1: Create segments (`create`)

Define new segments based on enrichment data patterns.

### Step 1: Analyze enrichment data

Run: `python3 scripts/db_manager.py show-datapoints --format json`

Look for natural groupings:
- **Industry clusters** — companies in the same sub-industry
- **Size bands** — startups vs mid-market vs enterprise
- **Signal patterns** — shared datapoint values (e.g., all using a specific tech, all recently funded)
- **Geography** — regional clusters

### Step 2: Propose segments to the user

Present 3-5 suggested segments based on the data. For each:
- **Name** — short, descriptive (e.g., "recently_funded_fintech", "enterprise_hiring_engineers")
- **Criteria** — what defines membership (e.g., "industry=FinTech AND funding_stage=Series A/B")
- **Hypothesis** — what problem resonates with this group (from research)
- **Estimated size** — how many companies would match

Ask the user to confirm, modify, or add segments.

### Step 3: Create segments in DB

For each approved segment:
```
python3 scripts/db_manager.py create-segment --name "{name}" --criteria "{criteria}" --hypothesis "{hypothesis}" --problem-file "{research_file}"
```

### Step 4: Show confirmation

Run: `python3 scripts/db_manager.py list-segments`

## Mode 2: Assign companies (`assign`)

Assign companies to segments with tiering.

### Tiering system

- **Tier 1** — Perfect ICP match, highest personalization effort, best-fit signals
- **Tier 2** — Good match, standard personalization
- **Tier 3** — Acceptable match, lighter touch

### Step 1: Load data

Run: `python3 scripts/db_manager.py list-companies --with-datapoints`

And: `python3 scripts/db_manager.py list-segments`

### Step 2: Match companies to segments

For each company, evaluate against segment criteria:
- Check datapoint values against criteria
- Assign tier based on match strength

### Step 3: Write batch assignment file

Create a JSON file for bulk assignment:
```json
[
  {
    "company": "Acme Corp",
    "domain": "acme.com",
    "segment": "recently_funded_fintech",
    "tier": "1"
  }
]
```

Save to `/tmp/segment_assignments.json`

### Step 4: Bulk assign

```
python3 scripts/db_manager.py bulk-assign-segments --file /tmp/segment_assignments.json
```

### Step 5: Show results

Run: `python3 scripts/db_manager.py list-segments`

Present a summary table:
```
Segment                    | Tier 1 | Tier 2 | Tier 3 | Total
---------------------------|--------|--------|--------|------
recently_funded_fintech    |     12 |     34 |     18 |   64
enterprise_hiring_engineers|      8 |     22 |     15 |   45
smb_scaling_ops            |      5 |     28 |     42 |   75
```

## Mode 3: Review segments (`review`)

Review existing segments and their composition.

1. Run: `python3 scripts/db_manager.py list-segments`
2. For each segment, show:
   - Name, criteria, hypothesis
   - Company count by tier
   - Problem research file (if linked)
3. Ask the user if they want to:
   - View companies in a specific segment: `python3 scripts/db_manager.py segment-companies --segment "{name}"`
   - View only a specific tier: `python3 scripts/db_manager.py segment-companies --segment "{name}" --tier 1`
   - Reassign tiers or move companies between segments

## Mode 4: Auto-segment (`auto`)

Automatically segment all companies based on enrichment data.

1. Read enrichment data and datapoint schema
2. Identify the strongest clustering dimensions (datapoints with highest variance)
3. Propose segments — present to user for approval
4. On approval, create segments and assign all companies in one pass
5. Show the final breakdown

This is the fastest path: run `/segmentation auto` and review the output.

## Rules

- Every company should be in at least one segment before email generation
- A company can be in multiple segments (it gets different emails per segment)
- Segments need a hypothesis — this drives the email angle for that group
- Link segments to problem research files when available
- Warn if any segment has fewer than 10 companies (too small for meaningful testing)
- Warn if a segment has no Tier 1 companies (no high-priority targets)
- After segmentation, tell the user: "Segments ready. Run `/email-generation` to create targeted emails per segment."
