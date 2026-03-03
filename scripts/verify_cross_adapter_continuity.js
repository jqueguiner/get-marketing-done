#!/usr/bin/env node
/**
 * Cross-adapter continuity validator.
 *
 * Validates pause/resume/progress continuity across Claude and Codex using
 * shared persisted artifacts.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const STATE_PATH = path.join(DATA, 'STATE.md');
const CONTINUE_PATH = path.join(DATA, '.continue-here.md');

function runTool(provider, args) {
  const result = spawnSync('node', [path.join(ROOT, 'scripts', 'marketing-tools.js')].concat(args), {
    cwd: ROOT,
    encoding: 'utf8',
    env: Object.assign({}, process.env, {
      GMD_PROVIDER: provider,
      GMD_ALIASES: 'false'
    })
  });

  const stdout = (result.stdout || '').trim();
  const stderr = (result.stderr || '').trim();
  let json = null;
  if (stdout) {
    try { json = JSON.parse(stdout); } catch (_) { json = null; }
  }
  if (!json && stderr) {
    try { json = JSON.parse(stderr); } catch (_) { json = null; }
  }

  return {
    status: result.status,
    stdout,
    stderr,
    json
  };
}

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

function restoreFile(filePath, content) {
  if (content === null) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return;
  }
  fs.writeFileSync(filePath, content);
}

function parseFallbackWarning(resumeJson) {
  if (!resumeJson || !Array.isArray(resumeJson.warnings)) return null;
  return resumeJson.warnings.find((w) => w && w.warning_code === 'RESUME_SOURCE_FALLBACK') || null;
}

function assert(condition, label, details, failures, checks) {
  checks.push({ label, pass: Boolean(condition), details: details || null });
  if (!condition) failures.push({ label, details: details || null });
}

function main() {
  const stateBackup = backupFile(STATE_PATH);
  const continueBackup = backupFile(CONTINUE_PATH);
  const checks = [];
  const failures = [];

  try {
    // Scenario 1: pause Claude -> resume/progress Codex
    const pauseClaude = runTool('claude', ['pause', 'continuity-s1']);
    const resumeCodex = runTool('codex', ['init-resume']);
    const progressCodex = runTool('codex', ['progress']);
    const pausedBy1 = runTool('codex', ['state-get', 'paused_by_provider']);

    assert(pauseClaude.status === 0, 'scenario1.pause_claude.ok', pauseClaude.stderr, failures, checks);
    assert(resumeCodex.status === 0, 'scenario1.resume_codex.ok', resumeCodex.stderr, failures, checks);
    assert(progressCodex.status === 0, 'scenario1.progress_codex.ok', progressCodex.stderr, failures, checks);
    assert(pausedBy1.json && pausedBy1.json.paused_by_provider === 'claude', 'scenario1.paused_by_provider', pausedBy1.json, failures, checks);
    assert(resumeCodex.json && resumeCodex.json.resume_source === 'continue_file', 'scenario1.resume_source', resumeCodex.json, failures, checks);

    // Scenario 2: pause Codex -> resume/progress Claude
    const pauseCodex = runTool('codex', ['pause', 'continuity-s2']);
    const resumeClaude = runTool('claude', ['init-resume']);
    const progressClaude = runTool('claude', ['progress']);
    const pausedBy2 = runTool('claude', ['state-get', 'paused_by_provider']);

    assert(pauseCodex.status === 0, 'scenario2.pause_codex.ok', pauseCodex.stderr, failures, checks);
    assert(resumeClaude.status === 0, 'scenario2.resume_claude.ok', resumeClaude.stderr, failures, checks);
    assert(progressClaude.status === 0, 'scenario2.progress_claude.ok', progressClaude.stderr, failures, checks);
    assert(pausedBy2.json && pausedBy2.json.paused_by_provider === 'codex', 'scenario2.paused_by_provider', pausedBy2.json, failures, checks);
    assert(resumeClaude.json && resumeClaude.json.resume_source === 'continue_file', 'scenario2.resume_source', resumeClaude.json, failures, checks);

    // Scenario 3: continue file fallback
    const pauseBeforeFallback = runTool('claude', ['pause', 'continuity-s3']);
    assert(pauseBeforeFallback.status === 0, 'scenario3.pause_claude.ok', pauseBeforeFallback.stderr, failures, checks);

    if (fs.existsSync(CONTINUE_PATH)) {
      let content = fs.readFileSync(CONTINUE_PATH, 'utf8');
      content = content.replace(/> Paused: .*/g, '> Paused: not-a-real-timestamp');
      fs.writeFileSync(CONTINUE_PATH, content);
    }

    const fallbackResume = runTool('codex', ['init-resume']);
    const fallbackWarn = parseFallbackWarning(fallbackResume.json);
    assert(fallbackResume.status === 0, 'scenario3.resume_fallback.ok', fallbackResume.stderr, failures, checks);
    assert(fallbackResume.json && fallbackResume.json.resume_source === 'state_frontmatter', 'scenario3.resume_source', fallbackResume.json, failures, checks);
    assert(Boolean(fallbackWarn), 'scenario3.fallback_warning', fallbackResume.json, failures, checks);

    // Schema compatibility checks
    const stateAll = runTool('claude', ['state-get']);
    assert(stateAll.status === 0, 'schema.state_get.ok', stateAll.stderr, failures, checks);
    assert(stateAll.json && Object.prototype.hasOwnProperty.call(stateAll.json, 'current_step'), 'schema.current_step_exists', stateAll.json, failures, checks);
    assert(stateAll.json && Object.prototype.hasOwnProperty.call(stateAll.json, 'current_step_name'), 'schema.current_step_name_exists', stateAll.json, failures, checks);
    assert(stateAll.json && Object.prototype.hasOwnProperty.call(stateAll.json, 'last_provider'), 'schema.last_provider_exists', stateAll.json, failures, checks);
    assert(stateAll.json && Object.prototype.hasOwnProperty.call(stateAll.json, 'paused_by_provider'), 'schema.paused_by_provider_exists', stateAll.json, failures, checks);

    const output = {
      status: failures.length === 0 ? 'passed' : 'failed',
      provider_matrix: ['claude', 'codex'],
      total_checks: checks.length,
      passed: checks.filter((c) => c.pass).length,
      failed: failures.length,
      checks,
      failures
    };

    console.log(JSON.stringify(output, null, 2));
    process.exit(failures.length === 0 ? 0 : 1);
  } finally {
    restoreFile(STATE_PATH, stateBackup);
    restoreFile(CONTINUE_PATH, continueBackup);
  }
}

main();
