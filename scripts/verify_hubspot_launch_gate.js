#!/usr/bin/env node
/**
 * HubSpot launch-gate regression validator.
 * Verifies copy-approval + preflight + launch blocking behavior.
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

function runPy(args) {
  const r = spawnSync('python3', [path.join(ROOT, 'scripts', 'db_manager.py')].concat(args), {
    cwd: ROOT,
    encoding: 'utf8'
  });
  const out = (r.stdout || '').trim();
  const text = out || '{}';
  let json = null;
  try { json = JSON.parse(text); } catch (_) { json = { parse_error: true, raw: text }; }
  return { code: r.status, json, out };
}

function runSql(sql) {
  return spawnSync('sqlite3', [DB_PATH, sql], { encoding: 'utf8' });
}

function hasFailedCheck(payload, checkName) {
  if (!payload || !Array.isArray(payload.failed_checks)) return false;
  return payload.failed_checks.some((c) => c.check === checkName);
}

function main() {
  const runId = Date.now();
  const campaign = `gate-${runId}`;
  const company = `Gate Co ${runId}`;
  const domain = `gate-${runId}.example`;
  const tmpCompanies = path.join(os.tmpdir(), `gate-companies-${runId}.json`);
  const tmpEmails = path.join(os.tmpdir(), `gate-emails-${runId}.json`);
  const tmpUpdate = path.join(os.tmpdir(), `gate-update-${runId}.json`);

  const checks = [];
  const failures = [];

  function record(check, pass, detail) {
    const item = { check, pass, detail: detail || null };
    checks.push(item);
    if (!pass) failures.push(item);
  }

  try {
    fs.writeFileSync(tmpCompanies, JSON.stringify([{ name: company, domain, industry: 'SaaS' }]));
    fs.writeFileSync(tmpEmails, JSON.stringify([{ company, subject: 'Initial subject', body: 'Initial body' }]));
    fs.writeFileSync(tmpUpdate, JSON.stringify({ subject: 'Updated subject', body: 'Updated body' }));

    runNode(['hubspot-campaign', 'create', campaign, '--segment', 'fintech', '--owner', 'ops']);
    runNode(['hubspot-campaign', 'set-state', campaign, 'configured']);

    const preNoEmail = runNode(['hubspot-campaign', 'preflight', campaign]);
    record('preflight.blocks_without_emails',
      preNoEmail.json && preNoEmail.json.code === 'HUBSPOT_PREFLIGHT_BLOCKED' && hasFailedCheck(preNoEmail.json, 'generated_emails_exist'),
      preNoEmail.json && preNoEmail.json.code
    );

    runPy(['add-companies', '--source', 'manual', '--file', tmpCompanies]);
    runPy(['save-emails', '--campaign', campaign, '--file', tmpEmails]);

    const launchNoApproval = runNode(['hubspot-campaign', 'launch', campaign]);
    record('launch.blocks_without_copy_approval',
      launchNoApproval.json && launchNoApproval.json.code === 'HUBSPOT_PREFLIGHT_BLOCKED' &&
      launchNoApproval.json.preflight && hasFailedCheck(launchNoApproval.json.preflight, 'copy_approval_valid'),
      launchNoApproval.json && launchNoApproval.json.code
    );

    const approval = runNode(['hubspot-campaign', 'approve', campaign, '--by', 'qa']);
    record('approval.created', approval.json && approval.json.approved === true, approval.json && approval.json.error);

    const prePass = runNode(['hubspot-campaign', 'preflight', campaign]);
    record('preflight.passes_with_approval',
      prePass.json && prePass.json.code === 'HUBSPOT_PREFLIGHT_PASSED' && prePass.json.status === 'passed',
      prePass.json && prePass.json.code
    );

    const launchPass = runNode(['hubspot-campaign', 'launch', campaign]);
    record('launch.succeeds_after_preflight',
      launchPass.json && launchPass.json.updated === true && launchPass.json.campaign && launchPass.json.campaign.lifecycle_state === 'launched',
      launchPass.json && launchPass.json.error
    );

    runPy(['update-email', '--company', company, '--file', tmpUpdate]);
    const approvalAfterEdit = runNode(['hubspot-campaign', 'approval-status', campaign]);
    record('approval.invalidated_on_copy_edit',
      approvalAfterEdit.json && approvalAfterEdit.json.approved === false,
      approvalAfterEdit.json && approvalAfterEdit.json.reason
    );

    const preAfterEdit = runNode(['hubspot-campaign', 'preflight', campaign]);
    record('preflight.blocks_after_copy_edit',
      preAfterEdit.json && preAfterEdit.json.code === 'HUBSPOT_PREFLIGHT_BLOCKED' && hasFailedCheck(preAfterEdit.json, 'copy_approval_valid'),
      preAfterEdit.json && preAfterEdit.json.code
    );
  } finally {
    runSql(`DELETE FROM campaign_copy_approvals WHERE campaign_name='${campaign.replace(/'/g, "''")}';`);
    runSql(`DELETE FROM emails WHERE campaign_id IN (SELECT id FROM campaigns WHERE name='${campaign.replace(/'/g, "''")}');`);
    runSql(`DELETE FROM campaign_results WHERE campaign_id IN (SELECT id FROM campaigns WHERE name='${campaign.replace(/'/g, "''")}');`);
    runSql(`DELETE FROM campaigns WHERE name='${campaign.replace(/'/g, "''")}';`);
    runSql(`DELETE FROM hubspot_campaigns WHERE campaign_name='${campaign.replace(/'/g, "''")}';`);
    runSql(`DELETE FROM companies WHERE domain='${domain.replace(/'/g, "''")}';`);
    [tmpCompanies, tmpEmails, tmpUpdate].forEach((p) => { try { fs.unlinkSync(p); } catch (_) {} });
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
