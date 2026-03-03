---
name: campaign-progress
description: Show campaign pipeline progress with visual tracking, velocity metrics, and routing to the next action.
user-invocable: true
allowed-tools: Read, Bash
argument-hint: ""
---

# Campaign Progress

Show where you are in the GTM pipeline and what to do next.

## Process

1. Run: `node scripts/marketing-tools.js progress`
2. Display the visual pipeline:

```
## Campaign Pipeline

{progress_bar} {pct}%

  {marker} Context     {marker} Lists       {marker} Research
  {marker} Datapoints  {marker} Enrichment  {marker} Refinement
  {marker} Segments    {marker} Emails      {marker} Feedback
  {marker} Send        {marker} Learn

Current: Step {N} — {step_name}
Campaign: {campaign}

Pipeline:
  Companies:  {N}
  Contacts:   {N}
  Enriched:   {N} ({rate}%)
  Emails:     {N}

Next action: {suggested_action}
```

3. If `next_action` is clear, ask: "Ready to continue with {action}?"
4. Update state: `node scripts/marketing-tools.js state-advance {step}`

## Rules

- This is a status check, not an execution step
- Always show the pipeline counts — they're the heartbeat of the campaign
- Route to the next logical action based on what's done vs. missing
