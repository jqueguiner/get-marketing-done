#!/usr/bin/env node
/**
 * Full codex native command sweep.
 * Verifies routing and runtime command recognition for every `$gmd-*` command.
 */

const path = require('path');
const { spawnSync } = require('child_process');
const { commandMap } = require('./adapters/providers/codex');
const { routeCommand, getProviderDiagnostics } = require('./adapters/command-router');

const ROOT = path.resolve(__dirname, '..');

function runCommand(command) {
  const result = spawnSync(
    'node',
    [path.join(ROOT, 'scripts', 'marketing-tools.js'), command],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: Object.assign({}, process.env, {
        GMD_PROVIDER: 'codex',
        GMD_ALIASES: 'false',
      })
    }
  );

  return {
    status: result.status,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim()
  };
}

function parseMaybeJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch (_) { return null; }
}

function main() {
  const diagnostics = getProviderDiagnostics('codex');
  const commands = Object.keys(commandMap).sort();
  const checks = [];

  commands.forEach(function(command) {
    let routingOk = false;
    let routingError = null;
    try {
      const routed = routeCommand({ provider: 'codex', command, config: { aliases: false } });
      routingOk = Boolean(routed && routed.action);
    } catch (err) {
      routingError = err.message;
    }

    const runtime = runCommand(command);
    const runtimeJson = parseMaybeJson(runtime.stdout) || parseMaybeJson(runtime.stderr);
    const hasUnknownError = runtimeJson && typeof runtimeJson.error === 'string' && runtimeJson.error.startsWith('Unknown command');
    const runtimeOk = runtime.status === 0 && !hasUnknownError;

    checks.push({
      command,
      routing_ok: routingOk,
      runtime_ok: runtimeOk,
      runtime_exit: runtime.status,
      routing_error: routingError,
      runtime_error: runtimeJson && runtimeJson.error ? runtimeJson.error : null
    });
  });

  const passed = checks.filter(c => c.routing_ok && c.runtime_ok).length;
  const failed = checks.length - passed;
  const output = {
    provider: 'codex',
    strict_native: diagnostics.strict_native,
    total: checks.length,
    passed,
    failed,
    checks
  };

  console.log(JSON.stringify(output, null, 2));
  process.exit(failed === 0 ? 0 : 1);
}

main();
