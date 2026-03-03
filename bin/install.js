#!/usr/bin/env node
/**
 * get-marketing-done installer
 *
 * Installs the marketing GTM automation system into ~/.claude/ (global)
 * or ./.claude/ (local) so commands appear as /marketing:* in Claude Code.
 *
 * Usage:
 *   npx get-marketing-done              # interactive
 *   npx get-marketing-done --global     # install to ~/.claude/
 *   npx get-marketing-done --local      # install to ./.claude/
 *   npx get-marketing-done --uninstall  # remove installation
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const os = require('os');

// ─── Constants ───

const PKG_ROOT = path.resolve(__dirname, '..');
const VERSION = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf8')).version;
const INSTALL_DIR_NAME = 'get-marketing-done';
const COMMAND_PREFIX = 'gmd';
const COMMANDS_DIR_NAME = 'commands/' + COMMAND_PREFIX;

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

// Files/dirs to copy (relative to PKG_ROOT)
const COPY_ENTRIES = [
  { type: 'dir', src: 'scripts' },
  { type: 'dir', src: 'hooks' },
  { type: 'dir', src: 'templates' },
  { type: 'file', src: 'config.example.json' },
];

// ─── Helpers ───

function c(color, text) { return COLORS[color] + text + COLORS.reset; }

function fileExists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFileSync(src, dest) {
  mkdirp(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDirSync(src, dest) {
  mkdirp(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function ask(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => { rl.close(); resolve(answer.trim()); });
  });
}

function printBanner() {
  console.log('');
  console.log(c('cyan', '  ┌─────────────────────────────────────┐'));
  console.log(c('cyan', '  │') + c('bold', '   get-marketing-done') + c('dim', ' v' + VERSION) + '          ' + c('cyan', '│'));
  console.log(c('cyan', '  │') + '   GTM automation for Claude Code    ' + c('cyan', '│'));
  console.log(c('cyan', '  └─────────────────────────────────────┘'));
  console.log('');
}

// ─── Skill → Command Conversion ───

function discoverSkills() {
  const skillsDir = path.join(PKG_ROOT, 'skills');
  const skills = [];
  for (const name of fs.readdirSync(skillsDir)) {
    const skillFile = path.join(skillsDir, name, 'SKILL.md');
    if (fileExists(skillFile)) {
      skills.push({ name, path: skillFile });
    }
  }
  return skills;
}

function convertSkillToCommand(skillFile, installRoot, isGlobal) {
  const content = fs.readFileSync(skillFile, 'utf8');
  const installDir = path.join(installRoot, INSTALL_DIR_NAME);

  // Build the path prefix for rewriting
  // For global: use $HOME so it's portable across machines
  // For local: use relative paths from working directory
  let scriptsPrefix, dataPrefix;
  if (isGlobal) {
    scriptsPrefix = '$HOME/.claude/' + INSTALL_DIR_NAME;
    dataPrefix = '$HOME/.claude/' + INSTALL_DIR_NAME + '/data';
  } else {
    scriptsPrefix = '.claude/' + INSTALL_DIR_NAME;
    dataPrefix = '.claude/' + INSTALL_DIR_NAME + '/data';
  }

  let result = content;

  // 1. Rewrite frontmatter: name → marketing:name, remove user-invocable
  result = result.replace(
    /^(---\n)([\s\S]*?)(---)/m,
    (match, open, body, close) => {
      let fm = body;
      // Prefix name with gmd:
      fm = fm.replace(/^(name:\s*)(.+)$/m, '$1' + COMMAND_PREFIX + ':$2');
      // Remove user-invocable line
      fm = fm.replace(/^user-invocable:\s*.*\n/m, '');
      return open + fm + close;
    }
  );

  // 2. Rewrite node script paths: `node scripts/` → `node "{prefix}/scripts/"`
  result = result.replace(
    /node\s+scripts\//g,
    'node "' + scriptsPrefix + '/scripts/'
  );
  // Close the quote after the script filename and before any arguments
  result = result.replace(
    /node\s+"([^"]+\.js)\s/g,
    'node "$1" '
  );
  // Handle cases where the script is at end of line (no args after .js)
  result = result.replace(
    /node\s+"([^"]+\.js)$/gm,
    'node "$1"'
  );

  // 3. Rewrite python3 script paths: `python3 scripts/` → `python3 "{prefix}/scripts/"`
  result = result.replace(
    /python3\s+scripts\//g,
    'python3 "' + scriptsPrefix + '/scripts/'
  );
  // Close quotes for python scripts
  result = result.replace(
    /python3\s+"([^"]+\.py)\s/g,
    'python3 "$1" '
  );
  result = result.replace(
    /python3\s+"([^"]+\.py)$/gm,
    'python3 "$1"'
  );

  // 4. Rewrite backtick-quoted data paths: `data/` → `{dataPrefix}/`
  result = result.replace(
    /`data\//g,
    '`' + dataPrefix + '/'
  );

  // 5. Rewrite bare data/ references in prose (careful not to break markdown)
  //    Match patterns like "written to data/company_context.md" or "at data/foo"
  //    but not inside backticks (already handled) or URLs
  result = result.replace(
    /(\s)data\/([\w{}._-]+)/g,
    '$1' + dataPrefix + '/$2'
  );

  // 6. Rewrite cross-skill references: /command-name → /marketing:command-name
  //    Match /skill-name patterns that reference other skills in the system
  const skillNames = [
    'company-context-builder', 'list-building', 'market-problems-deep-research',
    'data-points-builder', 'table-enrichment', 'email-generation',
    'copy-feedback', 'run-instantly', 'campaign-progress', 'campaign-verify',
    'pause-work', 'resume-work',
  ];
  for (const skillName of skillNames) {
    // Match /skill-name or /marketing:skill-name, rewrite to /gmd:skill-name
    const re = new RegExp('/(?:marketing:)?' + skillName.replace(/-/g, '\\-') + '\\b', 'g');
    result = result.replace(re, '/' + COMMAND_PREFIX + ':' + skillName);
  }

  return result;
}

// ─── Settings.json Merge ───

function mergeSettings(settingsPath, installRoot, isGlobal) {
  let settings = {};
  if (fileExists(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (e) {
      console.log(c('yellow', '  ⚠ Could not parse existing settings.json, creating backup'));
      fs.copyFileSync(settingsPath, settingsPath + '.backup');
      settings = {};
    }
  }

  const installDir = path.join(installRoot, INSTALL_DIR_NAME);
  let hookPrefix;
  if (isGlobal) {
    // Use absolute path with $HOME expanded at write time
    hookPrefix = path.join(os.homedir(), '.claude', INSTALL_DIR_NAME);
  } else {
    hookPrefix = path.join(installRoot, INSTALL_DIR_NAME);
  }

  // Ensure permissions structure
  if (!settings.permissions) settings.permissions = {};
  if (!Array.isArray(settings.permissions.allow)) settings.permissions.allow = [];

  // Add marketing-specific Bash permissions (idempotent)
  const marketingPerms = [
    'Bash(python3 "' + hookPrefix + '/scripts/*")',
    'Bash(node "' + hookPrefix + '/scripts/*")',
    'Bash(sqlite3 "' + hookPrefix + '/data/gtm.db" *)',
  ];
  for (const perm of marketingPerms) {
    if (!settings.permissions.allow.includes(perm)) {
      settings.permissions.allow.push(perm);
    }
  }

  // Ensure hooks structure
  if (!settings.hooks) settings.hooks = {};

  // PostToolUse: add context-monitor
  const contextMonitorCmd = 'node "' + hookPrefix + '/hooks/context-monitor.js"';
  if (!settings.hooks.PostToolUse) settings.hooks.PostToolUse = [];
  const hasContextMonitor = settings.hooks.PostToolUse.some(entry =>
    entry.hooks && entry.hooks.some(h => h.command && h.command.includes(INSTALL_DIR_NAME) && h.command.includes('context-monitor'))
  );
  if (!hasContextMonitor) {
    settings.hooks.PostToolUse.push({
      hooks: [{ type: 'command', command: contextMonitorCmd }]
    });
  }

  // SessionStart: add session-start
  const sessionStartCmd = 'node "' + hookPrefix + '/hooks/session-start.js"';
  if (!settings.hooks.SessionStart) settings.hooks.SessionStart = [];
  const hasSessionStart = settings.hooks.SessionStart.some(entry =>
    entry.hooks && entry.hooks.some(h => h.command && h.command.includes(INSTALL_DIR_NAME) && h.command.includes('session-start'))
  );
  if (!hasSessionStart) {
    settings.hooks.SessionStart.push({
      hooks: [{ type: 'command', command: sessionStartCmd }]
    });
  }

  // StatusLine: only add if no existing statusLine configured, or if ours
  const statusLineCmd = 'node "' + hookPrefix + '/hooks/statusline.js"';
  if (!settings.statusLine) {
    settings.statusLine = { command: statusLineCmd };
    console.log(c('green', '  ✓') + ' StatusLine configured');
  } else if (settings.statusLine.command && settings.statusLine.command.includes(INSTALL_DIR_NAME)) {
    settings.statusLine = { command: statusLineCmd };
    console.log(c('green', '  ✓') + ' StatusLine updated');
  } else {
    console.log(c('yellow', '  ⚠') + ' StatusLine already configured, skipping (use existing)');
  }

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  return settings;
}

// Remove marketing entries from settings on uninstall
function cleanSettings(settingsPath) {
  if (!fileExists(settingsPath)) return;

  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch { return; }

  // Remove marketing permissions
  if (settings.permissions && Array.isArray(settings.permissions.allow)) {
    settings.permissions.allow = settings.permissions.allow.filter(
      p => !p.includes(INSTALL_DIR_NAME)
    );
  }

  // Remove marketing hooks from PostToolUse (only ours, not GSD's)
  if (settings.hooks && settings.hooks.PostToolUse) {
    settings.hooks.PostToolUse = settings.hooks.PostToolUse.filter(entry =>
      !(entry.hooks && entry.hooks.some(h => h.command && h.command.includes(INSTALL_DIR_NAME)))
    );
    if (settings.hooks.PostToolUse.length === 0) delete settings.hooks.PostToolUse;
  }

  // Remove marketing hooks from SessionStart (only ours, not GSD's)
  if (settings.hooks && settings.hooks.SessionStart) {
    settings.hooks.SessionStart = settings.hooks.SessionStart.filter(entry =>
      !(entry.hooks && entry.hooks.some(h => h.command && h.command.includes(INSTALL_DIR_NAME)))
    );
    if (settings.hooks.SessionStart.length === 0) delete settings.hooks.SessionStart;
  }

  // Remove statusLine if it's ours
  if (settings.statusLine && settings.statusLine.command && settings.statusLine.command.includes(INSTALL_DIR_NAME)) {
    delete settings.statusLine;
  }

  // Clean empty structures
  if (settings.hooks && Object.keys(settings.hooks).length === 0) delete settings.hooks;

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
}

// ─── Manifest ───

function buildManifest(installRoot) {
  const manifest = { version: VERSION, installedAt: new Date().toISOString(), files: {} };
  const installDir = path.join(installRoot, INSTALL_DIR_NAME);
  const commandsDir = path.join(installRoot, COMMANDS_DIR_NAME);

  function walk(dir, prefix) {
    if (!fileExists(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = prefix ? prefix + '/' + entry.name : entry.name;
      if (entry.isDirectory()) {
        // Skip data directory — never tracked for deletion
        if (entry.name === 'data') continue;
        walk(full, rel);
      } else {
        manifest.files[full] = sha256(fs.readFileSync(full));
      }
    }
  }

  walk(installDir, '');
  walk(commandsDir, '');

  return manifest;
}

// ─── Install ───

async function install(targetRoot, isGlobal) {
  const installDir = path.join(targetRoot, INSTALL_DIR_NAME);
  const commandsDir = path.join(targetRoot, COMMANDS_DIR_NAME);
  const settingsPath = path.join(targetRoot, 'settings.json');
  const dataDir = path.join(installDir, 'data');

  console.log(c('bold', '  Installing to: ') + targetRoot);
  console.log('');

  // Step 1: Create directories
  process.stdout.write('  Creating directories...');
  mkdirp(installDir);
  mkdirp(commandsDir);
  mkdirp(dataDir);
  console.log(c('green', ' done'));

  // Step 2: Copy core files
  process.stdout.write('  Copying scripts and hooks...');
  let fileCount = 0;
  for (const entry of COPY_ENTRIES) {
    const src = path.join(PKG_ROOT, entry.src);
    const dest = path.join(installDir, entry.src);
    if (!fileExists(src)) continue;
    if (entry.type === 'dir') {
      copyDirSync(src, dest);
      fileCount += fs.readdirSync(src).length;
    } else {
      copyFileSync(src, dest);
      fileCount++;
    }
  }
  console.log(c('green', ' done') + c('dim', ' (' + fileCount + ' files)'));

  // Step 3: Create config.json from example if not present
  const configDest = path.join(installDir, 'config.json');
  if (!fileExists(configDest)) {
    const exampleSrc = path.join(PKG_ROOT, 'config.example.json');
    if (fileExists(exampleSrc)) {
      fs.copyFileSync(exampleSrc, configDest);
      console.log(c('green', '  ✓') + ' Created config.json from example');
    }
  } else {
    console.log(c('dim', '  ─ config.json already exists, preserved'));
  }

  // Step 4: Convert skills to commands
  process.stdout.write('  Converting skills to commands...');
  const skills = discoverSkills();
  let commandCount = 0;
  for (const skill of skills) {
    const commandContent = convertSkillToCommand(skill.path, targetRoot, isGlobal);
    const commandFile = path.join(commandsDir, skill.name + '.md');
    fs.writeFileSync(commandFile, commandContent);
    commandCount++;
  }
  console.log(c('green', ' done') + c('dim', ' (' + commandCount + ' commands)'));

  // Step 5: Merge settings
  process.stdout.write('  Configuring hooks and permissions...');
  mergeSettings(settingsPath, targetRoot, isGlobal);
  console.log(c('green', ' done'));

  // Step 6: Write VERSION and manifest
  fs.writeFileSync(path.join(installDir, 'VERSION'), VERSION + '\n');
  const manifest = buildManifest(targetRoot);
  fs.writeFileSync(path.join(installDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(c('green', '  ✓') + ' Wrote VERSION and manifest');

  // Done!
  console.log('');
  console.log(c('green', c('bold', '  ✓ Installation complete!')));
  console.log('');
  console.log(c('bold', '  Next steps:'));
  console.log('');
  console.log('  1. Configure API keys (optional):');

  const configPath = isGlobal
    ? '~/.claude/' + INSTALL_DIR_NAME + '/config.json'
    : '.claude/' + INSTALL_DIR_NAME + '/config.json';
  console.log(c('dim', '     Edit ' + configPath));
  console.log(c('dim', '     Set: extruct_api_key, instantly_api_key, perplexity_api_key'));
  console.log('');
  console.log('  2. Start Claude Code and run:');
  console.log(c('cyan', '     /' + COMMAND_PREFIX + ':company-context-builder init'));
  console.log('');
  console.log('  3. Available commands:');

  const commandNames = skills.map(s => '/' + COMMAND_PREFIX + ':' + s.name).sort();
  for (const name of commandNames) {
    console.log(c('dim', '     ' + name));
  }
  console.log('');
}

// ─── Uninstall ───

async function uninstall(targetRoot) {
  const installDir = path.join(targetRoot, INSTALL_DIR_NAME);
  const commandsDir = path.join(targetRoot, COMMANDS_DIR_NAME);
  const settingsPath = path.join(targetRoot, 'settings.json');
  const manifestPath = path.join(installDir, 'manifest.json');
  const dataDir = path.join(installDir, 'data');

  if (!fileExists(installDir)) {
    console.log(c('yellow', '  No installation found at ' + targetRoot));
    return;
  }

  console.log(c('bold', '  Uninstalling from: ') + targetRoot);
  console.log('');

  // Remove tracked files from manifest
  if (fileExists(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    let removed = 0;
    for (const filePath of Object.keys(manifest.files)) {
      if (fileExists(filePath)) {
        fs.unlinkSync(filePath);
        removed++;
      }
    }
    console.log(c('green', '  ✓') + ' Removed ' + removed + ' tracked files');
  }

  // Remove command files
  if (fileExists(commandsDir)) {
    const commands = fs.readdirSync(commandsDir);
    for (const file of commands) {
      fs.unlinkSync(path.join(commandsDir, file));
    }
    try { fs.rmdirSync(commandsDir); } catch {}
    // Try to remove parent commands/ dir if empty
    const parentDir = path.dirname(commandsDir);
    try { fs.rmdirSync(parentDir); } catch {}
    console.log(c('green', '  ✓') + ' Removed ' + commands.length + ' command files');
  }

  // Clean settings.json
  cleanSettings(settingsPath);
  console.log(c('green', '  ✓') + ' Cleaned settings.json');

  // Remove non-data files from install dir
  function removeNonData(dir) {
    if (!fileExists(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.name === 'data') continue; // preserve data directory
      if (entry.isDirectory()) {
        removeNonData(full);
        try { fs.rmdirSync(full); } catch {}
      } else {
        fs.unlinkSync(full);
      }
    }
  }
  removeNonData(installDir);

  // Check if data dir has content
  if (fileExists(dataDir)) {
    const dataFiles = fs.readdirSync(dataDir);
    if (dataFiles.length > 0) {
      console.log(c('yellow', '  ⚠') + ' Preserved data/ directory (' + dataFiles.length + ' items) — your campaign data is safe');
      console.log(c('dim', '    To remove: rm -rf "' + dataDir + '"'));
    } else {
      try { fs.rmdirSync(dataDir); } catch {}
    }
  }

  // Try removing install dir if empty
  try { fs.rmdirSync(installDir); } catch {}

  console.log('');
  console.log(c('green', c('bold', '  ✓ Uninstall complete')));
  console.log('');
}

// ─── CLI ───

async function main() {
  const args = process.argv.slice(2);

  const flags = {
    global: args.includes('--global') || args.includes('-g'),
    local: args.includes('--local') || args.includes('-l'),
    uninstall: args.includes('--uninstall') || args.includes('-u'),
    help: args.includes('--help') || args.includes('-h'),
  };

  printBanner();

  if (flags.help) {
    console.log('  ' + c('bold', 'Usage:') + ' npx get-marketing-done [options]');
    console.log('');
    console.log('  ' + c('bold', 'Options:'));
    console.log('    ' + c('cyan', '-g, --global') + '     Install to ~/.claude/ (default)');
    console.log('    ' + c('cyan', '-l, --local') + '      Install to ./.claude/');
    console.log('    ' + c('cyan', '-u, --uninstall') + '  Remove installation');
    console.log('    ' + c('cyan', '-h, --help') + '       Show this help');
    console.log('');
    return;
  }

  // Determine target
  let isGlobal;
  if (flags.global) {
    isGlobal = true;
  } else if (flags.local) {
    isGlobal = false;
  } else {
    // Interactive: ask user
    console.log('  Where would you like to install?');
    console.log('');
    console.log('    ' + c('cyan', '1') + ') Global — ~/.claude/ ' + c('dim', '(recommended, available in all projects)'));
    console.log('    ' + c('cyan', '2') + ') Local  — ./.claude/ ' + c('dim', '(current project only)'));
    console.log('');
    const answer = await ask('  Choice [1]: ');
    isGlobal = answer !== '2';
    console.log('');
  }

  const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  const targetRoot = isGlobal ? configDir : path.join(process.cwd(), '.claude');

  if (flags.uninstall) {
    await uninstall(targetRoot);
  } else {
    await install(targetRoot, isGlobal);
  }
}

main().catch(err => {
  console.error(c('red', '  Error: ') + err.message);
  process.exit(1);
});
