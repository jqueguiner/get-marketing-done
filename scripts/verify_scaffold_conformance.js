#!/usr/bin/env node

const path = require('path');
const { spawnSync } = require('child_process');
const { routeCommand } = require('./adapters/command-router');

const ROOT = path.resolve(__dirname, '..');
const TOOL_PATH = path.join(ROOT, 'scripts', 'marketing-tools.js');
const PROVIDERS = ['gemini', 'opencode', 'mistral'];

function parseJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch (_) { return null; }
}

function runTool(provider, command, args) {
  const result = spawnSync('node', [TOOL_PATH, command].concat(args || []), {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, GMD_PROVIDER: provider }
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

function addCheck(checks, failures, check) {
  checks.push(check);
  if (!check.pass) {
    failures.push({
      provider: check.provider,
      check: check.check,
      expected: check.expected,
      actual: check.actual,
      detail: check.detail || null
    });
  }
}

function main() {
  const startedAt = new Date().toISOString();
  const checks = [];
  const failures = [];

  PROVIDERS.forEach((provider) => {
    const providerModule = require('./adapters/providers/' + provider);
    const nativeCommands = Object.keys(providerModule.commandMap || {});
    const supportedCommand = nativeCommands[0] || '/gmd:campaign-progress';

    addCheck(checks, failures, {
      provider,
      check: 'provider.module_loaded',
      pass: Boolean(providerModule.provider && nativeCommands.length > 0),
      expected: 'provider + non-empty commandMap',
      actual: { provider: providerModule.provider, command_count: nativeCommands.length }
    });

    const inactiveRun = runTool(provider, supportedCommand, []);
    const inactivePayload = inactiveRun.json || {};
    addCheck(checks, failures, {
      provider,
      check: 'inactive_provider.structured_failure',
      pass: inactiveRun.status !== 0 &&
        inactivePayload.code === 'SCAFFOLD_PROVIDER_INACTIVE' &&
        typeof inactivePayload.capability === 'string' &&
        typeof inactivePayload.remediation === 'string',
      expected: {
        status_nonzero: true,
        code: 'SCAFFOLD_PROVIDER_INACTIVE',
        capability: `adapters.scaffolds.${provider}`,
        remediation: 'string'
      },
      actual: {
        status: inactiveRun.status,
        code: inactivePayload.code,
        capability: inactivePayload.capability,
        remediation: inactivePayload.remediation
      },
      detail: inactivePayload
    });

    const activeConfig = {
      aliases: false,
      adapters: {
        scaffolds: {
          gemini: provider === 'gemini',
          opencode: provider === 'opencode',
          mistral: provider === 'mistral'
        }
      }
    };

    let activeRouted = null;
    let activeErr = null;
    try {
      activeRouted = routeCommand({ provider, command: supportedCommand, params: {}, config: activeConfig });
    } catch (err) {
      activeErr = err;
    }

    addCheck(checks, failures, {
      provider,
      check: 'active_provider.native_route',
      pass: Boolean(activeRouted && activeRouted.action),
      expected: 'routed payload with action',
      actual: activeRouted || (activeErr ? { code: activeErr.code, message: activeErr.message } : null)
    });

    let unsupportedErr = null;
    try {
      routeCommand({
        provider,
        command: '/gmd:unsupported-scaffold-command',
        params: {},
        config: activeConfig
      });
    } catch (err) {
      unsupportedErr = err;
    }

    addCheck(checks, failures, {
      provider,
      check: 'active_provider.unsupported_command_failure',
      pass: Boolean(
        unsupportedErr &&
        unsupportedErr.code === 'SCAFFOLD_CAPABILITY_UNSUPPORTED' &&
        unsupportedErr.capability === 'native_command_map' &&
        typeof unsupportedErr.remediation === 'string'
      ),
      expected: {
        code: 'SCAFFOLD_CAPABILITY_UNSUPPORTED',
        capability: 'native_command_map',
        remediation: 'string'
      },
      actual: unsupportedErr
        ? {
            code: unsupportedErr.code,
            capability: unsupportedErr.capability,
            remediation: unsupportedErr.remediation
          }
        : null
    });
  });

  const status = failures.length === 0 ? 'passed' : 'failed';
  const output = {
    status,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    checks,
    failures
  };

  console.log(JSON.stringify(output, null, 2));
  process.exit(status === 'passed' ? 0 : 1);
}

main();
