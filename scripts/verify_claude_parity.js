#!/usr/bin/env node
/**
 * Claude parity validator.
 *
 * Compares current Claude adapter behavior against a tagged baseline.
 * Default baseline is the latest git tag.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function run(cmd, args, opts) {
  return execFileSync(cmd, args, Object.assign({
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }, opts || {})).trim();
}

function runNodeJson(cwd, args, extraEnv) {
  const result = spawnSync('node', args, {
    cwd,
    encoding: 'utf8',
    env: Object.assign({}, process.env, extraEnv || {})
  });

  const stdout = (result.stdout || '').trim();
  const stderr = (result.stderr || '').trim();
  let parsed = null;
  if (stdout) {
    try { parsed = JSON.parse(stdout); } catch (_) { parsed = null; }
  }

  return {
    status: result.status,
    stdout,
    stderr,
    json: parsed
  };
}

function parseArgs(argv) {
  const out = { tag: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--baseline-tag' && argv[i + 1]) {
      out.tag = argv[i + 1];
      i += 1;
    } else if (token.startsWith('--baseline-tag=')) {
      out.tag = token.slice('--baseline-tag='.length);
    } else if (token === '--json') {
      out.json = true;
    }
  }
  return out;
}

function latestTag() {
  return run('git', ['describe', '--tags', '--abbrev=0']);
}

function baselineCommandsFromSkills(tag) {
  const files = run('git', ['ls-tree', '-r', '--name-only', tag, 'skills']).split('\n').filter(Boolean);
  const names = files
    .filter((f) => /^skills\/[^/]+\/SKILL\.md$/.test(f))
    .map((f) => f.split('/')[1]);
  return Array.from(new Set(names)).sort().map((name) => `/gmd:${name}`);
}

function setupWorktree(tag) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gmd-claude-parity-'));
  run('git', ['worktree', 'add', '--detach', dir, tag]);

  const dataPath = path.join(dir, 'data');
  if (!fs.existsSync(dataPath)) {
    fs.symlinkSync(path.join(ROOT, 'data'), dataPath, 'dir');
  }

  return dir;
}

function cleanupWorktree(dir) {
  try {
    run('git', ['worktree', 'remove', '--force', dir]);
  } catch (_) {
    // Best effort cleanup.
  }
}

function sortedJson(value) {
  if (Array.isArray(value)) return value.map(sortedJson);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((acc, key) => {
    acc[key] = sortedJson(value[key]);
    return acc;
  }, {});
}

function compareFields(name, baseline, current, fields, regressions) {
  fields.forEach((field) => {
    if (JSON.stringify(baseline[field]) !== JSON.stringify(current[field])) {
      regressions.push({
        check: `${name}.strict.${field}`,
        baseline: baseline[field],
        current: current[field]
      });
    }
  });
}

function compareSemanticProgress(baseline, current, regressions) {
  const normalize = (payload) => (payload.steps || []).map((s) => ({
    step: s.step,
    name: s.name,
    status: s.status
  }));

  const left = normalize(baseline);
  const right = normalize(current);
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    regressions.push({
      check: 'progress.semantic.steps',
      baseline: left,
      current: right
    });
  }
}

function compareSemanticVerify(baseline, current, regressions) {
  const normalize = (payload) => (payload.checks || []).map((c) => ({
    level: c.level,
    item: c.item,
    pass: c.pass
  }));

  const left = normalize(baseline);
  const right = normalize(current);
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    regressions.push({
      check: 'verify.semantic.checks',
      baseline: left,
      current: right
    });
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const baselineTag = args.tag || process.env.GMD_BASELINE_TAG || latestTag();
  const regressions = [];

  let worktreeDir = null;
  try {
    worktreeDir = setupWorktree(baselineTag);

    const baselineSurface = baselineCommandsFromSkills(baselineTag);
    const currentSurface = Object.keys(require('./adapters/providers/claude').commandMap).sort();

    if (JSON.stringify(baselineSurface) !== JSON.stringify(currentSurface)) {
      regressions.push({
        check: 'command_surface.strict',
        baseline_only: baselineSurface.filter((c) => !currentSurface.includes(c)),
        current_only: currentSurface.filter((c) => !baselineSurface.includes(c))
      });
    }

    const baselineProgressRun = runNodeJson(worktreeDir, ['scripts/marketing-tools.js', 'progress']);
    const baselineVerifyRun = runNodeJson(worktreeDir, ['scripts/marketing-tools.js', 'verify']);
    const currentProgressRun = runNodeJson(ROOT, ['scripts/marketing-tools.js', '/gmd:campaign-progress'], {
      GMD_PROVIDER: 'claude',
      GMD_ALIASES: 'false'
    });
    const currentVerifyRun = runNodeJson(ROOT, ['scripts/marketing-tools.js', '/gmd:campaign-verify'], {
      GMD_PROVIDER: 'claude',
      GMD_ALIASES: 'false'
    });

    const runs = [
      ['baseline.progress', baselineProgressRun],
      ['baseline.verify', baselineVerifyRun],
      ['current.progress', currentProgressRun],
      ['current.verify', currentVerifyRun]
    ];

    runs.forEach(([name, output]) => {
      if (output.status !== 0 || !output.json) {
        regressions.push({
          check: `${name}.runtime`,
          status: output.status,
          stderr: output.stderr || null,
          stdout: output.stdout || null
        });
      }
    });

    if (baselineProgressRun.json && currentProgressRun.json) {
      compareFields('progress', baselineProgressRun.json, currentProgressRun.json, [
        'current_step',
        'current_step_name',
        'progress_pct',
        'next_action'
      ], regressions);
      compareSemanticProgress(baselineProgressRun.json, currentProgressRun.json, regressions);
    }

    if (baselineVerifyRun.json && currentVerifyRun.json) {
      compareFields('verify', baselineVerifyRun.json, currentVerifyRun.json, [
        'status',
        'score',
        'score_pct'
      ], regressions);
      compareSemanticVerify(baselineVerifyRun.json, currentVerifyRun.json, regressions);
    }

    const output = {
      provider: 'claude',
      baseline_tag: baselineTag,
      strict_policy: {
        progress_fields: ['current_step', 'current_step_name', 'progress_pct', 'next_action'],
        verify_fields: ['status', 'score', 'score_pct']
      },
      semantic_policy: {
        progress: 'steps[{step,name,status}]',
        verify: 'checks[{level,item,pass}]'
      },
      regressions,
      status: regressions.length === 0 ? 'passed' : 'failed'
    };

    const rendered = args.json ? output : sortedJson(output);
    console.log(JSON.stringify(rendered, null, 2));
    process.exit(regressions.length === 0 ? 0 : 1);
  } catch (err) {
    console.error(JSON.stringify({
      status: 'failed',
      error: err.message
    }, null, 2));
    process.exit(1);
  } finally {
    if (worktreeDir) cleanupWorktree(worktreeDir);
  }
}

main();
