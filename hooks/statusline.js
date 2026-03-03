#!/usr/bin/env node
/**
 * Statusline hook — shows campaign progress, current step, and context usage.
 * Registered as statusLine.command in settings.json.
 * Writes bridge file for context monitor.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STATE_PATH = path.join(ROOT, 'data', 'STATE.md');
const DB_PATH = path.join(ROOT, 'data', 'gtm.db');
const SESSION_ID = process.env.CLAUDE_SESSION_ID || 'default';
const BRIDGE_PATH = '/tmp/marketing-ctx-' + SESSION_ID + '.json';

function fileExists(p) { try { fs.accessSync(p); return true; } catch { return false; } }

function parseStateFrontmatter(content) {
  if (!content) return {};
  var match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  var fm = {};
  match[1].split('\n').forEach(function(line) {
    var parts = line.split(':');
    if (parts.length >= 2) fm[parts[0].trim()] = parts.slice(1).join(':').trim().replace(/^"(.*)"$/, '$1');
  });
  return fm;
}

function progressBar(pct, width) {
  width = width || 10;
  var filled = Math.round(width * pct / 100);
  return '\u2588'.repeat(filled) + '\u2591'.repeat(width - filled);
}

try {
  var state = {};
  if (fileExists(STATE_PATH)) {
    state = parseStateFrontmatter(fs.readFileSync(STATE_PATH, 'utf8'));
  }

  var step = state.current_step || '0';
  var stepName = state.current_step_name || 'Not started';
  var campaign = state.current_campaign || '';

  // Pipeline counts (lightweight — no sqlite dependency, read from state)
  var parts = [];
  parts.push('Step ' + step + '/10');
  parts.push(stepName);
  if (campaign) parts.push('\uD83D\uDCE7 ' + campaign);

  // Write bridge file for context monitor
  var bridgeData = {
    session_id: SESSION_ID,
    timestamp: new Date().toISOString(),
    step: step,
    step_name: stepName,
    campaign: campaign,
  };

  // Capture context metrics from environment if available
  if (process.env.CLAUDE_CONTEXT_REMAINING) {
    bridgeData.remaining_percent = parseFloat(process.env.CLAUDE_CONTEXT_REMAINING);
  }

  fs.writeFileSync(BRIDGE_PATH, JSON.stringify(bridgeData));

  // Output statusline
  process.stdout.write('GTM: ' + parts.join(' \u2502 '));
} catch (e) {
  process.stdout.write('GTM: ready');
}
