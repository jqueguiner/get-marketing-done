#!/usr/bin/env node
/**
 * HubSpot sync/results regression validator.
 * Verifies idempotent campaign shell behavior and results ingestion contract.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'data', 'gtm.db');

function runNode(args) {
  const r = spawnSync('node', [path.join(ROOT, 'scripts', 'marketing-tools.js')].concat(args), {
    cwd: ROOT,
    encoding: 'utf8'
  });
  const out = (r.stdout || '').trim();
  const err = (r.stderr || '').trim();
  const text = out || err || '{}';
  let json = null;
  try { json = JSON.parse(text); } catch (_) { json = { parse_error: true, raw: text }; }
  return { code: r.status, json, out, err };
}

function sqlScalar(sql) {
  const r = spawnSync('sqlite3', [DB_PATH, sql], { encoding: 'utf8' });
  return (r.stdout || '').trim();
}

function runSql(sql) {
  return spawnSync('sqlite3', [DB_PATH, sql], { encoding: 'utf8' });
}

function main() {
  const runId = Date.now();
  const campaign = `sync-${runId}`;
  const tmpResults = path.join(os.tmpdir(), `hubspot-results-${runId}.json`);

  const checks = [];
  const failures = [];

  function record(check, pass, detail) {
    const item = { check, pass, detail: detail || null };
    checks.push(item);
    if (!pass) failures.push(item);
  }

  try {
    fs.writeFileSync(tmpResults, JSON.stringify({
      total_sent: 25,
      delivered: 24,
      opened: 10,
      replied: 3,
      bounced: 1,
      positive_replies: 2,
      neutral_replies: 1,
      negative_replies: 0,
      ooo_replies: 0
    }));

    runNode(['hubspot-campaign', 'create', campaign, '--segment', 'fintech', '--owner', 'ops']);
    runNode(['hubspot-campaign', 'create', campaign, '--segment', 'fintech', '--owner', 'ops']);
    const count = sqlScalar(`SELECT COUNT(*) FROM hubspot_campaigns WHERE campaign_name='${campaign.replace(/'/g, "''")}';`);
    record('create_is_idempotent_by_campaign_name', count === '1', 'count=' + count);

    const invalidState = runNode(['hubspot-campaign', 'set-state', campaign, 'not-a-state']);
    record('invalid_state_rejected',
      invalidState.json && typeof invalidState.json.error === 'string' && invalidState.json.error.indexOf('Invalid lifecycle state') >= 0,
      invalidState.json && invalidState.json.error
    );

    runNode(['hubspot-campaign', 'link-id', campaign, 'HS-123']);
    const linked = runNode(['hubspot-campaign', 'get', campaign]);
    record('hubspot_id_link_persists',
      linked.json && linked.json.hubspot_campaign_id === 'HS-123',
      linked.json && linked.json.hubspot_campaign_id
    );

    const resultsMissing = runNode(['hubspot-campaign', 'results', campaign]);
    record('results_without_ingest_returns_structured_payload',
      Boolean(resultsMissing.json && resultsMissing.json.campaign === campaign && resultsMissing.json.results),
      resultsMissing.json && resultsMissing.json.results && resultsMissing.json.results.error
    );

    const ingest = runNode(['hubspot-campaign', 'results', campaign, '--file', tmpResults]);
    record('results_ingest_succeeds',
      ingest.json && ingest.json.ingestion && ingest.json.ingestion.results_saved === true,
      ingest.json && ingest.json.error
    );
    record('results_ingest_marks_completed',
      ingest.json && ingest.json.hubspot_campaign && ingest.json.hubspot_campaign.lifecycle_state === 'completed',
      ingest.json && ingest.json.hubspot_campaign && ingest.json.hubspot_campaign.lifecycle_state
    );
    record('results_payload_contains_metrics',
      ingest.json && ingest.json.results && Number(ingest.json.results.total_sent) === 25,
      ingest.json && ingest.json.results && ingest.json.results.total_sent
    );

    const ingestAgain = runNode(['hubspot-campaign', 'results', campaign, '--file', tmpResults]);
    record('results_ingest_repeat_is_safe',
      ingestAgain.json && ingestAgain.json.ingestion && ingestAgain.json.ingestion.results_saved === true,
      ingestAgain.json && ingestAgain.json.error
    );

  } finally {
    runSql(`DELETE FROM campaign_copy_approvals WHERE campaign_name='${campaign.replace(/'/g, "''")}';`);
    runSql(`DELETE FROM campaign_results WHERE campaign_id IN (SELECT id FROM campaigns WHERE name='${campaign.replace(/'/g, "''")}');`);
    runSql(`DELETE FROM campaigns WHERE name='${campaign.replace(/'/g, "''")}';`);
    runSql(`DELETE FROM hubspot_campaigns WHERE campaign_name='${campaign.replace(/'/g, "''")}';`);
    try { fs.unlinkSync(tmpResults); } catch (_) {}
  }

  const output = {
    status: failures.length === 0 ? 'passed' : 'failed',
    checks,
    failures
  };

  console.log(JSON.stringify(output, null, 2));
  process.exit(failures.length === 0 ? 0 : 1);
}

main();
