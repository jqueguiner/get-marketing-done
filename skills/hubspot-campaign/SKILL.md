---
name: hubspot-campaign
description: HubSpot campaign foundation commands. Create, inspect, and update campaign lifecycle metadata before preflight/launch phases.
allowed-tools: Read, Bash
argument-hint: "[create <campaign> [--segment <segment>] [--owner <owner>] | list | get <campaign> | set-state <campaign> <state> | link-id <campaign> <hubspot_id> | update <campaign> [--segment <segment>] [--owner <owner>] [--notes <text>] | approve <campaign> --by <reviewer> [--notes <text>] | approval-status <campaign> | preflight <campaign> | preflight-report <campaign> [--out <path>] | launch <campaign> | results <campaign> [--file <results.json>] | sync <campaign> [--hubspot-id <id>]]"
---

# HubSpot Campaign (Foundation)

This command manages HubSpot campaign metadata scaffolding in the local campaign store.

## Modes

### 1) Create

```bash
node scripts/marketing-tools.js hubspot-campaign create <campaign> [--segment <segment>] [--owner <owner>]
```

Creates a campaign shell with default lifecycle state `draft`.

### 2) List

```bash
node scripts/marketing-tools.js hubspot-campaign list
```

Returns all HubSpot campaign records ordered by recent updates.

### 3) Get

```bash
node scripts/marketing-tools.js hubspot-campaign get <campaign>
```

Returns one campaign record.

### 4) Set lifecycle state

```bash
node scripts/marketing-tools.js hubspot-campaign set-state <campaign> <state>
```

Allowed states:
- `draft`
- `configured`
- `preflight_ready`
- `launched`
- `completed`
- `archived`

### 5) Link HubSpot campaign id

```bash
node scripts/marketing-tools.js hubspot-campaign link-id <campaign> <hubspot_id>
```

Stores remote HubSpot campaign identifier for later sync/launch phases.

### 6) Update metadata

```bash
node scripts/marketing-tools.js hubspot-campaign update <campaign> [--segment <segment>] [--owner <owner>] [--notes <text>]
```

Updates non-launch metadata fields.

### 7) Approve copy (required before launch)

```bash
node scripts/marketing-tools.js hubspot-campaign approve <campaign> --by <reviewer> [--notes <text>]
```

Creates/refreshes copy approval artifact from current campaign email content hash.

### 8) Check approval status

```bash
node scripts/marketing-tools.js hubspot-campaign approval-status <campaign>
```

Shows whether approval is valid and hash-aligned with current copy.

### 9) Launch (gated)

```bash
node scripts/marketing-tools.js hubspot-campaign launch <campaign>
```

Launch is blocked unless copy approval is valid for current campaign copy.

### 10) Preflight (recommended before launch)

```bash
node scripts/marketing-tools.js hubspot-campaign preflight <campaign>
```

Preflight verifies campaign shell/state, owner/segment metadata, generated emails, and valid copy approval.
If checks pass, lifecycle moves to `preflight_ready`.

### 10b) Preflight report artifact

```bash
node scripts/marketing-tools.js hubspot-campaign preflight-report <campaign> [--out <path>]
```

Writes a markdown preflight report containing checks, failures, and remediation steps.

### 11) Results

```bash
node scripts/marketing-tools.js hubspot-campaign results <campaign> [--file <results.json>]
```

- With `--file`, ingests metrics into local DB and marks lifecycle `completed`.
- Without `--file`, returns latest stored results snapshot.

### 12) Sync

```bash
node scripts/marketing-tools.js hubspot-campaign sync <campaign> [--hubspot-id <id>]
```

- Validates HubSpot auth and campaign metadata readiness.
- If `--hubspot-id` is provided, links it during sync.
- Returns structured sync status (`HUBSPOT_SYNC_OK`, `HUBSPOT_SYNC_PENDING_ID`, or `HUBSPOT_SYNC_BLOCKED`).

## Notes

- This remains a foundation slice: full HubSpot API sync/delivery behavior is expanded in later phases.
- Any email copy edit invalidates prior campaign copy approval automatically.
