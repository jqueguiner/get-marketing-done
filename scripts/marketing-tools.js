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
const { execFileSync } = require('child_process');
const { routeCommand, listSupportedCommands } = require('./adapters/command-router');

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
  const state = readFile(STATE_PATH);
  const stateFm = parseStateFrontmatter(state);
  const continueFile = path.join(DATA, '.continue-here.md');
  const hasContinue = fileExists(continueFile);
  const continueContent = hasContinue ? readFile(continueFile) : null;

  return {
    timestamp: now(),
    has_state: !!state,
    state: stateFm,
    has_continue_file: hasContinue,
    continue_content: continueContent,
    has_context: fileExists(CONTEXT_PATH),
    has_db: fileExists(DB_PATH),
    pipeline: initCampaign(null).pipeline,
    suggested_action: determineSuggestedAction(stateFm, hasContinue),
  };
}

function determineSuggestedAction(stateFm, hasContinue) {
  if (hasContinue) return 'resume_from_continue_file';
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
    next_action: determineSuggestedAction(state, fileExists(path.join(DATA, '.continue-here.md'))),
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

  var continueContent = '# Continue Here\n> Paused: ' + now() + '\n> Reason: ' + (reason || 'Manual pause') + '\n\n## Position\n- Step: ' + (state.current_step || 0) + ' \u2014 ' + (state.current_step_name || 'Unknown') + '\n- Campaign: ' + (state.current_campaign || '(none)') + '\n\n## Pipeline at pause\n- Companies: ' + pipeline.companies + '\n- Enriched: ' + pipeline.companies_enriched + ' (' + pipeline.enrichment_rate + '%)\n- Emails: ' + pipeline.emails_generated + '\n\n## What was happening\n' + (reason || 'No reason provided') + '\n\n## Next action when resuming\n' + determineSuggestedAction(state, false) + '\n';

  fs.writeFileSync(path.join(DATA, '.continue-here.md'), continueContent);
  stateSet('paused_at', now());
  stateSet('pause_reason', reason || 'Manual pause');
  return { paused: true, continue_file: path.join(DATA, '.continue-here.md') };
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

// ─── DB Pass-through ───

var DB_COMMANDS = [
  'add-companies', 'add-contacts', 'add-datapoints', 'assign-segment',
  'campaign-results', 'create-segment', 'define-datapoints', 'enrichment-status',
  'export', 'get-company', 'get-email', 'get-emails', 'list-companies',
  'mark-uploaded', 'save-emails', 'save-results', 'show-datapoints',
  'update-email', 'validate-enrichment'
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
  var provider = process.env.GMD_PROVIDER || 'claude';

  if (!cmd || cmd === 'help') {
    console.log(JSON.stringify({
      commands: Object.keys(COMMANDS),
      usage: 'node scripts/marketing-tools.js <command> [args...]'
    }, null, 2));
    return;
  }

  if (!(cmd in COMMANDS)) {
    var routed = routeCommand({
      provider: provider,
      command: cmd,
      params: {},
      config: { aliases: process.env.GMD_ALIASES === '1' || process.env.GMD_ALIASES === 'true' }
    });
    if (routed && ACTION_TO_COMMAND[routed.action] && (ACTION_TO_COMMAND[routed.action] in COMMANDS)) {
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

  var result = COMMANDS[cmd](cmdArgs);
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
