---
name: campaign-verify
description: Goal-backward verification — start from what the campaign should achieve, verify each step delivered what it promised. Three levels (exists, substantive, wired).
user-invocable: true
allowed-tools: Read, Write, Bash, Grep, Glob
argument-hint: "[campaign_name]"
---

# Campaign Verify — Goal-Backward Analysis

Don't check if tasks completed. Check if GOALS are met. Start from desired outcomes, verify reality matches.

## Process

1. Run: `node scripts/marketing-tools.js verify $ARGUMENTS`
2. Parse the three-level verification result:

### Level 1: EXISTS — Do the artifacts exist?
- Company context file
- Database with companies
- Market research files
- Datapoint schema
- Enrichment data
- Campaign record and generated emails

### Level 2: SUBSTANTIVE — Is the content real, not placeholder?
- ICP is actually defined (not a template)
- Win cases have real details
- Product glossary is populated
- List has 200+ companies (not 5 test entries)
- Enrichment rate is above 50%

### Level 3: WIRED — Do the pieces connect?
- Emails are linked to real companies in the DB
- Emails have valid contact email addresses
- Enrichment data feeds into email personalization
- Campaign results feed back to context

3. Display results:
```
## Campaign Verification: {campaign}

Score: {passed}/{total} ({pct}%)
Status: {PASSED | GAPS_FOUND | NEEDS_WORK}

### EXISTS {passed}/{total}
{marker} Company context
{marker} Prospect list (347 companies)
{marker} Market research
...

### SUBSTANTIVE {passed}/{total}
{marker} ICP defined (2,450 chars)
{marker} List size adequate (347 companies, target 200-500)
{marker} Enrichment coverage (67% enriched)
...

### WIRED {passed}/{total}
{marker} Emails linked to companies (245/245)
{marker} Emails have contact addresses (198 with valid email)
...
```

4. For any failures, suggest the specific skill to fix it

## Rules

- Run this before uploading to Instantly
- Run this after enrichment to catch gaps early
- This is NOT about task completion — it's about whether the campaign will actually work
