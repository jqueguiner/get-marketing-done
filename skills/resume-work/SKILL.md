---
name: resume-work
description: Resume campaign work from a previous session. Restores full context and routes to the next action.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, Agent
argument-hint: ""
---

# Resume Work

Restore campaign state from a previous session and continue where you left off.

## Process

1. Run: `node scripts/marketing-tools.js init-resume`
2. Parse the JSON result. It contains:
   - `has_continue_file`: Whether a pause checkpoint exists
   - `continue_content`: What was happening when paused
   - `state`: Current step, campaign, last activity
   - `pipeline`: Companies, contacts, enrichment rate, emails
   - `suggested_action`: What to do next
3. If a continue file exists, read it and display:
   ```
   ## Resuming Campaign Work

   Last session: {date}
   Paused at: Step {N} — {step_name}
   Campaign: {campaign}
   Reason: {pause_reason}

   Pipeline: {companies} companies | {enrichment_rate}% enriched | {emails} emails

   Suggested next action: {action}
   ```
4. Ask the user: "Continue with {suggested_action}, or do something else?"
5. Clear the continue file: `node scripts/marketing-tools.js clear-continue`
6. Advance state: `node scripts/marketing-tools.js state-advance {step} {description}`
7. Route to the appropriate skill

## If no continue file exists

Fall back to STATE.md. Show current pipeline status and suggest next action based on what's completed vs. missing.

## If nothing exists

Tell the user to run `/marketing:company-context-builder init` to start fresh.

## Rules

- Always show the user where they are before jumping into work
- Clear the continue file after successfully resuming
- Update STATE.md with the new session start
