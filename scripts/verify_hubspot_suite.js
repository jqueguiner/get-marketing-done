#!/usr/bin/env node
/**
 * Aggregated HubSpot validation suite.
 * Runs launch-gate and sync/results validators sequentially and aggregates output.
 */

const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SCRIPTS = [
  'verify_hubspot_launch_gate.js',
  'verify_hubspot_sync_regression.js'
];

function runScript(scriptName) {
  const p = path.join(ROOT, 'scripts', scriptName);
  const r = spawnSync('node', [p], { cwd: ROOT, encoding: 'utf8' });
  let parsed = null;
  const text = (r.stdout || '').trim() || (r.stderr || '').trim();
  try { parsed = JSON.parse(text); } catch (_) { parsed = { status: 'failed', parse_error: true, raw: text }; }
  return {
    script: scriptName,
    exit_code: r.status,
    status: parsed.status || (r.status === 0 ? 'passed' : 'failed'),
    failures: Array.isArray(parsed.failures) ? parsed.failures.length : null,
    output: parsed
  };
}

function main() {
  const results = SCRIPTS.map(runScript);
  const failed = results.filter((r) => r.exit_code !== 0 || r.status !== 'passed');

  const out = {
    status: failed.length === 0 ? 'passed' : 'failed',
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    checks: results
  };

  console.log(JSON.stringify(out, null, 2));
  process.exit(failed.length === 0 ? 0 : 1);
}

main();
