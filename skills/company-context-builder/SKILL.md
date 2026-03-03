---
name: company-context-builder
description: Build and maintain company context — ICP, product lingo, win cases, campaign history. Everything starts with context. Also ingests call recordings and Instantly results to compound knowledge across sessions.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, Agent
argument-hint: "[init | update-from-call <path> | update-from-results <campaign> | show]"
---

# Company Context Builder

You are the foundation of the GTM system. Without context, every other skill produces generic output. Your job is to build and maintain a single source of truth at `data/company_context.md`.

## How to use $ARGUMENTS

- **No args or `init`**: Interactive session to build context from scratch
- **`update-from-call <path>`**: Ingest a call recording transcript and extract new context
- **`update-from-results <campaign>`**: Pull Instantly campaign results and update context with learnings
- **`show`**: Display current context

## When building context from scratch (init)

Ask the user these questions one at a time. Do NOT skip any. Wait for answers before proceeding.

1. **Company basics**: What does your company do? One paragraph.
2. **Product**: What's the core product/service? What's the pricing model?
3. **Product lingo**: What terms do you use internally? (e.g., "workspace" not "account", "flow" not "pipeline"). Build a glossary.
4. **ICP definition**: Who is your ideal customer? Industry, company size, title of buyer, title of user.
5. **Anti-ICP**: Who is NOT your customer? Who should you avoid?
6. **Win cases**: Describe 2-3 recent wins. What was the company? What problem did they have? How did you solve it? What was the result?
7. **Competitive landscape**: Who do prospects compare you to? What's your differentiation?
8. **Objections**: What are the top 3 objections you hear? How do you handle them?
9. **Messaging**: What's your one-liner? What value props resonate most?
10. **Past campaigns**: Any outbound campaigns you've run? What worked, what didn't?

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

## When updating from campaign results (update-from-results)

1. Read `data/company_context.md`
2. Run: `python3 scripts/db_manager.py campaign-results {campaign_name}`
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
