---
name: market-problems-deep-research
description: Deep research on industry problems and what leaders are saying. Not company-specific — this is about educating yourself on the market before personalizing outreach.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, Agent
argument-hint: "<industry or problem area>"
---

# Market Problems Deep Research

You are a research engine. Your job is NOT to find company-specific data. Your job is to deeply understand the problems an industry faces so the user can speak the language of their prospects.

## Read context first

Read `data/company_context.md` to understand:
- What product/service the user sells
- What problems it solves
- Which industries are being targeted

## Research process

Given the industry or problem area in `$ARGUMENTS`:

### Step 1: Map the problem landscape

Use WebSearch extensively. Run at least 10 parallel searches:
- `"{industry}" biggest challenges {current_year}`
- `"{industry}" pain points survey`
- `"{problem_area}" trends {current_year}`
- `"{industry}" CTO CIO priorities {current_year}`
- `"{problem_area}" market report`
- `"{industry}" digital transformation challenges`
- `"{problem_area}" failures case studies`
- `"{industry}" what keeps {persona} up at night`
- `"{problem_area}" ROI statistics`
- `"{industry}" analyst reports Gartner Forrester McKinsey`

### Step 2: Extract what industry leaders are saying

Search for thought leadership:
- `"{industry}" leader quote "{problem_area}"`
- `"{problem_area}" conference keynote {current_year}`
- `"{industry}" podcast "{problem_area}"`
- LinkedIn thought leaders in the space
- Industry-specific publications and blogs

Use WebFetch to read the most relevant articles in full.

### Step 3: Identify problem categories

Organize findings into a structured framework:
1. **Strategic problems**: Board-level concerns, market shifts
2. **Operational problems**: Day-to-day pain, inefficiency, cost
3. **Technical problems**: Infrastructure, integration, scale
4. **People problems**: Hiring, retention, skills gaps
5. **Regulatory/Compliance**: New rules, audit pressure

### Step 4: Map problems to our solution

Cross-reference discovered problems with what the user's product solves. Identify:
- Problems we directly solve (primary messaging)
- Problems we partially address (secondary messaging)
- Problems we don't solve but need to acknowledge (credibility)

## Output

Write the research to `data/research/{industry_or_problem}_{date}.md`:

```markdown
# Market Research: {Industry / Problem Area}
> Generated: {date}
> Source: Deep web research across {N} sources

## Executive Summary
{3-4 sentence overview of the problem landscape}

## Problem Map

### 1. {Problem Category}
**Severity**: High/Medium/Low
**Prevalence**: How many companies face this?

**What leaders are saying:**
> "{Quote}" — {Person}, {Title} at {Company} ([source]({url}))
> "{Quote}" — {Person}, {Title} at {Company} ([source]({url}))

**Key statistics:**
- {Stat with source}
- {Stat with source}

**How this connects to our solution:**
{Analysis}

### 2. {Problem Category}
{Same structure}

## Industry Trends Affecting This Space
- {Trend 1}: {Impact}
- {Trend 2}: {Impact}

## Recommended Messaging Angles
Based on this research, the strongest angles for outreach are:
1. {Angle}: Because {reason}, supported by {evidence}
2. {Angle}: Because {reason}, supported by {evidence}
3. {Angle}: Because {reason}, supported by {evidence}

## Sources
{Numbered list of all sources used}
```

## Rules

- This is EDUCATION, not prospecting. No company-specific research here.
- Always cite sources with URLs
- Distinguish between hard data (surveys, reports) and opinions (blog posts, podcasts)
- Flag when information might be outdated
- If the user's product doesn't map to any discovered problems, say so honestly
- Save research files so they can be referenced by other skills
