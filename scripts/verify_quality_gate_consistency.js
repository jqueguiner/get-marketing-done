#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const STATE_PATH = path.join(ROOT, 'data', 'STATE.md');
const TOOL_PATH = path.join(ROOT, 'scripts', 'marketing-tools.js');
const CAMPAIGN = 'quality-gate-smoke';

function runTool(provider, command, args) {
  const env = { ...process.env, GMD_PROVIDER: provider };
  const result = spawnSync('node', [TOOL_PATH, command].concat(args || []), {
    cwd: ROOT,
    env,
    encoding: 'utf8'
  });

  const stdout = (result.stdout || '').trim();
  const stderr = (result.stderr || '').trim();
  let stdoutJson = null;
  let stderrJson = null;

  try { stdoutJson = stdout ? JSON.parse(stdout) : null; } catch (_) { stdoutJson = null; }
  try { stderrJson = stderr ? JSON.parse(stderr) : null; } catch (_) { stderrJson = null; }

  return {
    status: result.status,
    stdout,
    stderr,
    stdout_json: stdoutJson,
    stderr_json: stderrJson
  };
}

function stateSet(key, value) {
  const out = runTool('claude', 'state-set', [key, value]);
  return out.status === 0;
}

function resetGateState() {
  stateSet('last_verified_campaign', '');
  stateSet('last_verified_at', '');
}

function checkBlockedContract(result, provider, failures, checks) {
  const payload = result.stderr_json;

  const isBlocked = result.status !== 0 && payload && payload.code === 'QUALITY_GATE_BLOCKED';
  checks.push({ check: provider + '.blocked.status_and_code', pass: isBlocked });
  if (!isBlocked) {
    failures.push({ check: provider + '.blocked.status_and_code', detail: { status: result.status, stderr: result.stderr } });
    return;
  }

  const actionOk = payload.gated_action === 'outreach.prepare';
  checks.push({ check: provider + '.blocked.gated_action', pass: actionOk });
  if (!actionOk) failures.push({ check: provider + '.blocked.gated_action', detail: payload.gated_action });

  const hasFailedGate = Array.isArray(payload.failed_gates) && payload.failed_gates.some((g) => g.gate === 'manual_verify_before_send');
  checks.push({ check: provider + '.blocked.failed_gate_entry', pass: hasFailedGate });
  if (!hasFailedGate) failures.push({ check: provider + '.blocked.failed_gate_entry', detail: payload.failed_gates });

  const hasRemediation = Array.isArray(payload.remediation) && payload.remediation.length > 0;
  checks.push({ check: provider + '.blocked.remediation', pass: hasRemediation });
  if (!hasRemediation) failures.push({ check: provider + '.blocked.remediation', detail: payload.remediation });
}

function main() {
  const startedAt = new Date().toISOString();
  const stateBackup = fs.readFileSync(STATE_PATH, 'utf8');
  const checks = [];
  const failures = [];
  const scenarios = [];

  try {
    // Scenario 1: blocked path under Claude
    resetGateState();
    const claudeBlocked = runTool('claude', '/gmd:run-instantly', [CAMPAIGN]);
    scenarios.push({ name: 'claude_blocked_prepare', status: claudeBlocked.status });
    checkBlockedContract(claudeBlocked, 'claude', failures, checks);

    // Scenario 2: blocked path under Codex
    resetGateState();
    const codexBlocked = runTool('codex', '$gmd-run-instantly', [CAMPAIGN]);
    scenarios.push({ name: 'codex_blocked_prepare', status: codexBlocked.status });
    checkBlockedContract(codexBlocked, 'codex', failures, checks);

    // Scenario 3: allow path after verification state is present
    stateSet('last_verified_campaign', CAMPAIGN);
    stateSet('last_verified_at', new Date().toISOString().slice(0, 19).replace('T', ' '));

    const codexAllowed = runTool('codex', '$gmd-run-instantly', [CAMPAIGN]);
    scenarios.push({ name: 'codex_allowed_prepare_after_verify', status: codexAllowed.status });

    const allowStatus = codexAllowed.status === 0;
    checks.push({ check: 'codex.allowed.status', pass: allowStatus });
    if (!allowStatus) failures.push({ check: 'codex.allowed.status', detail: codexAllowed.stderr || codexAllowed.stdout });

    const allowShape = !!(codexAllowed.stdout_json && codexAllowed.stdout_json.outreach);
    checks.push({ check: 'codex.allowed.payload_shape', pass: allowShape });
    if (!allowShape) failures.push({ check: 'codex.allowed.payload_shape', detail: codexAllowed.stdout });

    // Scenario 4: blocked payload parity between providers
    const claudePayload = claudeBlocked.stderr_json || {};
    const codexPayload = codexBlocked.stderr_json || {};
    const parity = (
      claudePayload.code === codexPayload.code &&
      claudePayload.gated_action === codexPayload.gated_action &&
      Boolean(Array.isArray(claudePayload.failed_gates) && claudePayload.failed_gates.length) ===
        Boolean(Array.isArray(codexPayload.failed_gates) && codexPayload.failed_gates.length)
    );
    checks.push({ check: 'blocked_payload_parity.claude_vs_codex', pass: parity });
    if (!parity) {
      failures.push({
        check: 'blocked_payload_parity.claude_vs_codex',
        detail: { claude: claudePayload, codex: codexPayload }
      });
    }
  } finally {
    fs.writeFileSync(STATE_PATH, stateBackup);
  }

  const passed = failures.length === 0;
  const summary = {
    status: passed ? 'passed' : 'failed',
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    requirement: 'SAFE-02',
    scenarios,
    checks,
    failures
  };

  console.log(JSON.stringify(summary, null, 2));
  process.exit(passed ? 0 : 1);
}

main();
