const { ACTIONS } = require('../canonical-actions');

// Codex native surface is strictly `$gmd-*` commands.
const COMMAND_MAP = Object.freeze({
  '$gmd-campaign-progress': ACTIONS.CAMPAIGN_PROGRESS,
  '$gmd-campaign-verify': ACTIONS.CAMPAIGN_VERIFY,
  '$gmd-report-server': ACTIONS.REPORT_SERVER_START,
  '$gmd-pause-work': ACTIONS.WORK_PAUSE,
  '$gmd-resume-work': ACTIONS.WORK_RESUME,
  '$gmd-company-context-builder': ACTIONS.CONTEXT_INIT,
  '$gmd-list-building': ACTIONS.LIST_SEARCH,
  '$gmd-market-problems-deep-research': ACTIONS.RESEARCH_MARKET,
  '$gmd-data-points-builder': ACTIONS.DATAPOINT_DEFINE,
  '$gmd-table-enrichment': ACTIONS.ENRICHMENT_RUN,
  '$gmd-crm-connect': ACTIONS.CRM_IMPORT,
  '$gmd-segmentation': ACTIONS.SEGMENT_CREATE,
  '$gmd-email-generation': ACTIONS.EMAIL_TEMPLATE_CREATE,
  '$gmd-copy-feedback': ACTIONS.COPY_FEEDBACK,
  '$gmd-run-instantly': ACTIONS.OUTREACH_PREPARE,
  '$gmd-update': ACTIONS.TOOL_UPDATE
});

module.exports = {
  provider: 'codex',
  commandMap: COMMAND_MAP
};
