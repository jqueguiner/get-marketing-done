---
name: email-generation
description: Generate personalized outbound emails. Strict instruction-based assembly — you specify the exact formula, a Python script assembles the final email. Iterate right in the chat until it's perfect.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, Agent
argument-hint: "[create-template | generate <company> | bulk-generate <segment> | preview | iterate]"
---

# Email Generation

You generate outbound emails from strict instructions. The key principle: the user defines the EXACT formula for combining message elements. Then a Python script assembles the final email from enriched data. No freestyling.

## Read context first

Read these files:
- `data/company_context.md` — company voice, product glossary, objection handling
- `data/datapoint_schema.json` — what datapoints are available
- Latest research in `data/research/` — problem hypotheses and messaging angles

## Mode 1: Create email template (`create-template`)

Work with the user to define the email assembly instructions. Walk through each element:

### Step 1: Define the email structure
Ask the user to specify:
1. **Subject line formula**: e.g., `"{datapoint.recent_launch} + {problem_hypothesis}"`
2. **Opening line formula**: How to hook — reference something specific about them
3. **Problem statement**: Which problem hypothesis from research to lead with
4. **Bridge**: How to connect their situation to our solution
5. **Value prop**: Which value prop from company context
6. **CTA**: What action do we want?
7. **Tone**: Formal / conversational / direct
8. **Length**: Max word count (recommend 50-100 words)

### Step 2: Define conditional logic
Some emails need different approaches based on segment:
```
IF segment == "recently_funded":
  opening = reference their funding round
  problem = scaling challenges
ELIF segment == "hiring_engineers":
  opening = reference their job posts
  problem = technical debt / velocity
ELSE:
  opening = reference their industry trend
  problem = general market challenge
```

### Step 3: Save the template

Save to `data/templates/{template_name}.json`:
```json
{
  "name": "{template_name}",
  "created": "{date}",
  "subject": {
    "formula": "{company.name} + {problem_hypothesis.short}",
    "examples": ["Quick question about scaling at Acme"]
  },
  "body": {
    "opening": {
      "formula": "Reference {datapoint} to show we did homework",
      "instruction": "One sentence. Reference the most recent/relevant datapoint. No flattery.",
      "max_words": 20
    },
    "problem": {
      "formula": "State the problem hypothesis",
      "instruction": "One sentence. Frame as a question or observation, not a pitch.",
      "source": "research/{problem_file}"
    },
    "bridge": {
      "instruction": "One sentence connecting their situation to our approach.",
      "max_words": 25
    },
    "cta": {
      "instruction": "One clear ask. No 'would love to chat'. Be specific.",
      "example": "Mind if I send a 2-min video showing how {similar_company} handled this?"
    }
  },
  "constraints": {
    "max_total_words": 80,
    "tone": "direct, peer-to-peer",
    "forbidden": ["just following up", "hope this finds you", "I'd love to", "circle back", "synergy", "leverage", "touch base"]
  },
  "conditionals": []
}
```

## Mode 2: Generate for one company (`generate <company>`)

1. Load the template from `data/templates/`
2. Load company data and datapoints from SQLite:
   `python3 scripts/db_manager.py get-company --name "{company}" --with-datapoints`
3. Apply the template formula to the company's data
4. Run the assembly script:
   `python3 scripts/email_assembler.py generate --template {template} --company "{company}"`
5. Display the generated email to the user
6. Ask: "How does this look? Want to adjust anything?"
7. If user wants changes, iterate right here — modify and regenerate

## Mode 3: Bulk generate (`bulk-generate <segment>`)

1. Load companies in the segment from SQLite
2. For each company, run the assembly script
3. Save generated emails to SQLite: `python3 scripts/db_manager.py save-emails --campaign {campaign} --file /tmp/emails_batch.json`
4. Show sample (first 3 emails) for review
5. Present stats: total generated, any companies skipped (missing datapoints)

## Mode 4: Preview (`preview`)

Show a preview of what the email will look like for a sample company using the current template.

## Mode 5: Iterate (`iterate`)

The user can:
- Paste a generated email and request changes
- Change the template formula
- Adjust tone, length, or specific sections
- A/B test different approaches

After each change, regenerate and compare.

## Rules

- NEVER use corporate buzzwords. Check against the forbidden list.
- NEVER exceed the max word count. Count words.
- ALWAYS use product glossary terms from company context
- Every email must reference at least one company-specific datapoint
- If a company is missing required datapoints, skip it and flag for enrichment
- Subject lines must be under 50 characters
- No false claims about the prospect's situation — only reference verified datapoints
