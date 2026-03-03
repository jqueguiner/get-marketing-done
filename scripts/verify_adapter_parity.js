#!/usr/bin/env node

const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const SECTIONS = [
  {
    id: 'codex_command_sweep',
    script: 'verify_codex_command_sweep.js',
    requirements: ['CMD-01', 'QUAL-02']
  },
  {
    id: 'claude_parity',
    script: 'verify_claude_parity.js',
    requirements: ['QUAL-01', 'QUAL-02']
  },
  {
    id: 'cross_adapter_continuity',
    script: 'verify_cross_adapter_continuity.js',
    requirements: ['CMD-01', 'QUAL-01']
  },
  {
    id: 'quality_gate_consistency',
    script: 'verify_quality_gate_consistency.js',
    requirements: ['CMD-01', 'QUAL-02']
  }
];

function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

function runSection(section) {
  const scriptPath = path.join(ROOT, 'scripts', section.script);
  const result = spawnSync('node', [scriptPath], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env }
  });

  const stdout = (result.stdout || '').trim();
  const stderr = (result.stderr || '').trim();
  const parsed = parseJson(stdout) || parseJson(stderr);

  return {
    exit_status: result.status,
    stdout,
    stderr,
    parsed
  };
}

function summarizeSection(section, run) {
  const payload = run.parsed || {};
  const status = payload.status || (run.exit_status === 0 ? 'passed' : 'failed');
  const failures = Array.isArray(payload.failures) ? payload.failures : [];
  const checks = Array.isArray(payload.checks) ? payload.checks : [];

  return {
    section: section.id,
    requirements: section.requirements,
    script: `scripts/${section.script}`,
    status,
    exit_status: run.exit_status,
    total_checks: typeof payload.total_checks === 'number' ? payload.total_checks : checks.length,
    failures,
    checks,
    summary: {
      passed: payload.passed,
      failed: payload.failed,
      total: payload.total || payload.total_checks || checks.length
    }
  };
}

function extractFailureExcerpts(summary) {
  if (!Array.isArray(summary.failures)) return [];

  return summary.failures.slice(0, 8).map((failure) => {
    const excerpt = {};
    if (failure.check) excerpt.check = failure.check;
    if (failure.label) excerpt.check = failure.label;
    if (failure.expected !== undefined) excerpt.expected = failure.expected;
    if (failure.actual !== undefined) excerpt.actual = failure.actual;
    if (failure.baseline !== undefined) excerpt.expected = failure.baseline;
    if (failure.current !== undefined) excerpt.actual = failure.current;
    if (failure.detail !== undefined) excerpt.detail = failure.detail;
    if (failure.runtime_error !== undefined) excerpt.runtime_error = failure.runtime_error;
    if (failure.routing_error !== undefined) excerpt.routing_error = failure.routing_error;
    return excerpt;
  });
}

function buildRequirementFailures(sectionSummary) {
  const excerpts = extractFailureExcerpts(sectionSummary);
  return sectionSummary.requirements.map((requirement) => ({
    requirement,
    section: sectionSummary.section,
    excerpts
  }));
}

function main() {
  const startedAt = new Date().toISOString();
  const sections = [];
  const failures = [];

  for (let i = 0; i < SECTIONS.length; i += 1) {
    const spec = SECTIONS[i];
    const run = runSection(spec);
    const summary = summarizeSection(spec, run);
    sections.push(summary);

    if (summary.status !== 'passed' || summary.exit_status !== 0) {
      const requirementFailures = buildRequirementFailures(summary);
      failures.push(...requirementFailures);

      const output = {
        status: 'failed',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        fail_fast: true,
        failed_section: summary.section,
        requirements: ['CMD-01', 'QUAL-01', 'QUAL-02'],
        sections,
        failures
      };

      console.log(JSON.stringify(output, null, 2));
      process.exit(1);
    }
  }

  const output = {
    status: 'passed',
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    fail_fast: true,
    requirements: ['CMD-01', 'QUAL-01', 'QUAL-02'],
    sections,
    failures: []
  };

  console.log(JSON.stringify(output, null, 2));
  process.exit(0);
}

main();
