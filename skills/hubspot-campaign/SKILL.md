---
name: hubspot-campaign
description: HubSpot campaign foundation commands. Create, inspect, and update campaign lifecycle metadata before preflight/launch phases.
allowed-tools: Read, Bash
argument-hint: "[create <campaign> [--segment <segment>] [--owner <owner>] | list | get <campaign> | set-state <campaign> <state> | link-id <campaign> <hubspot_id> | update <campaign> [--segment <segment>] [--owner <owner>] [--notes <text>]]"
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

## Notes

- This is foundation-only in Phase 9: preflight and launch blocking logic is delivered in later phases.
- Copy approval and mandatory launch gating are intentionally not bypassed by this skill.
