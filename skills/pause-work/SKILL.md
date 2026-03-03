---
name: pause-work
description: Save campaign state so you can resume later. Captures position, pipeline status, what was happening, and next steps.
user-invocable: true
allowed-tools: Read, Write, Bash, Glob
argument-hint: "[reason]"
---

# Pause Work

Save your current campaign state so you can resume in a new session without losing context.

## Process

1. Run: `node scripts/marketing-tools.js pause $ARGUMENTS`
2. Read the generated `.continue-here.md` file
3. Show the user a summary of what was saved:
   - Current step and campaign
   - Pipeline counts (companies, enrichment rate, emails)
   - What to run when resuming
4. Tell the user: "Your state is saved. Run `/marketing:resume-work` in your next session to pick up where you left off."

## What gets saved

- Current step in the workflow (0-10)
- Campaign name
- Pipeline metrics at time of pause
- The reason for pausing (from arguments)
- Suggested next action

## Rules

- Always run this before ending a long session
- The context monitor hook will remind you when context is running low
- STATE.md and .continue-here.md persist across sessions
