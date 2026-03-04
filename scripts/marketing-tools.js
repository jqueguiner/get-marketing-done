#!/usr/bin/env node
/**
 * marketing-tools.js — Single-call bootstrap CLI for the GTM system.
 *
 * Like gsd-tools.cjs: one call returns all context needed for any workflow.
 * Eliminates token-expensive file discovery. The orchestrator gets everything
 * in one JSON blob and can immediately branch.
 *
 * Usage: node scripts/marketing-tools.js <command> [args...]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const {
  routeCommand,
  listSupportedCommands,
  normalizeProvider,
  DEFAULT_PROVIDER
} = require('./adapters/command-router');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const DB_PATH = path.join(DATA, 'gtm.db');
const STATE_PATH = path.join(DATA, 'STATE.md');
const CONTEXT_PATH = path.join(DATA, 'company_context.md');
const CONFIG_PATH = path.join(ROOT, 'config.json');
const SCHEMA_PATH = path.join(DATA, 'datapoint_schema.json');

// ─── Helpers ───

function fileExists(p) { try { fs.accessSync(p); return true; } catch { return false; } }

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
}

function readFile(p) {
  try { return fs.readFileSync(p, 'utf8'); }
  catch { return null; }
}

function dbQuery(sql) {
  if (!fileExists(DB_PATH)) return [];
  try {
    const out = execFileSync('sqlite3', ['-json', DB_PATH, sql], {
      encoding: 'utf8', timeout: 5000
    });
    return JSON.parse(out || '[]');
  } catch { return []; }
}

function dbScalar(sql) {
  const rows = dbQuery(sql);
  if (rows.length && rows[0]) return Object.values(rows[0])[0];
  return 0;
}

function parseStateFrontmatter(content) {
  if (!content) return {};
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  match[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) fm[key.trim()] = rest.join(':').trim().replace(/^"(.*)"$/, '$1');
  });
  return fm;
}

function progressBar(pct, width = 20) {
  const filled = Math.round(width * pct / 100);
  return '[' + '\u2588'.repeat(filled) + '\u2591'.repeat(width - filled) + '] ' + pct + '%';
}

function now() { return new Date().toISOString().slice(0, 19).replace('T', ' '); }
function nowIso() { return new Date().toISOString(); }

function parseTimestamp(value) {
  if (!value || typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseContinueMetadata(content) {
  if (!content || typeof content !== 'string') {
    return { timestamp_ms: null, paused_at: null, provider: null, parse_error: false };
  }

  const pausedMatch = content.match(/^>\s*Paused:\s*(.+)$/m);
  const providerMatch = content.match(/^>\s*Provider:\s*(.+)$/m);
  const pausedAt = pausedMatch ? pausedMatch[1].trim() : null;
  const provider = providerMatch ? providerMatch[1].trim() : null;
  const timestampMs = parseTimestamp(pausedAt);
  return {
    timestamp_ms: timestampMs,
    paused_at: pausedAt,
    provider: provider || null,
    parse_error: pausedAt !== null && timestampMs === null
  };
}

function isValidStateFrontmatter(stateFm, rawState) {
  if (!stateFm || typeof stateFm !== 'object') return false;
  if (Object.keys(stateFm).length === 0) {
    return Boolean(rawState && rawState.trim().length > 0) ? false : true;
  }
  return true;
}

function getStateTimestampMs(stateFm) {
  return parseTimestamp(stateFm.paused_at || stateFm.last_activity || null);
}

function resolveResumeSource(opts) {
  const warnings = [];
  const hasContinue = Boolean(opts.hasContinue);
  const continueMeta = opts.continueMeta || {};
  const stateValid = isValidStateFrontmatter(opts.stateFm, opts.rawState);
  const stateTimestamp = getStateTimestampMs(opts.stateFm || {});
  const continueTimestamp = continueMeta.timestamp_ms || null;
  const continueValid = hasContinue && !continueMeta.parse_error;

  if (continueValid && stateValid && continueTimestamp !== null && stateTimestamp !== null) {
    if (continueTimestamp > stateTimestamp) {
      return { source: 'continue_file', reason: 'newer_timestamp', warnings };
    }
    if (stateTimestamp > continueTimestamp) {
      return { source: 'state_frontmatter', reason: 'newer_timestamp', warnings };
    }
    return { source: 'continue_file', reason: 'timestamp_tie_precedence', warnings };
  }

  if (continueValid) {
    return { source: 'continue_file', reason: 'priority_precedence', warnings };
  }

  if (hasContinue && continueMeta.parse_error) {
    warnings.push({
      warning_code: 'RESUME_SOURCE_FALLBACK',
      from: 'continue_file',
      to: stateValid ? 'state_frontmatter' : 'pipeline_snapshot',
      reason: 'invalid_or_unparseable_continue_file'
    });
  } else if (hasContinue && !continueValid) {
    warnings.push({
      warning_code: 'RESUME_SOURCE_FALLBACK',
      from: 'continue_file',
      to: stateValid ? 'state_frontmatter' : 'pipeline_snapshot',
      reason: 'missing_or_invalid_continue_file'
    });
  }

  if (stateValid && stateTimestamp !== null) {
    return { source: 'state_frontmatter', reason: 'priority_precedence', warnings };
  }
  if (stateValid) {
    return { source: 'state_frontmatter', reason: 'timestamp_unavailable', warnings };
  }

  if (opts.rawState && opts.rawState.trim().length > 0) {
    warnings.push({
      warning_code: 'RESUME_SOURCE_FALLBACK',
      from: 'state_frontmatter',
      to: 'pipeline_snapshot',
      reason: 'invalid_or_unparseable_state_frontmatter'
    });
  }

  return { source: 'pipeline_snapshot', reason: 'fallback_default', warnings };
}

function getRuntimeProvider() {
  return normalizeProvider(process.env.GMD_PROVIDER || DEFAULT_PROVIDER);
}

// ─── Init Commands (single-call bootstrap) ───

function initCampaign(campaignName) {
  const config = readJSON(CONFIG_PATH) || {};
  const context = readFile(CONTEXT_PATH);
  const schema = readJSON(SCHEMA_PATH);
  const state = readFile(STATE_PATH);
  const stateFm = parseStateFrontmatter(state);

  const totalCompanies = dbScalar("SELECT COUNT(*) as c FROM companies");
  const totalContacts = dbScalar("SELECT COUNT(*) as c FROM contacts");
  const totalDatapoints = dbScalar("SELECT COUNT(*) as c FROM datapoints WHERE value IS NOT NULL AND value != ''");
  const companiesWithData = dbScalar("SELECT COUNT(DISTINCT company_id) as c FROM datapoints WHERE value IS NOT NULL");

  const totalEmails = campaignName
    ? dbScalar("SELECT COUNT(*) as c FROM emails e JOIN campaigns cp ON e.campaign_id=cp.id WHERE cp.name='" + campaignName.replace(/'/g, "''") + "'")
    : dbScalar("SELECT COUNT(*) as c FROM emails");

  const campaigns = dbQuery("SELECT name, status, total_contacts FROM campaigns ORDER BY updated_at DESC LIMIT 10");
  const segments = dbQuery("SELECT name, criteria FROM segments");

  const researchFiles = [];
  const researchDir = path.join(DATA, 'research');
  if (fileExists(researchDir)) {
    fs.readdirSync(researchDir).filter(f => f.endsWith('.md')).forEach(f => researchFiles.push(f));
  }

  const templateFiles = [];
  const templateDir = path.join(DATA, 'templates');
  if (fileExists(templateDir)) {
    fs.readdirSync(templateDir).filter(f => f.endsWith('.json')).forEach(f => templateFiles.push(f));
  }

  // Enrichment fill rates per datapoint
  const schemaNames = schema ? (schema.datapoints || []).map(d => d.name) : [];
  const fillRates = {};
  schemaNames.forEach(name => {
    const filled = dbScalar("SELECT COUNT(*) as c FROM datapoints WHERE schema_name='" + name.replace(/'/g, "''") + "' AND value IS NOT NULL AND value != ''");
    fillRates[name] = { filled, total: totalCompanies, rate: totalCompanies ? Math.round(filled / totalCompanies * 100) : 0 };
  });

  return {
    timestamp: now(),
    campaign: campaignName || null,
    has_context: !!context,
    has_schema: !!schema,
    has_state: !!state,
    config: {
      has_extruct_key: !!(config.extruct_api_key || process.env.EXTRUCT_API_KEY),
      has_instantly_key: !!(config.instantly_api_key || process.env.INSTANTLY_API_KEY),
      has_perplexity_key: !!(config.perplexity_api_key || process.env.PERPLEXITY_API_KEY),
      has_hubspot_token: !!(config.hubspot_access_token || process.env.HUBSPOT_ACCESS_TOKEN),
      workflow: config.workflow || {},
      model_profile: config.model_profile || 'balanced',
    },
    state: stateFm,
    pipeline: {
      companies: totalCompanies,
      contacts: totalContacts,
      datapoints: totalDatapoints,
      companies_enriched: companiesWithData,
      enrichment_rate: totalCompanies ? Math.round(companiesWithData / totalCompanies * 100) : 0,
      emails_generated: totalEmails,
      fill_rates: fillRates,
    },
    campaigns,
    segments,
    research_files: researchFiles,
    template_files: templateFiles,
    files: {
      context: CONTEXT_PATH,
      schema: SCHEMA_PATH,
      state: STATE_PATH,
      db: DB_PATH,
    }
  };
}

function initResearch(topic) {
  const base = initCampaign(null);
  const existingResearch = base.research_files
    .filter(f => f.toLowerCase().includes((topic || '').toLowerCase().replace(/\s+/g, '_')));
  return {
    ...base,
    topic,
    existing_research: existingResearch,
    suggested_queries: [
      '"' + topic + '" biggest challenges ' + new Date().getFullYear(),
      '"' + topic + '" pain points survey',
      '"' + topic + '" trends ' + new Date().getFullYear(),
      '"' + topic + '" analyst reports Gartner Forrester McKinsey',
      '"' + topic + '" conference keynote ' + new Date().getFullYear(),
    ]
  };
}

function initEnrichment(campaign) {
  const base = initCampaign(campaign);
  const unenriched = dbScalar("SELECT COUNT(*) as c FROM companies c LEFT JOIN datapoints d ON c.id=d.company_id WHERE d.id IS NULL");
  const stale = dbScalar("SELECT COUNT(*) as c FROM datapoints WHERE updated_at < datetime('now', '-90 days')");
  const lowConf = dbScalar("SELECT COUNT(*) as c FROM datapoints WHERE confidence='low'");
  return {
    ...base,
    enrichment: {
      unenriched_companies: unenriched,
      stale_datapoints: stale,
      low_confidence: lowConf,
      recommended_batch_size: Math.min(20, unenriched),
      providers_available: {
        extruct: base.config.has_extruct_key,
        playwright: true,
        web_research: true,
      }
    }
  };
}

function initOutreach(campaign) {
  const base = initCampaign(campaign);
  const safeCampaign = (campaign || '').replace(/'/g, "''");
  const readyEmails = campaign
    ? dbScalar("SELECT COUNT(*) as c FROM emails e JOIN campaigns cp ON e.campaign_id=cp.id WHERE cp.name='" + safeCampaign + "' AND e.status='ready'")
    : 0;
  const draftEmails = campaign
    ? dbScalar("SELECT COUNT(*) as c FROM emails e JOIN campaigns cp ON e.campaign_id=cp.id WHERE cp.name='" + safeCampaign + "' AND e.status='draft'")
    : 0;
  const missingEmail = dbScalar("SELECT COUNT(*) as c FROM companies c LEFT JOIN contacts ct ON c.id=ct.company_id WHERE ct.email IS NULL OR ct.email=''");
  return {
    ...base,
    outreach: {
      ready_emails: readyEmails,
      draft_emails: draftEmails,
      companies_missing_contact_email: missingEmail,
      instantly_configured: base.config.has_instantly_key,
    }
  };
}

function initResume() {
  const rawState = readFile(STATE_PATH);
  const stateFm = parseStateFrontmatter(rawState);
  const continueFile = path.join(DATA, '.continue-here.md');
  const hasContinue = fileExists(continueFile);
  const continueContent = hasContinue ? readFile(continueFile) : null;
  const continueMeta = parseContinueMetadata(continueContent);
  const runtimeProvider = getRuntimeProvider();
  const resolved = resolveResumeSource({
    hasContinue: hasContinue,
    continueMeta: continueMeta,
    stateFm: stateFm,
    rawState: rawState
  });
  stateSet('last_provider', runtimeProvider);

  return {
    timestamp: now(),
    has_state: !!rawState,
    state: stateFm,
    has_continue_file: hasContinue,
    continue_content: continueContent,
    continue_metadata: {
      paused_at: continueMeta.paused_at,
      provider: continueMeta.provider
    },
    has_context: fileExists(CONTEXT_PATH),
    has_db: fileExists(DB_PATH),
    pipeline: initCampaign(null).pipeline,
    resume_source: resolved.source,
    resume_reason: resolved.reason,
    warnings: resolved.warnings,
    provider_provenance: {
      runtime_provider: runtimeProvider,
      last_provider: stateFm.last_provider || continueMeta.provider || null,
      paused_by_provider: stateFm.paused_by_provider || continueMeta.provider || null
    },
    suggested_action: determineSuggestedAction(stateFm, resolved.source),
  };
}

function determineSuggestedAction(stateFm, resumeSource) {
  if (resumeSource === 'continue_file') return 'resume_from_continue_file';
  if (resumeSource === 'state_frontmatter') return 'resume_from_state_frontmatter';
  if (!stateFm.current_step) return 'start_fresh';
  const step = parseInt(stateFm.current_step) || 0;
  const actions = {
    0: 'run_company_context_builder', 1: 'run_list_building',
    2: 'run_market_research', 3: 'run_data_points_builder',
    4: 'run_table_enrichment', 5: 'run_list_building_refine',
    6: 'run_segmentation', 7: 'run_email_generation',
    8: 'run_copy_feedback', 9: 'run_instantly',
  };
  if (step >= 10) return 'run_context_update_from_results';
  return actions[step] || 'check_progress';
}

// ─── State Commands ───

function stateGet(key) {
  const state = readFile(STATE_PATH);
  const fm = parseStateFrontmatter(state);
  if (key) return { [key]: fm[key] || null };
  return fm;
}

function stateSet(key, value) {
  let content = readFile(STATE_PATH) || defaultStateContent();
  const fm = parseStateFrontmatter(content);
  fm[key] = value;
  content = rebuildState(fm, content);
  fs.writeFileSync(STATE_PATH, content);
  return { updated: key, value };
}

function stateAdvance(step, description) {
  let content = readFile(STATE_PATH) || defaultStateContent();
  const fm = parseStateFrontmatter(content);
  fm.current_step = String(step);
  fm.current_step_name = description || stepName(step);
  fm.last_activity = now();
  content = rebuildState(fm, content);
  fs.writeFileSync(STATE_PATH, content);
  return { advanced_to: step, name: fm.current_step_name };
}

function stateRecordMetric(step, durationSeconds, result) {
  let content = readFile(STATE_PATH) || defaultStateContent();
  const metricsSection = '\n### ' + now() + ' \u2014 Step ' + step + ': ' + stepName(step) + '\n- Duration: ' + Math.round(durationSeconds) + 's\n- Result: ' + result + '\n';

  if (content.includes('## Performance Metrics')) {
    content = content.replace('## Performance Metrics\n', '## Performance Metrics\n' + metricsSection);
  } else {
    content += '\n## Performance Metrics\n' + metricsSection;
  }
  fs.writeFileSync(STATE_PATH, content);
  return { recorded: true };
}

function stepName(step) {
  const names = {
    0: 'Company Context', 1: 'List Building', 2: 'Market Research',
    3: 'Data Points', 4: 'Enrichment', 5: 'List Refinement',
    6: 'Segmentation', 7: 'Email Generation', 8: 'Copy Feedback',
    9: 'Instantly Upload', 10: 'Results & Context Update'
  };
  return names[step] || 'Step ' + step;
}

function defaultStateContent() {
  return '---\ncurrent_step: "0"\ncurrent_step_name: "Not started"\ncurrent_campaign: ""\nlast_activity: "' + now() + '"\n---\n\n# Campaign State\n> Last updated: ' + now() + '\n\n## Current Position\nStep: 0 \u2014 Not started\nCampaign: (none)\n\n## Pipeline Summary\nCompanies: 0 | Contacts: 0 | Enriched: 0 | Emails: 0\n\n## Performance Metrics\n\n## Session Log\n### ' + now() + ' \u2014 Session started\n';
}

function rebuildState(fm, content) {
  const fmBlock = '---\n' + Object.entries(fm).map(function(entry) { return entry[0] + ': "' + entry[1] + '"'; }).join('\n') + '\n---';
  if (content.match(/^---\n[\s\S]*?\n---/)) {
    content = content.replace(/^---\n[\s\S]*?\n---/, fmBlock);
  } else {
    content = fmBlock + '\n\n' + content;
  }
  content = content.replace(/Step: \d+ \u2014 .*/, 'Step: ' + fm.current_step + ' \u2014 ' + fm.current_step_name);
  content = content.replace(/> Last updated: .*/, '> Last updated: ' + (fm.last_activity || now()));
  return content;
}

// ─── Progress Command ───

function progress() {
  const pipeline = initCampaign(null).pipeline;
  const state = parseStateFrontmatter(readFile(STATE_PATH));
  const currentStep = parseInt(state.current_step) || 0;
  const base = initCampaign(null);

  const steps = [
    { step: 0, name: 'Context', check: fileExists(CONTEXT_PATH) },
    { step: 1, name: 'Lists', check: pipeline.companies > 0 },
    { step: 2, name: 'Research', check: (base.research_files || []).length > 0 },
    { step: 3, name: 'Datapoints', check: pipeline.datapoints > 0 },
    { step: 4, name: 'Enrichment', check: pipeline.enrichment_rate > 50 },
    { step: 5, name: 'Refinement', check: currentStep > 5 },
    { step: 6, name: 'Segments', check: (base.segments || []).length > 0 },
    { step: 7, name: 'Emails', check: pipeline.emails_generated > 0 },
    { step: 8, name: 'Feedback', check: currentStep > 8 },
    { step: 9, name: 'Send', check: currentStep > 9 },
    { step: 10, name: 'Learn', check: currentStep >= 10 },
  ];

  const completed = steps.filter(function(s) { return s.check; }).length;
  const pct = Math.round(completed / steps.length * 100);

  return {
    current_step: currentStep,
    current_step_name: state.current_step_name || 'Not started',
    campaign: state.current_campaign || null,
    progress_bar: progressBar(pct),
    progress_pct: pct,
    steps: steps.map(function(s) {
      return {
        step: s.step,
        name: s.name,
        status: s.check ? 'done' : (s.step === currentStep ? 'active' : 'pending'),
        marker: s.check ? '\u2713' : (s.step === currentStep ? '\u25B6' : '\u2022'),
      };
    }),
    pipeline: pipeline,
    next_action: determineSuggestedAction(
      state,
      fileExists(path.join(DATA, '.continue-here.md')) ? 'continue_file' : 'state_frontmatter'
    ),
  };
}

// ─── Verify Command (goal-backward) ───

function verify(campaign) {
  const checks = [];
  const safeCampaign = (campaign || '').replace(/'/g, "''");

  // Level 1: EXISTS
  checks.push({ level: 'exists', item: 'Company context', pass: fileExists(CONTEXT_PATH), path: CONTEXT_PATH });
  checks.push({ level: 'exists', item: 'Database', pass: fileExists(DB_PATH), path: DB_PATH });
  const companyCount = dbScalar("SELECT COUNT(*) as c FROM companies");
  checks.push({ level: 'exists', item: 'Prospect list', pass: companyCount > 0, detail: companyCount + ' companies' });
  checks.push({ level: 'exists', item: 'Market research', pass: (initCampaign(null).research_files || []).length > 0 });
  checks.push({ level: 'exists', item: 'Datapoint schema', pass: fileExists(SCHEMA_PATH) });
  checks.push({ level: 'exists', item: 'Enrichment data', pass: dbScalar("SELECT COUNT(*) as c FROM datapoints WHERE value IS NOT NULL") > 0 });

  if (campaign) {
    checks.push({ level: 'exists', item: 'Campaign record', pass: dbScalar("SELECT COUNT(*) as c FROM campaigns WHERE name='" + safeCampaign + "'") > 0 });
    checks.push({ level: 'exists', item: 'Generated emails', pass: dbScalar("SELECT COUNT(*) as c FROM emails e JOIN campaigns cp ON e.campaign_id=cp.id WHERE cp.name='" + safeCampaign + "'") > 0 });
  }

  // Level 2: SUBSTANTIVE
  if (fileExists(CONTEXT_PATH)) {
    const ctx = readFile(CONTEXT_PATH);
    checks.push({ level: 'substantive', item: 'ICP defined', pass: ctx.includes('## ICP Definition') && ctx.length > 500, detail: ctx.length + ' chars' });
    checks.push({ level: 'substantive', item: 'Win cases documented', pass: ctx.includes('## Win Cases') && (ctx.match(/###/g) || []).length > 2 });
    checks.push({ level: 'substantive', item: 'Product glossary populated', pass: ctx.includes('## Product Glossary') && ctx.includes('|') });
  }

  if (companyCount > 0) {
    checks.push({ level: 'substantive', item: 'List size adequate', pass: companyCount >= 200, detail: companyCount + ' companies (target: 200-500)' });
    const enrichedCount = dbScalar("SELECT COUNT(DISTINCT company_id) as c FROM datapoints WHERE value IS NOT NULL AND value != ''");
    checks.push({ level: 'substantive', item: 'Enrichment coverage', pass: enrichedCount / companyCount > 0.5, detail: Math.round(enrichedCount / companyCount * 100) + '% enriched' });
  }

  // Level 3: WIRED
  if (campaign) {
    const emailsWithCompany = dbScalar("SELECT COUNT(*) as c FROM emails e JOIN campaigns cp ON e.campaign_id=cp.id WHERE cp.name='" + safeCampaign + "' AND e.company_id IS NOT NULL");
    const totalCampaignEmails = dbScalar("SELECT COUNT(*) as c FROM emails e JOIN campaigns cp ON e.campaign_id=cp.id WHERE cp.name='" + safeCampaign + "'");
    checks.push({ level: 'wired', item: 'Emails linked to companies', pass: emailsWithCompany === totalCampaignEmails && totalCampaignEmails > 0, detail: emailsWithCompany + '/' + totalCampaignEmails });

    const emailsWithContact = dbScalar("SELECT COUNT(*) as c FROM emails e JOIN campaigns cp ON e.campaign_id=cp.id JOIN contacts ct ON e.contact_id=ct.id WHERE cp.name='" + safeCampaign + "' AND ct.email IS NOT NULL AND ct.email != ''");
    checks.push({ level: 'wired', item: 'Emails have contact addresses', pass: emailsWithContact > 0, detail: emailsWithContact + ' with valid email' });
  }

  var passed = checks.filter(function(c) { return c.pass; }).length;
  var total = checks.length;
  var status = passed === total ? 'passed' : (passed / total > 0.7 ? 'gaps_found' : 'needs_work');

  return {
    campaign: campaign || '(all)',
    status: status,
    score: passed + '/' + total,
    score_pct: Math.round(passed / total * 100),
    checks: checks,
    summary: {
      exists: checks.filter(function(c) { return c.level === 'exists'; }),
      substantive: checks.filter(function(c) { return c.level === 'substantive'; }),
      wired: checks.filter(function(c) { return c.level === 'wired'; }),
    }
  };
}

// ─── Pause/Resume Commands ───

function pause(reason) {
  var state = parseStateFrontmatter(readFile(STATE_PATH));
  var pipeline = initCampaign(null).pipeline;
  var runtimeProvider = getRuntimeProvider();

  var continueContent = '# Continue Here\n> Paused: ' + now() + '\n> Provider: ' + runtimeProvider + '\n> Reason: ' + (reason || 'Manual pause') + '\n\n## Position\n- Step: ' + (state.current_step || 0) + ' \u2014 ' + (state.current_step_name || 'Unknown') + '\n- Campaign: ' + (state.current_campaign || '(none)') + '\n\n## Pipeline at pause\n- Companies: ' + pipeline.companies + '\n- Enriched: ' + pipeline.companies_enriched + ' (' + pipeline.enrichment_rate + '%)\n- Emails: ' + pipeline.emails_generated + '\n\n## What was happening\n' + (reason || 'No reason provided') + '\n\n## Next action when resuming\n' + determineSuggestedAction(state, 'state_frontmatter') + '\n';

  fs.writeFileSync(path.join(DATA, '.continue-here.md'), continueContent);
  stateSet('paused_at', now());
  stateSet('pause_reason', reason || 'Manual pause');
  stateSet('paused_by_provider', runtimeProvider);
  stateSet('last_provider', runtimeProvider);
  return {
    paused: true,
    continue_file: path.join(DATA, '.continue-here.md'),
    provider: runtimeProvider
  };
}

function clearContinue() {
  var p = path.join(DATA, '.continue-here.md');
  if (fileExists(p)) fs.unlinkSync(p);
  return { cleared: true };
}

// ─── Config Commands ───

function configGet(key) {
  var config = readJSON(CONFIG_PATH) || {};
  if (key) return { [key]: config[key] };
  return config;
}

function configSet(key, value) {
  var config = readJSON(CONFIG_PATH) || {};
  if (value === 'true') value = true;
  else if (value === 'false') value = false;
  else if (!isNaN(value) && value !== '') value = Number(value);

  var parts = key.split('.');
  var obj = config;
  for (var i = 0; i < parts.length - 1; i++) {
    if (!obj[parts[i]]) obj[parts[i]] = {};
    obj = obj[parts[i]];
  }
  obj[parts[parts.length - 1]] = value;

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
  return { set: key, value: value };
}

function configEnsure() {
  var config = readJSON(CONFIG_PATH) || {};
  var defaults = {
    model_profile: 'balanced',
    workflow: {
      research: true,
      copy_review: true,
      enrichment_validation: true,
      brand_compliance: true,
      auto_advance: false,
      min_enrichment_rate: 50,
      min_list_size: 200,
      max_email_words: 100,
    },
    quality_gates: {
      require_context_before_lists: true,
      require_research_before_emails: true,
      require_enrichment_before_emails: true,
      require_copy_feedback_before_send: false,
      manual_verify_before_send: true,
    },
    adapters: {
      scaffolds: {
        gemini: false,
        opencode: false,
        mistral: false,
      }
    }
  };

  function merge(target, source) {
    Object.keys(source).forEach(function(k) {
      if (!(k in target)) {
        target[k] = source[k];
      } else if (typeof source[k] === 'object' && source[k] !== null && !Array.isArray(source[k])) {
        if (typeof target[k] !== 'object') target[k] = {};
        merge(target[k], source[k]);
      }
    });
  }

  merge(config, defaults);
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
  return config;
}

// ─── Quality Gate Enforcement ───

var GATED_ACTIONS = Object.freeze({
  'outreach.prepare': true,
  'outreach.upload': true
});

var COMMAND_GATE_ACTION_MAP = Object.freeze({
  'init-outreach': 'outreach.prepare',
  'mark-uploaded': 'outreach.upload'
});

function inferGateAction(opts) {
  if (opts && opts.action && GATED_ACTIONS[opts.action]) return opts.action;
  var command = opts && opts.command ? opts.command : null;
  return COMMAND_GATE_ACTION_MAP[command] || null;
}

function getCommandCampaign(args) {
  if (!Array.isArray(args) || args.length === 0) return null;
  var first = args[0];
  if (typeof first !== 'string') return null;
  var trimmed = first.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildGateBlockedResponse(opts) {
  return {
    error: 'Quality gate blocked command execution',
    code: 'QUALITY_GATE_BLOCKED',
    provider: opts.provider,
    command: opts.command,
    gated_action: opts.gatedAction,
    failed_gates: opts.failedGates,
    remediation: opts.remediation
  };
}

function evaluateQualityGates(opts) {
  var config = opts.config || {};
  var quality = config.quality_gates || {};
  var state = opts.state || {};
  var gateAction = inferGateAction({ action: opts.action, command: opts.command });

  if (!gateAction) return { allowed: true, gated_action: null, failed_gates: [], remediation: [] };

  var failedGates = [];
  var remediation = [];

  if (quality.manual_verify_before_send) {
    var campaign = getCommandCampaign(opts.args);
    var hasVerification = Boolean(state.last_verified_at);
    if (!hasVerification) {
      failedGates.push({
        gate: 'manual_verify_before_send',
        reason: 'verification_missing',
        detail: 'No successful verification recorded in STATE frontmatter.'
      });
    } else if (campaign && state.last_verified_campaign && state.last_verified_campaign !== campaign) {
      failedGates.push({
        gate: 'manual_verify_before_send',
        reason: 'campaign_mismatch',
        detail: 'Last verified campaign does not match target campaign.'
      });
    } else if (campaign && !state.last_verified_campaign) {
      failedGates.push({
        gate: 'manual_verify_before_send',
        reason: 'campaign_untracked',
        detail: 'Verification timestamp exists but verified campaign is not recorded.'
      });
    }

    if (failedGates.length > 0) {
      remediation.push('Run: node scripts/marketing-tools.js verify <campaign>');
      remediation.push('Confirm verify status is `passed` and retry the blocked command.');
    }
  }

  if (failedGates.length === 0) {
    return {
      allowed: true,
      gated_action: gateAction,
      failed_gates: [],
      remediation: []
    };
  }

  return {
    allowed: false,
    gated_action: gateAction,
    failed_gates: failedGates,
    remediation: remediation
  };
}

// ─── DB Pass-through ───

var DB_COMMANDS = [
  'add-companies', 'add-contacts', 'add-datapoints', 'assign-segment',
  'campaign-results', 'create-segment', 'define-datapoints', 'enrichment-status',
  'export', 'get-company', 'get-email', 'get-emails', 'list-companies',
  'mark-uploaded', 'save-emails', 'save-results', 'show-datapoints',
  'update-email', 'validate-enrichment',
  'hubspot-campaign-create', 'hubspot-campaign-list', 'hubspot-campaign-get', 'hubspot-campaign-update',
  'copy-approval-set', 'copy-approval-status', 'copy-approval-invalidate'
];

function dbPassthrough(cmd, args) {
  var dbScript = path.join(__dirname, 'db_manager.py');
  try {
    var out = execFileSync('python3', [dbScript, cmd].concat(args), {
      encoding: 'utf8', timeout: 30000
    });
    try { return JSON.parse(out); }
    catch { return { output: out.trim() }; }
  } catch (e) {
    return { error: 'db_manager ' + cmd + ' failed', detail: (e.stderr || e.message || '').trim() };
  }
}

function parseFlagArgs(args) {
  var out = {};
  if (!Array.isArray(args)) return out;
  for (var i = 0; i < args.length; i += 1) {
    var token = args[i];
    if (typeof token !== 'string' || !token.startsWith('--')) continue;
    var key = token;
    var next = args[i + 1];
    if (typeof next === 'string' && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function computeCampaignCopyHash(campaignName) {
  if (!campaignName) return null;
  var safe = campaignName.replace(/'/g, "''");
  var rows = dbQuery(
    "SELECT subject, body FROM emails e JOIN campaigns cp ON e.campaign_id = cp.id " +
    "WHERE cp.name = '" + safe + "' ORDER BY e.id ASC"
  );
  if (!rows || rows.length === 0) return null;
  var canonical = rows.map(function(r) {
    return (r.subject || '') + '\n' + (r.body || '');
  }).join('\n---\n');
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function getCopyApprovalStatus(campaignName, currentHash) {
  if (!campaignName) return { approved: false, reason: 'campaign_missing' };
  var raw = dbPassthrough('copy-approval-status', ['--campaign', campaignName]);
  if (!raw || raw.error) return { approved: false, reason: 'approval_lookup_failed', detail: raw && raw.error };
  if (!raw.exists || !raw.is_valid) return { approved: false, reason: 'approval_missing_or_invalid' };
  if (!currentHash) return { approved: false, reason: 'copy_hash_missing' };
  if (raw.copy_hash !== currentHash) return { approved: false, reason: 'approval_stale_hash_mismatch' };
  return {
    approved: true,
    approved_by: raw.approved_by,
    approved_at: raw.approved_at,
    copy_hash: raw.copy_hash
  };
}

function hubspotCampaign(args) {
  var parts = Array.isArray(args) ? args.slice() : [];
  var mode = parts[0] || 'list';
  var name = parts[1] || '';
  var flags = parseFlagArgs(parts.slice(2));

  if (mode === 'create') {
    if (!name) return { error: 'Usage: hubspot-campaign create <campaign> [--segment <segment>] [--owner <owner>]' };
    var createArgs = ['--name', name];
    if (flags['--segment']) createArgs.push('--segment', flags['--segment']);
    if (flags['--owner']) createArgs.push('--owner', flags['--owner']);
    return dbPassthrough('hubspot-campaign-create', createArgs);
  }

  if (mode === 'list') return dbPassthrough('hubspot-campaign-list', []);

  if (mode === 'get') {
    if (!name) return { error: 'Usage: hubspot-campaign get <campaign>' };
    return dbPassthrough('hubspot-campaign-get', ['--name', name]);
  }

  if (mode === 'set-state') {
    if (!name || !parts[2]) return { error: 'Usage: hubspot-campaign set-state <campaign> <state>' };
    return dbPassthrough('hubspot-campaign-update', ['--name', name, '--state', parts[2]]);
  }

  if (mode === 'link-id') {
    if (!name || !parts[2]) return { error: 'Usage: hubspot-campaign link-id <campaign> <hubspot-id>' };
    return dbPassthrough('hubspot-campaign-update', ['--name', name, '--hubspot-id', parts[2]]);
  }

  if (mode === 'update') {
    if (!name) return { error: 'Usage: hubspot-campaign update <campaign> [--segment <segment>] [--owner <owner>] [--notes <text>]' };
    var updateArgs = ['--name', name];
    if (flags['--segment']) updateArgs.push('--segment', flags['--segment']);
    if (flags['--owner']) updateArgs.push('--owner', flags['--owner']);
    if (flags['--notes']) updateArgs.push('--notes', flags['--notes']);
    return dbPassthrough('hubspot-campaign-update', updateArgs);
  }

  if (mode === 'approve') {
    if (!name) return { error: 'Usage: hubspot-campaign approve <campaign> --by <reviewer> [--notes <text>]' };
    var reviewer = flags['--by'];
    if (!reviewer) return { error: 'Missing --by reviewer for approval.' };
    var hash = computeCampaignCopyHash(name);
    if (!hash) return { error: 'No generated emails found for campaign; cannot approve copy yet.', code: 'COPY_NOT_READY' };
    var setArgs = ['--campaign', name, '--by', reviewer, '--hash', hash];
    if (flags['--notes']) setArgs.push('--notes', flags['--notes']);
    return dbPassthrough('copy-approval-set', setArgs);
  }

  if (mode === 'approval-status') {
    if (!name) return { error: 'Usage: hubspot-campaign approval-status <campaign>' };
    var currentHash = computeCampaignCopyHash(name);
    var status = getCopyApprovalStatus(name, currentHash);
    status.campaign = name;
    status.current_copy_hash = currentHash;
    return status;
  }

  if (mode === 'launch') {
    if (!name) return { error: 'Usage: hubspot-campaign launch <campaign>' };
    var launchHash = computeCampaignCopyHash(name);
    var approval = getCopyApprovalStatus(name, launchHash);
    if (!approval.approved) {
      return {
        error: 'Copy approval required before HubSpot launch.',
        code: 'COPY_APPROVAL_REQUIRED',
        campaign: name,
        reason: approval.reason,
        remediation: [
          'Generate/refresh campaign emails first if missing.',
          'Run: node scripts/marketing-tools.js hubspot-campaign approve ' + name + ' --by <reviewer>',
          'Re-run launch after approval-status is approved.'
        ]
      };
    }
    return dbPassthrough('hubspot-campaign-update', ['--name', name, '--state', 'launched']);
  }

  return {
    error: 'Unknown hubspot-campaign mode: ' + mode,
    usage: [
      'hubspot-campaign create <campaign> [--segment <segment>] [--owner <owner>]',
      'hubspot-campaign list',
      'hubspot-campaign get <campaign>',
      'hubspot-campaign set-state <campaign> <state>',
      'hubspot-campaign link-id <campaign> <hubspot-id>',
      'hubspot-campaign update <campaign> [--segment <segment>] [--owner <owner>] [--notes <text>]',
      'hubspot-campaign approve <campaign> --by <reviewer> [--notes <text>]',
      'hubspot-campaign approval-status <campaign>',
      'hubspot-campaign launch <campaign>'
    ]
  };
}

// ─── Dispatcher ───

var COMMANDS = {
  'init':              function(args) { return initCampaign(args[0]); },
  'init-campaign':     function(args) { return initCampaign(args[0]); },
  'init-research':     function(args) { return initResearch(args[0]); },
  'init-enrichment':   function(args) { return initEnrichment(args[0]); },
  'init-outreach':     function(args) { return initOutreach(args[0]); },
  'init-resume':       function()     { return initResume(); },
  'state-get':         function(args) { return stateGet(args[0]); },
  'state-set':         function(args) { return stateSet(args[0], args.slice(1).join(' ')); },
  'state-advance':     function(args) { return stateAdvance(parseInt(args[0]), args.slice(1).join(' ')); },
  'state-record-metric': function(args) { return stateRecordMetric(args[0], parseFloat(args[1]) || 0, args[2] || 'completed'); },
  'progress':          function()     { return progress(); },
  'verify':            function(args) { return verify(args[0]); },
  'hubspot-campaign':  function(args) { return hubspotCampaign(args); },
  'pause':             function(args) { return pause(args.join(' ')); },
  'clear-continue':    function()     { return clearContinue(); },
  'config-get':        function(args) { return configGet(args[0]); },
  'config-set':        function(args) { return configSet(args[0], args.slice(1).join(' ')); },
  'config-ensure':     function()     { return configEnsure(); },
};

var ACTION_TO_COMMAND = {
  'campaign.progress': 'progress',
  'campaign.verify': 'verify',
  'report-server.start': 'progress',
  'work.pause': 'pause',
  'work.resume': 'init-resume',
  'context.init': 'init-campaign',
  'context.show': 'init-campaign',
  'context.update-results': 'state-advance',
  'list.search': 'add-companies',
  'list.lookalike': 'add-companies',
  'list.refine': 'list-companies',
  'research.market': 'init-research',
  'datapoints.define': 'define-datapoints',
  'datapoints.research': 'get-company',
  'datapoints.bulk': 'enrichment-status',
  'enrichment.run': 'init-enrichment',
  'enrichment.status': 'enrichment-status',
  'enrichment.validate': 'validate-enrichment',
  'crm.preview': 'list-companies',
  'crm.import': 'add-companies',
  'crm.status': 'list-companies',
  'segment.create': 'create-segment',
  'segment.assign': 'assign-segment',
  'segment.review': 'list-companies',
  'segment.auto': 'create-segment',
  'email.template.create': 'save-emails',
  'email.generate': 'save-emails',
  'email.bulk': 'save-emails',
  'email.iterate': 'update-email',
  'copy.feedback': 'get-email',
  'hubspot.campaign': 'hubspot-campaign',
  'outreach.prepare': 'init-outreach',
  'outreach.upload': 'mark-uploaded',
  'outreach.verify': 'verify',
  'outreach.results': 'campaign-results',
  'tool.update': 'config-ensure'
};

// Register db commands as pass-throughs
DB_COMMANDS.forEach(function(cmd) {
  COMMANDS[cmd] = function(args) { return dbPassthrough(cmd, args); };
});

function main() {
  var args = process.argv.slice(2);
  var cmd = args[0];
  var cmdArgs = args.slice(1);
  var provider = getRuntimeProvider();
  var currentConfig = readJSON(CONFIG_PATH) || {};
  var resolvedAction = null;

  if (!cmd || cmd === 'help') {
    console.log(JSON.stringify({
      commands: Object.keys(COMMANDS),
      usage: 'node scripts/marketing-tools.js <command> [args...]'
    }, null, 2));
    return;
  }

  if (!(cmd in COMMANDS)) {
    var routed = null;
    try {
      routed = routeCommand({
        provider: provider,
        command: cmd,
        params: {},
        config: Object.assign({}, currentConfig, {
          aliases: process.env.GMD_ALIASES === '1' || process.env.GMD_ALIASES === 'true'
        })
      });
    } catch (err) {
      console.error(JSON.stringify({
        error: err.message,
        code: err.code || 'ROUTING_ERROR',
        provider: err.provider || provider,
        command: err.command || cmd,
        capability: err.capability || null,
        remediation: err.remediation || null,
        provider_native: listSupportedCommands(provider)
      }));
      process.exit(1);
    }
    if (routed && ACTION_TO_COMMAND[routed.action] && (ACTION_TO_COMMAND[routed.action] in COMMANDS)) {
      resolvedAction = routed.action;
      cmd = ACTION_TO_COMMAND[routed.action];
    } else {
      console.error(JSON.stringify({
        error: 'Unknown command: ' + cmd,
        provider: provider,
        available: Object.keys(COMMANDS),
        provider_native: listSupportedCommands(provider),
        canonical_alias: 'gmd:<action> (opt-in, set GMD_ALIASES=true)',
      }));
      process.exit(1);
    }
  }

  var currentState = parseStateFrontmatter(readFile(STATE_PATH));
  var gateResult = evaluateQualityGates({
    provider: provider,
    command: cmd,
    action: resolvedAction,
    args: cmdArgs,
    config: currentConfig,
    state: currentState
  });

  if (!gateResult.allowed) {
    console.error(JSON.stringify(buildGateBlockedResponse({
      provider: provider,
      command: cmd,
      gatedAction: gateResult.gated_action,
      failedGates: gateResult.failed_gates,
      remediation: gateResult.remediation
    }), null, 2));
    process.exit(1);
  }

  var result = COMMANDS[cmd](cmdArgs);

  if (cmd === 'verify') {
    var targetCampaign = cmdArgs[0] || null;
    if (targetCampaign && result && result.status === 'passed') {
      stateSet('last_verified_campaign', targetCampaign);
      stateSet('last_verified_at', now());
      result.gate_recorded = {
        campaign: targetCampaign,
        verified_at: stateGet('last_verified_at').last_verified_at
      };
    }
  }
  var output = JSON.stringify(result, null, 2);

  // Large payload handling: write to temp file
  if (output.length > 50000) {
    var tmpFile = '/tmp/marketing-tools-' + Date.now() + '.json';
    fs.writeFileSync(tmpFile, output);
    console.log(JSON.stringify({ '@file': tmpFile, size: output.length }));
  } else {
    console.log(output);
  }
}

main();
