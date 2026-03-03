#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TOOL = path.join(ROOT, 'scripts', 'marketing-tools.js');
const STATE_PATH = path.join(ROOT, 'data', 'STATE.md');
const CONTINUE_PATH = path.join(ROOT, 'data', '.continue-here.md');
const CAMPAIGN = 'parity-smoke-campaign';

function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

function runTool(provider, command, args) {
  const result = spawnSync('node', [TOOL, command].concat(args || []), {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, GMD_PROVIDER: provider, GMD_ALIASES: 'false' }
  });

  const stdout = (result.stdout || '').trim();
  const stderr = (result.stderr || '').trim();
  return {
    status: result.status,
    stdout,
    stderr,
    json: parseJson(stdout) || parseJson(stderr)
  };
}

function backupFile(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
}

function restoreFile(filePath, content) {
  if (content === null) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return;
  }
  fs.writeFileSync(filePath, content);
}

function addCheck(checks, failures, data) {
  checks.push(data);
  if (!data.pass) {
    failures.push({
      requirement: data.requirement,
      check: data.check,
      expected: data.expected,
      actual: data.actual,
      detail: data.detail || null
    });
  }
}

function pick(obj, keys) {
  const out = {};
  keys.forEach((k) => {
    out[k] = obj ? obj[k] : undefined;
  });
  return out;
}

function normalizeProgressSteps(payload) {
  return (payload && Array.isArray(payload.steps) ? payload.steps : []).map((step) => ({
    step: step.step,
    name: step.name,
    status: step.status
  }));
}

function assertBlockedPayload(result) {
  return Boolean(
    result.status !== 0 &&
    result.json &&
    result.json.code === 'QUALITY_GATE_BLOCKED' &&
    Array.isArray(result.json.failed_gates)
  );
}

function main() {
  const startedAt = new Date().toISOString();
  const checks = [];
  const failures = [];
  const stateBackup = backupFile(STATE_PATH);
  const continueBackup = backupFile(CONTINUE_PATH);

  try {
    // Scenario 1: init parity
    const initClaude = runTool('claude', '/gmd:company-context-builder');
    const initCodex = runTool('codex', '$gmd-company-context-builder');

    addCheck(checks, failures, {
      requirement: 'CMD-01',
      check: 'init.runtime.claude',
      pass: initClaude.status === 0,
      expected: 0,
      actual: initClaude.status,
      detail: initClaude.stderr || null
    });
    addCheck(checks, failures, {
      requirement: 'CMD-01',
      check: 'init.runtime.codex',
      pass: initCodex.status === 0,
      expected: 0,
      actual: initCodex.status,
      detail: initCodex.stderr || null
    });

    const initStrictFields = ['has_context', 'has_schema', 'has_state'];
    addCheck(checks, failures, {
      requirement: 'QUAL-01',
      check: 'init.strict.core_flags',
      pass: JSON.stringify(pick(initClaude.json, initStrictFields)) === JSON.stringify(pick(initCodex.json, initStrictFields)),
      expected: pick(initClaude.json, initStrictFields),
      actual: pick(initCodex.json, initStrictFields)
    });

    // Scenario 2: progress parity
    const progressClaude = runTool('claude', '/gmd:campaign-progress');
    const progressCodex = runTool('codex', '$gmd-campaign-progress');
    const progressStrict = ['current_step', 'current_step_name', 'progress_pct', 'next_action'];

    addCheck(checks, failures, {
      requirement: 'CMD-01',
      check: 'progress.runtime.claude',
      pass: progressClaude.status === 0,
      expected: 0,
      actual: progressClaude.status,
      detail: progressClaude.stderr || null
    });
    addCheck(checks, failures, {
      requirement: 'CMD-01',
      check: 'progress.runtime.codex',
      pass: progressCodex.status === 0,
      expected: 0,
      actual: progressCodex.status,
      detail: progressCodex.stderr || null
    });
    addCheck(checks, failures, {
      requirement: 'QUAL-01',
      check: 'progress.strict.fields',
      pass: JSON.stringify(pick(progressClaude.json, progressStrict)) === JSON.stringify(pick(progressCodex.json, progressStrict)),
      expected: pick(progressClaude.json, progressStrict),
      actual: pick(progressCodex.json, progressStrict)
    });
    addCheck(checks, failures, {
      requirement: 'QUAL-02',
      check: 'progress.semantic.steps',
      pass: JSON.stringify(normalizeProgressSteps(progressClaude.json)) === JSON.stringify(normalizeProgressSteps(progressCodex.json)),
      expected: normalizeProgressSteps(progressClaude.json),
      actual: normalizeProgressSteps(progressCodex.json)
    });

    // Scenario 3: pause/resume cross-provider flow
    const pauseClaude = runTool('claude', '/gmd:pause-work', ['flow-smoke-a']);
    const resumeCodex = runTool('codex', '$gmd-resume-work');
    const pauseCodex = runTool('codex', '$gmd-pause-work', ['flow-smoke-b']);
    const resumeClaude = runTool('claude', '/gmd:resume-work');

    addCheck(checks, failures, {
      requirement: 'CMD-01',
      check: 'pause_resume.claude_to_codex',
      pass: pauseClaude.status === 0 && resumeCodex.status === 0,
      expected: { pause: 0, resume: 0 },
      actual: { pause: pauseClaude.status, resume: resumeCodex.status },
      detail: resumeCodex.stderr || null
    });
    addCheck(checks, failures, {
      requirement: 'CMD-01',
      check: 'pause_resume.codex_to_claude',
      pass: pauseCodex.status === 0 && resumeClaude.status === 0,
      expected: { pause: 0, resume: 0 },
      actual: { pause: pauseCodex.status, resume: resumeClaude.status },
      detail: resumeClaude.stderr || null
    });
    addCheck(checks, failures, {
      requirement: 'QUAL-02',
      check: 'pause_resume.resume_source_consistent',
      pass: Boolean(
        resumeCodex.json &&
        resumeClaude.json &&
        typeof resumeCodex.json.resume_source === 'string' &&
        typeof resumeClaude.json.resume_source === 'string'
      ),
      expected: 'resume_source present for both providers',
      actual: {
        codex: resumeCodex.json ? resumeCodex.json.resume_source : null,
        claude: resumeClaude.json ? resumeClaude.json.resume_source : null
      }
    });

    // Scenario 4: send-prepare parity (blocked then allowed)
    runTool('claude', 'state-set', ['last_verified_campaign', '']);
    runTool('claude', 'state-set', ['last_verified_at', '']);

    const blockedClaude = runTool('claude', '/gmd:run-instantly', [CAMPAIGN]);
    const blockedCodex = runTool('codex', '$gmd-run-instantly', [CAMPAIGN]);

    addCheck(checks, failures, {
      requirement: 'CMD-01',
      check: 'send_prepare.blocked.claude',
      pass: assertBlockedPayload(blockedClaude),
      expected: 'QUALITY_GATE_BLOCKED payload',
      actual: blockedClaude.json || blockedClaude.stderr
    });
    addCheck(checks, failures, {
      requirement: 'CMD-01',
      check: 'send_prepare.blocked.codex',
      pass: assertBlockedPayload(blockedCodex),
      expected: 'QUALITY_GATE_BLOCKED payload',
      actual: blockedCodex.json || blockedCodex.stderr
    });

    runTool('claude', 'state-set', ['last_verified_campaign', CAMPAIGN]);
    runTool('claude', 'state-set', ['last_verified_at', new Date().toISOString().slice(0, 19).replace('T', ' ')]);

    const allowedClaude = runTool('claude', '/gmd:run-instantly', [CAMPAIGN]);
    const allowedCodex = runTool('codex', '$gmd-run-instantly', [CAMPAIGN]);

    addCheck(checks, failures, {
      requirement: 'QUAL-02',
      check: 'send_prepare.allowed.runtime',
      pass: allowedClaude.status === 0 && allowedCodex.status === 0,
      expected: { claude: 0, codex: 0 },
      actual: { claude: allowedClaude.status, codex: allowedCodex.status },
      detail: { claude: allowedClaude.stderr || null, codex: allowedCodex.stderr || null }
    });
    addCheck(checks, failures, {
      requirement: 'QUAL-01',
      check: 'send_prepare.allowed.payload_shape',
      pass: Boolean(
        allowedClaude.json && allowedClaude.json.outreach &&
        allowedCodex.json && allowedCodex.json.outreach
      ),
      expected: 'outreach payload for both providers',
      actual: {
        claude_has_outreach: Boolean(allowedClaude.json && allowedClaude.json.outreach),
        codex_has_outreach: Boolean(allowedCodex.json && allowedCodex.json.outreach)
      }
    });
  } finally {
    restoreFile(STATE_PATH, stateBackup);
    restoreFile(CONTINUE_PATH, continueBackup);
  }

  const status = failures.length === 0 ? 'passed' : 'failed';
  const output = {
    status,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    requirements: ['CMD-01', 'QUAL-01', 'QUAL-02'],
    checks,
    failures
  };

  console.log(JSON.stringify(output, null, 2));
  process.exit(status === 'passed' ? 0 : 1);
}

main();
