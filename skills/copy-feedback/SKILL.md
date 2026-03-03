---
name: copy-feedback
description: Generate a prospect persona and simulate how they'd react to your email cold. Deep-dive their social profiles, industry context, and simulate their honest response. Then refine. Run per prospect.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, Agent, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_snapshot, mcp__plugin_playwright_playwright__browser_click, mcp__plugin_playwright_playwright__browser_evaluate, mcp__plugin_playwright_playwright__browser_wait_for, mcp__plugin_playwright_playwright__browser_take_screenshot, mcp__plugin_playwright_playwright__browser_tabs, mcp__plugin_playwright_playwright__browser_run_code
argument-hint: "<company_name> [or] <prospect_name at company>"
---

# Copy Feedback — Prospect Persona Simulation

This sounds like BS but it works. You build a detailed persona of the prospect, then read the email through their eyes and simulate their honest reaction. This catches tone-deaf messaging, false assumptions, and weak CTAs before they hit a real inbox.

## Bootstrap (run first)

Run `node scripts/marketing-tools.js init` and parse the JSON. This tells you:
- Company context (messaging, objections, product glossary)
- Pipeline state
- Config: `workflow.copy_review` toggle

Then advance state: `node scripts/marketing-tools.js state-advance 8 "Copy Feedback"`

## Playwright MCP — critical for persona building

If the Playwright MCP is available, **always use it for persona research**. This is the skill where Playwright matters most — you need to read actual social profile content, not just search snippets.

### Persona research with Playwright

**LinkedIn profile** (public view):
1. WebSearch `"{person_name}" "{company}" site:linkedin.com` to get the profile URL
2. `browser_navigate` to the LinkedIn URL
3. `browser_snapshot` to capture:
   - Current and past job titles (career trajectory)
   - Education background
   - Skills and endorsements
   - Recent activity/posts (if visible)
   - Recommendations given/received (communication style signal)

**Twitter/X profile**:
1. WebSearch `"{person_name}" "{company}" site:twitter.com OR site:x.com`
2. `browser_navigate` to their profile
3. `browser_snapshot` to capture:
   - Bio and pinned tweet (what they want to be known for)
   - Recent tweets and replies (what they actually talk about)
   - Tone and style (formal? memes? threads? hot takes?)
   - Who they engage with (industry peers, thought leaders)

**Personal blog or company blog posts**:
1. `browser_navigate` to any blog URLs found in search
2. `browser_snapshot` to read their actual writing
3. Note: writing style, topics they choose, level of technical depth

**Podcast/talk appearances**:
1. `browser_navigate` to episode pages
2. `browser_snapshot` to get episode descriptions and show notes
3. Extract what topics they chose to discuss publicly

### Why Playwright over WebSearch here

WebSearch gives you snippets. Snippets are not enough to simulate a real person. You need to READ their actual posts, their actual writing, their actual career history. Playwright lets you do that.

## Process

### Step 1: Build the prospect persona

For the given prospect/company in `$ARGUMENTS`:

1. Load their company data and datapoints from SQLite:
   `python3 scripts/db_manager.py get-company --name "{company}" --with-datapoints`

2. Deep research the specific person (if named) or the likely recipient (based on ICP title):
   - **WebSearch** to discover profile URLs and content locations:
     - `"{person_name}" "{company}" site:linkedin.com`
     - `"{person_name}" "{company}" site:twitter.com OR site:x.com`
     - `"{person_name}" "{company}" podcast OR interview OR keynote`
     - `"{person_name}" "{company}" blog OR article`
   - **Playwright** to read the actual content at each discovered URL:
     - Navigate to LinkedIn profile, snapshot and extract career history + recent activity
     - Navigate to Twitter/X profile, snapshot recent posts and bio
     - Navigate to blog posts / articles they authored
     - Navigate to podcast episode pages for topics discussed

3. Build a persona profile:
   ```
   ## Prospect Persona: {Name}
   **Title**: {title} at {company}
   **Background**: {career history, education}
   **Communication style**: {formal/casual, technical/business, verbose/terse}
   **What they care about**: {based on their public content}
   **What they're skeptical of**: {based on their industry and role}
   **Recent activity**: {what they've been talking about publicly}
   **Likely inbox state**: {how many cold emails they probably get}
   **Decision-making style**: {data-driven, consensus, fast-mover}
   ```

### Step 2: Load the email

Read the generated email for this prospect. Either from:
- SQLite: `python3 scripts/db_manager.py get-email --company "{company}"`
- Or the user pastes it directly

### Step 3: Simulate the cold read

Now adopt this persona fully. Read the email as if you are this person, seeing it cold in your inbox between 47 other unread emails. Respond with:

```
## Cold Read Simulation: {Name}, {Title} at {Company}

### First 2 seconds (subject line scan)
- Would I open this? {Yes/No/Maybe}
- Why: {reason based on persona}

### First 5 seconds (opening line)
- Reaction: {what goes through their mind}
- Does the hook land? {Yes/No}
- Why: {specific reason}

### Full read (if they got this far)
- Believability: {Do they buy that we know their situation? 1-10}
- Relevance: {Does the problem resonate with what they actually face? 1-10}
- CTA reaction: {Would they take this action? Why/why not}
- Tone match: {Does the tone match how people talk to them? 1-10}

### Overall verdict
- {REPLY / MAYBE / DELETE / MARK AS SPAM}
- Key reason: {one sentence}

### Specific fixes to improve this email
1. {Fix 1}: {Why this would work better for THIS person}
2. {Fix 2}: {Why this would work better for THIS person}
3. {Fix 3}: {Why this would work better for THIS person}
```

### Step 4: Refine the email

Based on the simulation:
1. Apply the suggested fixes
2. Regenerate the email using the assembly script
3. Run the simulation again
4. Repeat until the verdict is REPLY or strong MAYBE
5. Save the refined email to SQLite:
   `python3 scripts/db_manager.py update-email --company "{company}" --file /tmp/refined_email.json`

### Step 5: Log the learning

If the simulation revealed a pattern (e.g., "CTOs in fintech don't respond to ROI claims, they want technical proof"), append to `data/company_context.md` Learnings Log:
```
### {date} — Copy Feedback Insight
- Persona: {title} at {industry} companies
- Insight: {what we learned}
- Action: {how to adjust messaging for this segment}
```

## Rules

- Run this PER PROSPECT, not in bulk. Quality over speed.
- Be brutally honest in the simulation. Prospects are skeptical by default.
- Don't simulate a positive response just to please the user
- If the email can't be fixed (wrong angle entirely), say so and suggest a different approach
- Always ground the persona in real public information, not assumptions
- If you can't find enough info on the specific person, simulate based on the role archetype with a caveat
