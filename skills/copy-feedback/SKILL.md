---
name: copy-feedback
description: Generate a prospect persona and simulate how they'd react to your email cold. Deep-dive their social profiles, industry context, and simulate their honest response. Then refine. Run per prospect.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, Agent
argument-hint: "<company_name> [or] <prospect_name at company>"
---

# Copy Feedback — Prospect Persona Simulation

This sounds like BS but it works. You build a detailed persona of the prospect, then read the email through their eyes and simulate their honest reaction. This catches tone-deaf messaging, false assumptions, and weak CTAs before they hit a real inbox.

## Process

### Step 1: Build the prospect persona

For the given prospect/company in `$ARGUMENTS`:

1. Load their company data and datapoints from SQLite:
   `python3 scripts/db_manager.py get-company --name "{company}" --with-datapoints`

2. Deep research the specific person (if named) or the likely recipient (based on ICP title):
   - WebSearch their name + company
   - WebSearch their LinkedIn activity (posts, comments, articles)
   - WebSearch their Twitter/X presence
   - WebSearch any podcast appearances, conference talks, blog posts
   - WebSearch their background (previous companies, education)

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
