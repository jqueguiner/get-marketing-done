# Changelog

## 1.1.3

- Maintenance release


## 1.1.2

- Maintenance release


## 1.1.0

- Add automated release pipeline (GitHub Actions workflow_dispatch)
- Add CHANGELOG.md with initial release notes
- Route all db_manager commands through marketing-tools.js as single entry point
- Add segmentation commands: list-segments, segment-companies, bulk-assign-segments
- Add HubSpot CRM importer and crm-connect skill
- Add contact deduplication by email in add-contacts
- Add hubspot_access_token to config
- Fix update skill changelog URL to match actual GitHub remote

## 1.0.0

Initial release.

- Full GTM pipeline: context, lists, research, enrichment, segmentation, emails, send, learn
- SQLite-backed campaign database
- Session management with pause/resume
- Report server dashboard
- CRM import from HubSpot
- npx installer with global/local modes
