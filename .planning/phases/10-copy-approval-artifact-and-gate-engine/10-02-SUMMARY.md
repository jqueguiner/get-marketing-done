---
phase: 10-copy-approval-artifact-and-gate-engine
plan: 02
subsystem: hubspot-campaign
tags: [hubspot, approvals, invalidation, deterministic-policy]
requires:
  - phase: 10-copy-approval-artifact-and-gate-engine
    plan: 01
    provides: approval artifact schema and approve/status command flow
provides:
  - automatic approval invalidation on campaign copy changes
  - preflight/launch block behavior tied to approval integrity
  - deterministic remediation output for operator recovery
affects: [phase-11, phase-12]
tech-stack:
  added: [none]
  patterns: [change-invalidates-approval safety model]
key-files:
  modified:
    - scripts/marketing-tools.js
    - scripts/db_manager.py
    - scripts/verify_hubspot_launch_gate.js
key-decisions:
  - "Any email-copy mutation invalidates previous approval to prevent stale launch authorization."
  - "Blocking responses return explicit remediation steps for fast operator correction."
requirements-completed: [CPY-02]
duration: ongoing
completed: 2026-03-04
---

# Phase 10 Summary (Plan 02)

Implemented deterministic approval invalidation and launch-preflight enforcement behavior after copy mutations.

## Accomplishments

- Added copy-approval invalidation on email updates.
- Enforced `launch` blocking when approval becomes stale or missing.
- Extended launch gate verification coverage to include post-edit invalidation path.

## Validation

- `approval.invalidated_on_copy_edit` passes in launch-gate validator.
- Launch and preflight return `HUBSPOT_PREFLIGHT_BLOCKED` after approved copy is edited.
