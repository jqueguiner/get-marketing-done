---
phase: 10-copy-approval-artifact-and-gate-engine
plan: 01
subsystem: hubspot-campaign
tags: [hubspot, approvals, launch-safety]
requires:
  - phase: 09-hubspot-campaign-command-foundation
    provides: hubspot campaign shell lifecycle and command entrypoints
provides:
  - persistent copy approval artifacts with reviewer metadata
  - explicit operator commands for approve/status workflows
  - launch/preflight dependency on approval validity
affects: [phase-10-plan-02, phase-11]
tech-stack:
  added: [none]
  patterns: [approval-artifact gating, hash-based copy integrity]
key-files:
  modified:
    - scripts/db_manager.py
    - scripts/marketing-tools.js
    - skills/hubspot-campaign/SKILL.md
    - README.md
key-decisions:
  - "Approval validity is tied to campaign email-content hash for deterministic gating."
  - "Approval records are first-class campaign artifacts, not transient runtime flags."
requirements-completed: [CPY-01]
duration: ongoing
completed: 2026-03-04
---

# Phase 10 Summary (Plan 01)

Implemented copy approval artifact persistence and operator-facing approval commands for HubSpot campaign launch safety.

## Accomplishments

- Added `campaign_copy_approvals` table and DB manager operations.
- Added runtime command modes:
  - `approve <campaign> --by <reviewer> [--notes <text>]`
  - `approval-status <campaign>`
- Added copy hash generation and approval validation logic used by launch-preflight flow.

## Validation

- Approval creation returns structured reviewer/timestamp/hash payload.
- Approval status reflects campaign hash validity and stale/missing reasons.
