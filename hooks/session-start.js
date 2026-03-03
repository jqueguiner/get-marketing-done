#!/usr/bin/env node
/**
 * Session start hook — fires once when Claude Code starts.
 * Detects existing campaign state and prompts to resume.
 */

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var STATE_PATH = path.join(ROOT, 'data', 'STATE.md');
var CONTINUE_PATH = path.join(ROOT, 'data', '.continue-here.md');
var CONTEXT_PATH = path.join(ROOT, 'data', 'company_context.md');

function fileExists(p) { try { fs.accessSync(p); return true; } catch { return false; } }

try {
  var messages = [];

  if (fileExists(CONTINUE_PATH)) {
    messages.push('Paused campaign work detected. Run /marketing:resume-work to pick up where you left off.');
  } else if (fileExists(STATE_PATH)) {
    var content = fs.readFileSync(STATE_PATH, 'utf8');
    var match = content.match(/current_step_name:\s*"?([^"\n]+)"?/);
    var stepName = match ? match[1] : null;
    if (stepName && stepName !== 'Not started') {
      messages.push('Campaign in progress: ' + stepName + '. Run /marketing:campaign-progress to see status or /marketing:resume-work to continue.');
    }
  } else if (!fileExists(CONTEXT_PATH)) {
    messages.push('No company context found. Run /marketing:company-context-builder init to get started.');
  }

  if (messages.length > 0) {
    process.stdout.write(JSON.stringify({
      additionalContext: messages.join(' ')
    }));
  } else {
    process.stdout.write(JSON.stringify({}));
  }
} catch (e) {
  process.stdout.write(JSON.stringify({}));
}
