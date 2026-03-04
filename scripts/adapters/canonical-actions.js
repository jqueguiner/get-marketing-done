#!/usr/bin/env node
/**
 * Canonical action contract shared by all assistant adapters.
 * Provider auth/config must remain in provider modules, not canonical payloads.
 */

const ACTIONS = Object.freeze({
  CAMPAIGN_PROGRESS: 'campaign.progress',
  CAMPAIGN_VERIFY: 'campaign.verify',
  REPORT_SERVER_START: 'report-server.start',
  WORK_PAUSE: 'work.pause',
  WORK_RESUME: 'work.resume',
  CONTEXT_INIT: 'context.init',
  CONTEXT_SHOW: 'context.show',
  CONTEXT_UPDATE_RESULTS: 'context.update-results',
  LIST_SEARCH: 'list.search',
  LIST_LOOKALIKE: 'list.lookalike',
  LIST_REFINE: 'list.refine',
  RESEARCH_MARKET: 'research.market',
  DATAPOINT_DEFINE: 'datapoints.define',
  DATAPOINT_RESEARCH: 'datapoints.research',
  DATAPOINT_BULK: 'datapoints.bulk',
  ENRICHMENT_RUN: 'enrichment.run',
  ENRICHMENT_STATUS: 'enrichment.status',
  ENRICHMENT_VALIDATE: 'enrichment.validate',
  CRM_PREVIEW: 'crm.preview',
  CRM_IMPORT: 'crm.import',
  CRM_STATUS: 'crm.status',
  SEGMENT_CREATE: 'segment.create',
  SEGMENT_ASSIGN: 'segment.assign',
  SEGMENT_REVIEW: 'segment.review',
  SEGMENT_AUTO: 'segment.auto',
  EMAIL_TEMPLATE_CREATE: 'email.template.create',
  EMAIL_GENERATE: 'email.generate',
  EMAIL_BULK: 'email.bulk',
  EMAIL_ITERATE: 'email.iterate',
  COPY_FEEDBACK: 'copy.feedback',
  HUBSPOT_CAMPAIGN: 'hubspot.campaign',
  OUTREACH_PREPARE: 'outreach.prepare',
  OUTREACH_UPLOAD: 'outreach.upload',
  OUTREACH_VERIFY: 'outreach.verify',
  OUTREACH_RESULTS: 'outreach.results',
  TOOL_UPDATE: 'tool.update'
});

const ACTION_VALUES = new Set(Object.values(ACTIONS));
const METADATA_SECRET_KEYS = new Set(['token', 'api_key', 'access_token', 'secret']);

function isValidAction(action) {
  return typeof action === 'string' && ACTION_VALUES.has(action);
}

function assertValidAction(action) {
  if (!isValidAction(action)) {
    const err = new Error(`Unknown canonical action: ${action}`);
    err.code = 'UNKNOWN_ACTION';
    throw err;
  }
  return action;
}

function stripSecretMetadata(metadata) {
  const out = {};
  const src = metadata && typeof metadata === 'object' ? metadata : {};
  Object.keys(src).forEach(function(k) {
    if (!METADATA_SECRET_KEYS.has(k)) out[k] = src[k];
  });
  return out;
}

function normalizeActionPayload(payload) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const action = assertValidAction(source.action);
  return {
    action: action,
    params: source.params && typeof source.params === 'object' ? source.params : {},
    metadata: stripSecretMetadata(source.metadata)
  };
}

module.exports = {
  ACTIONS,
  isValidAction,
  assertValidAction,
  normalizeActionPayload
};
