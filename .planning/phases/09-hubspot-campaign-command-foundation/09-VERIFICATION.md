# Phase 9 Verification

## Status: Complete

Phase: 09-hubspot-campaign-command-foundation
Date: 2026-03-04

## Success Criteria Evidence

1) Operators can create/read/update campaign shells through new HubSpot command paths.
- status: passed
- evidence: `hubspot-campaign create/list/get/update/set-state/link-id` modes in `scripts/marketing-tools.js`
- evidence: native command routing in provider maps (`scripts/adapters/providers/claude.js`, `scripts/adapters/providers/codex.js`)

2) Campaign metadata and lifecycle state are persisted with backward-compatible schema additions.
- status: passed
- evidence: `hubspot_campaigns` table and lifecycle constraints in `scripts/db_manager.py`
- evidence: idempotent create and lifecycle update checks pass in `scripts/verify_hubspot_sync_regression.js`

3) Command routing/runtime integration follows existing shared adapter/runtime patterns.
- status: passed
- evidence: canonical action `hubspot.campaign` in `scripts/adapters/canonical-actions.js`
- evidence: codex command sweep includes `$gmd-hubspot-campaign` and passes in `scripts/verify_codex_command_sweep.js`

## Verification Commands

```bash
node scripts/verify_codex_command_sweep.js
node scripts/verify_hubspot_sync_regression.js
node scripts/verify_hubspot_suite.js
```

## Requirement Mapping

- HUB-01: complete
