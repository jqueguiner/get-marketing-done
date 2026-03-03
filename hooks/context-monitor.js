#!/usr/bin/env node
/**
 * Context monitor hook — fires PostToolUse.
 * Reads bridge file from statusline, warns when context is running low.
 * Adapted from GSD's three-component context monitoring system.
 */

var fs = require('fs');

var SESSION_ID = process.env.CLAUDE_SESSION_ID || 'default';
var BRIDGE_PATH = '/tmp/marketing-ctx-' + SESSION_ID + '.json';
var COUNTER_PATH = '/tmp/marketing-ctx-counter-' + SESSION_ID + '.json';

var WARNING_THRESHOLD = 35;  // percent remaining
var CRITICAL_THRESHOLD = 25;
var DEBOUNCE_INTERVAL = 5;   // tool uses between warnings

function fileExists(p) { try { fs.accessSync(p); return true; } catch { return false; } }

try {
  // Read bridge file
  if (!fileExists(BRIDGE_PATH)) {
    process.stdout.write(JSON.stringify({}));
    process.exit(0);
  }

  var bridge = JSON.parse(fs.readFileSync(BRIDGE_PATH, 'utf8'));

  // Check staleness (ignore if older than 60 seconds)
  var age = Date.now() - new Date(bridge.timestamp).getTime();
  if (age > 60000) {
    process.stdout.write(JSON.stringify({}));
    process.exit(0);
  }

  var remaining = bridge.remaining_percent;
  if (remaining === undefined || remaining === null) {
    process.stdout.write(JSON.stringify({}));
    process.exit(0);
  }

  // Debounce logic
  var counter = { uses: 0, last_severity: 'normal' };
  if (fileExists(COUNTER_PATH)) {
    try { counter = JSON.parse(fs.readFileSync(COUNTER_PATH, 'utf8')); } catch (e) { /* ignore */ }
  }
  counter.uses = (counter.uses || 0) + 1;

  var severity = 'normal';
  if (remaining <= CRITICAL_THRESHOLD) severity = 'critical';
  else if (remaining <= WARNING_THRESHOLD) severity = 'warning';

  // Write counter
  fs.writeFileSync(COUNTER_PATH, JSON.stringify({ uses: counter.uses, last_severity: severity }));

  // Check if we should emit a warning
  var shouldWarn = false;
  if (severity === 'critical' && counter.last_severity !== 'critical') {
    shouldWarn = true; // Always warn on severity escalation
  } else if (severity !== 'normal' && counter.uses % DEBOUNCE_INTERVAL === 0) {
    shouldWarn = true; // Periodic warnings
  }

  if (shouldWarn) {
    var message = '';
    if (severity === 'critical') {
      message = 'CRITICAL: Context window at ' + Math.round(remaining) + '% remaining. ' +
        'Immediately save your current work state. Run /marketing:pause-work to preserve campaign context. ' +
        'Do not start new research or generation tasks.';
    } else {
      message = 'WARNING: Context window at ' + Math.round(remaining) + '% remaining. ' +
        'Complete your current task and consider running /marketing:pause-work soon. ' +
        'Avoid starting new bulk operations.';
    }

    process.stdout.write(JSON.stringify({
      additionalContext: message
    }));
  } else {
    process.stdout.write(JSON.stringify({}));
  }
} catch (e) {
  process.stdout.write(JSON.stringify({}));
}
