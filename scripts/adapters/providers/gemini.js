const { ACTIONS } = require('../canonical-actions');

// Gemini scaffold surface stays minimal in Phase 7.
const COMMAND_MAP = Object.freeze({
  '/gmd:campaign-progress': ACTIONS.CAMPAIGN_PROGRESS,
  '/gmd:campaign-verify': ACTIONS.CAMPAIGN_VERIFY,
  '/gmd:pause-work': ACTIONS.WORK_PAUSE,
  '/gmd:resume-work': ACTIONS.WORK_RESUME,
  '/gmd:run-instantly': ACTIONS.OUTREACH_PREPARE,
  '/gmd:update': ACTIONS.TOOL_UPDATE
});

module.exports = {
  provider: 'gemini',
  commandMap: COMMAND_MAP
};
