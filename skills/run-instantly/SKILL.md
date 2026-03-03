---
name: run-instantly
description: Upload campaigns to Instantly for email sequencing. Prepare CSV, validate data, upload, and create verification checklist. Manual verify before sending.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent
argument-hint: "[prepare <campaign> | upload <campaign> | verify <campaign> | results <campaign>]"
---

# Run Instantly — Campaign Upload & Execution

You bridge the gap between email generation and actual sending. Instantly is the email sequencing tool. Your job is to prepare the data, upload it, and create a verification checklist so the user can manually verify before hitting send.

## Read context first

Read `data/company_context.md` for campaign history.

## Mode 1: Prepare for upload (`prepare <campaign>`)

1. Load generated emails from SQLite:
   `python3 scripts/db_manager.py get-emails --campaign {campaign} --status ready`
2. Validate every record has:
   - Valid email address (or flag for manual lookup)
   - First name
   - Company name
   - Generated email subject
   - Generated email body
   - No forbidden words (check against template constraints)
3. Generate the Instantly-compatible CSV:
   `python3 scripts/instantly_uploader.py prepare --campaign {campaign} --output data/instantly/{campaign}_upload.csv`
4. Show summary:
   ```
   Campaign: {name}
   Total contacts: {N}
   Ready to upload: {N}
   Missing email: {N} (need manual lookup)
   Missing datapoints: {N} (emails may be generic)

   Segments:
     - {segment_1}: {count} contacts
     - {segment_2}: {count} contacts

   Preview (first 3):
   1. {name} at {company} — Subject: "{subject}"
   2. {name} at {company} — Subject: "{subject}"
   3. {name} at {company} — Subject: "{subject}"
   ```

## Mode 2: Upload to Instantly (`upload <campaign>`)

1. Check that preparation is complete
2. Upload via Instantly API:
   `python3 scripts/instantly_uploader.py upload --campaign {campaign} --csv data/instantly/{campaign}_upload.csv`
3. Record the upload in SQLite:
   `python3 scripts/db_manager.py mark-uploaded --campaign {campaign}`
4. Generate verification checklist

## Mode 3: Verify before sending (`verify <campaign>`)

Present the verification checklist. The user must manually confirm each item:

```
## Pre-Send Verification Checklist

Campaign: {name}
Uploaded: {date}
Total contacts: {N}

### Verify in Instantly dashboard:
- [ ] All contacts imported correctly
- [ ] Email sequences are in the right order
- [ ] Sending schedule is set (timezone, hours, days)
- [ ] Daily send limit is configured
- [ ] Warmup is enabled if using new domains
- [ ] Reply tracking is on
- [ ] Unsubscribe link is included

### Verify email content:
- [ ] Spot-check 5 random emails for personalization accuracy
- [ ] Subject lines are under 50 chars and not spammy
- [ ] No broken merge fields ({company_name} instead of actual name)
- [ ] CTA links work (if any)
- [ ] Sender name and reply-to are correct

### Verify targeting:
- [ ] No competitors in the list
- [ ] No existing customers in the list
- [ ] No people who previously unsubscribed
- [ ] Company sizes match ICP

### Final sign-off:
- [ ] I have manually reviewed and approve this campaign for sending
```

Do NOT proceed past this checklist. The user must explicitly confirm.

## Mode 4: Pull results (`results <campaign>`)

After the campaign has been running:
1. Pull results from Instantly:
   `python3 scripts/instantly_uploader.py results --campaign {campaign}`
2. Parse and store in SQLite:
   `python3 scripts/db_manager.py save-results --campaign {campaign} --file /tmp/results.json`
3. Show dashboard:
   ```
   Campaign: {name}
   Duration: {start} to {now}

   Delivery:  ████████████████████  98% ({N}/{N})
   Opens:     ████████████░░░░░░░░  62% ({N})
   Replies:   ████░░░░░░░░░░░░░░░░  18% ({N})
   Bounces:   █░░░░░░░░░░░░░░░░░░░  2% ({N})

   Reply breakdown:
     Positive: {N} ({%})
     Neutral:  {N} ({%})
     Negative: {N} ({%})
     OOO:      {N} ({%})

   Best segment: {segment} ({reply_rate}% reply rate)
   Worst segment: {segment} ({reply_rate}% reply rate)
   ```
4. Suggest running `/company-context-builder update-from-results {campaign}` to feed learnings back

## Rules

- NEVER auto-send. Always require manual verification.
- Always validate data before upload — one bad merge field destroys credibility
- Track every upload and its status in SQLite
- After results come in, always prompt to update company context
- Flag any contacts that bounced for removal from future campaigns
