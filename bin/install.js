#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const crypto = require('crypto');

// Colors
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const dim = '\x1b[2m';
const reset = '\x1b[0m';

// Get version from package.json
const pkg = require('../package.json');

// Parse args
const args = process.argv.slice(2);
const hasGlobal = args.includes('--global') || args.includes('-g');
const hasLocal = args.includes('--local') || args.includes('-l');
const hasUninstall = args.includes('--uninstall') || args.includes('-u');
const hasHelp = args.includes('--help') || args.includes('-h');
const forceStatusline = args.includes('--force-statusline');

// Constants
const INSTALL_DIR_NAME = 'get-marketing-done';
const COMMAND_PREFIX = 'gmd';
const COMMANDS_DIR_NAME = path.join('commands', COMMAND_PREFIX);
const MANIFEST_NAME = 'gmd-file-manifest.json';
const PATCHES_DIR_NAME = 'gmd-local-patches';
const PKG_ROOT = path.join(__dirname, '..');

const banner = '\n' +
  cyan + '  ┌─────────────────────────────────────┐\n' +
  '  │' + reset + '\x1b[1m   get-marketing-done' + reset + dim + ' v' + pkg.version + reset + '          ' + cyan + '│\n' +
  '  │' + reset + '   GTM automation for Claude Code    ' + cyan + '│\n' +
  '  └─────────────────────────────────────┘' + reset + '\n';

console.log(banner);

// Show help if requested
if (hasHelp) {
  console.log(`  ${yellow}Usage:${reset} npx get-marketing-done [options]\n\n  ${yellow}Options:${reset}\n    ${cyan}-g, --global${reset}           Install to ~/.claude/ (recommended)\n    ${cyan}-l, --local${reset}            Install to ./.claude/\n    ${cyan}-u, --uninstall${reset}        Remove installation\n    ${cyan}--force-statusline${reset}     Replace existing statusline config\n    ${cyan}-h, --help${reset}             Show this help message\n\n  ${yellow}Examples:${reset}\n    ${dim}# Interactive install (prompts for location)${reset}\n    npx get-marketing-done\n\n    ${dim}# Install globally${reset}\n    npx get-marketing-done --global\n\n    ${dim}# Install to current project only${reset}\n    npx get-marketing-done --local\n\n    ${dim}# Uninstall${reset}\n    npx get-marketing-done --uninstall --global\n`);
  process.exit(0);
}

// ──────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────

/**
 * Build a hook command path using forward slashes for cross-platform compatibility.
 */
function buildHookCommand(configDir, hookName) {
  const hooksPath = configDir.replace(/\\/g, '/') + '/hooks/' + hookName;
  return `node "${hooksPath}"`;
}

/**
 * Read and parse settings.json, returning empty object if it doesn't exist
 */
function readSettings(settingsPath) {
  if (fs.existsSync(settingsPath)) {
    try {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

/**
 * Write settings.json with proper formatting
 */
function writeSettings(settingsPath, settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
}

/**
 * Compute SHA256 hash of file contents
 */
function fileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Recursively collect all files in dir with their hashes (relative paths)
 */
function generateManifest(dir, baseDir) {
  if (!baseDir) baseDir = dir;
  const manifest = {};
  if (!fs.existsSync(dir)) return manifest;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      // Skip data directory — never tracked for deletion
      if (entry.name === 'data') continue;
      Object.assign(manifest, generateManifest(fullPath, baseDir));
    } else {
      manifest[relPath] = fileHash(fullPath);
    }
  }
  return manifest;
}

/**
 * Write file manifest after installation for future modification detection
 */
function writeFileManifest(configDir) {
  const gmdDir = path.join(configDir, INSTALL_DIR_NAME);
  const commandsDir = path.join(configDir, COMMANDS_DIR_NAME);
  const manifest = { version: pkg.version, timestamp: new Date().toISOString(), files: {} };

  const gmdHashes = generateManifest(gmdDir);
  for (const [rel, hash] of Object.entries(gmdHashes)) {
    manifest.files[INSTALL_DIR_NAME + '/' + rel] = hash;
  }
  if (fs.existsSync(commandsDir)) {
    const cmdHashes = generateManifest(commandsDir);
    for (const [rel, hash] of Object.entries(cmdHashes)) {
      manifest.files[COMMANDS_DIR_NAME + '/' + rel] = hash;
    }
  }

  fs.writeFileSync(path.join(configDir, MANIFEST_NAME), JSON.stringify(manifest, null, 2));
  return manifest;
}

/**
 * Verify a directory was installed correctly
 */
function verifyInstalled(dirPath, description) {
  if (!fs.existsSync(dirPath)) {
    console.error(`  ${yellow}✗${reset} Failed to install ${description}: directory not created`);
    return false;
  }
  try {
    const entries = fs.readdirSync(dirPath);
    if (entries.length === 0) {
      console.error(`  ${yellow}✗${reset} Failed to install ${description}: directory is empty`);
      return false;
    }
  } catch (e) {
    console.error(`  ${yellow}✗${reset} Failed to install ${description}: ${e.message}`);
    return false;
  }
  return true;
}

/**
 * Verify a file exists
 */
function verifyFileInstalled(filePath, description) {
  if (!fs.existsSync(filePath)) {
    console.error(`  ${yellow}✗${reset} Failed to install ${description}: file not created`);
    return false;
  }
  return true;
}

// ──────────────────────────────────────────────────────
// Local Patch Persistence
// ──────────────────────────────────────────────────────

/**
 * Detect user-modified files by comparing against install manifest.
 * Backs up modified files to gmd-local-patches/ for manual reapply after update.
 */
function saveLocalPatches(configDir) {
  const manifestPath = path.join(configDir, MANIFEST_NAME);
  if (!fs.existsSync(manifestPath)) return [];

  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch { return []; }

  const patchesDir = path.join(configDir, PATCHES_DIR_NAME);
  const modified = [];

  for (const [relPath, originalHash] of Object.entries(manifest.files || {})) {
    const fullPath = path.join(configDir, relPath);
    if (!fs.existsSync(fullPath)) continue;
    const currentHash = fileHash(fullPath);
    if (currentHash !== originalHash) {
      const backupPath = path.join(patchesDir, relPath);
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.copyFileSync(fullPath, backupPath);
      modified.push(relPath);
    }
  }

  if (modified.length > 0) {
    const meta = {
      backed_up_at: new Date().toISOString(),
      from_version: manifest.version,
      files: modified
    };
    fs.writeFileSync(path.join(patchesDir, 'backup-meta.json'), JSON.stringify(meta, null, 2));
    console.log('  ' + yellow + 'i' + reset + '  Found ' + modified.length + ' locally modified file(s) — backed up to ' + PATCHES_DIR_NAME + '/');
    for (const f of modified) {
      console.log('     ' + dim + f + reset);
    }
  }
  return modified;
}

/**
 * After install, report backed-up patches for user to reapply.
 */
function reportLocalPatches(configDir) {
  const patchesDir = path.join(configDir, PATCHES_DIR_NAME);
  const metaPath = path.join(patchesDir, 'backup-meta.json');
  if (!fs.existsSync(metaPath)) return [];

  let meta;
  try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch { return []; }

  if (meta.files && meta.files.length > 0) {
    console.log('');
    console.log('  ' + yellow + 'Local patches detected' + reset + ' (from v' + meta.from_version + '):');
    for (const f of meta.files) {
      console.log('     ' + cyan + f + reset);
    }
    console.log('');
    console.log('  Your modifications are saved in ' + cyan + PATCHES_DIR_NAME + '/' + reset);
    console.log('  Manually compare and merge the files to restore your changes.');
    console.log('');
  }
  return meta.files || [];
}

// ──────────────────────────────────────────────────────
// Skill → Command Conversion
// ──────────────────────────────────────────────────────

/**
 * Discover all skills in the package's skills/ directory
 */
function discoverSkills() {
  const skillsDir = path.join(PKG_ROOT, 'skills');
  const skills = [];
  for (const name of fs.readdirSync(skillsDir)) {
    const skillFile = path.join(skillsDir, name, 'SKILL.md');
    if (fs.existsSync(skillFile)) {
      skills.push({ name, path: skillFile });
    }
  }
  return skills;
}

/**
 * All skill names for cross-reference rewriting
 */
const SKILL_NAMES = [
  'company-context-builder', 'list-building', 'market-problems-deep-research',
  'data-points-builder', 'table-enrichment', 'email-generation',
  'copy-feedback', 'run-instantly', 'campaign-progress', 'campaign-verify',
  'pause-work', 'resume-work', 'crm-connect', 'segmentation',
  'update', 'report-server',
];

/**
 * Convert a SKILL.md into a command .md with rewritten paths and references.
 */
function convertSkillToCommand(skillFile, pathPrefix) {
  let content = fs.readFileSync(skillFile, 'utf8');

  // 1. Rewrite frontmatter: name → gmd:name, remove user-invocable
  content = content.replace(
    /^(---\n)([\s\S]*?)(---)/m,
    (match, open, body, close) => {
      let fm = body;
      fm = fm.replace(/^(name:\s*)(.+)$/m, '$1' + COMMAND_PREFIX + ':$2');
      fm = fm.replace(/^user-invocable:\s*.*\n/m, '');
      return open + fm + close;
    }
  );

  // 2. Rewrite node script paths: `node scripts/` → `node "{prefix}/scripts/"`
  content = content.replace(
    /node\s+scripts\//g,
    'node "' + pathPrefix + '/scripts/'
  );
  // Close the quote after the script filename
  content = content.replace(
    /node\s+"([^"]+\.js)\s/g,
    'node "$1" '
  );
  content = content.replace(
    /node\s+"([^"]+\.js)$/gm,
    'node "$1"'
  );

  // 3. Rewrite python3 script paths
  content = content.replace(
    /python3\s+scripts\//g,
    'python3 "' + pathPrefix + '/scripts/'
  );
  content = content.replace(
    /python3\s+"([^"]+\.py)\s/g,
    'python3 "$1" '
  );
  content = content.replace(
    /python3\s+"([^"]+\.py)$/gm,
    'python3 "$1"'
  );

  // 4. Rewrite backtick-quoted data paths: `data/` → `{prefix}/data/`
  content = content.replace(
    /`data\//g,
    '`' + pathPrefix + '/data/'
  );

  // 5. Rewrite bare data/ references in prose
  content = content.replace(
    /(\s)data\/([\w{}._-]+)/g,
    '$1' + pathPrefix + '/data/$2'
  );

  // 6. Rewrite cross-skill references: /skill-name → /gmd:skill-name
  for (const skillName of SKILL_NAMES) {
    const re = new RegExp('/(?:marketing:)?' + skillName.replace(/-/g, '\\-') + '\\b', 'g');
    content = content.replace(re, '/' + COMMAND_PREFIX + ':' + skillName);
  }

  return content;
}

/**
 * Copy source directory to dest, applying path replacements in .md files.
 * Deletes dest first for clean install (prevents orphaned files).
 */
function copyWithPathReplacement(srcDir, destDir, pathPrefix) {
  // Clean install: remove existing destination to prevent orphaned files
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyWithPathReplacement(srcPath, destPath, pathPrefix);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ──────────────────────────────────────────────────────
// Orphan Cleanup (for version migrations)
// ──────────────────────────────────────────────────────

/**
 * Clean up orphaned files from previous versions
 */
function cleanupOrphanedFiles(configDir) {
  const orphanedFiles = [
    // Add entries here as files get renamed/removed in future versions
  ];

  for (const relPath of orphanedFiles) {
    const fullPath = path.join(configDir, relPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`  ${green}✓${reset} Removed orphaned ${relPath}`);
    }
  }
}

/**
 * Clean up orphaned hook registrations from settings.json
 */
function cleanupOrphanedHooks(settings) {
  const orphanedHookPatterns = [
    // Add entries here as hooks get renamed/removed in future versions
  ];

  if (orphanedHookPatterns.length === 0) return settings;

  let cleanedHooks = false;

  if (settings.hooks) {
    for (const eventType of Object.keys(settings.hooks)) {
      const hookEntries = settings.hooks[eventType];
      if (Array.isArray(hookEntries)) {
        const filtered = hookEntries.filter(entry => {
          if (entry.hooks && Array.isArray(entry.hooks)) {
            const hasOrphaned = entry.hooks.some(h =>
              h.command && orphanedHookPatterns.some(pattern => h.command.includes(pattern))
            );
            if (hasOrphaned) {
              cleanedHooks = true;
              return false;
            }
          }
          return true;
        });
        settings.hooks[eventType] = filtered;
      }
    }
  }

  if (cleanedHooks) {
    console.log(`  ${green}✓${reset} Removed orphaned hook registrations`);
  }

  return settings;
}

// ──────────────────────────────────────────────────────
// Install
// ──────────────────────────────────────────────────────

function install(isGlobal) {
  const targetDir = isGlobal
    ? (process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'))
    : path.join(process.cwd(), '.claude');

  const locationLabel = isGlobal
    ? targetDir.replace(os.homedir(), '~')
    : targetDir.replace(process.cwd(), '.');

  // Path prefix for file references in command markdown content
  const pathPrefix = isGlobal
    ? targetDir.replace(/\\/g, '/') + '/' + INSTALL_DIR_NAME
    : '.claude/' + INSTALL_DIR_NAME;

  console.log(`  Installing to ${cyan}${locationLabel}${reset}\n`);

  // Track installation failures
  const failures = [];

  // Save any locally modified files before they get wiped
  saveLocalPatches(targetDir);

  // Clean up orphaned files from previous versions
  cleanupOrphanedFiles(targetDir);

  // 1. Copy scripts, hooks, templates
  const gmdDir = path.join(targetDir, INSTALL_DIR_NAME);
  const copyEntries = [
    { type: 'dir', src: 'scripts', dest: 'scripts' },
    { type: 'dir', src: 'hooks', dest: 'hooks' },
    { type: 'dir', src: 'templates', dest: 'templates' },
    { type: 'file', src: 'config.example.json', dest: 'config.example.json' },
  ];

  for (const entry of copyEntries) {
    const srcPath = path.join(PKG_ROOT, entry.src);
    const destPath = path.join(gmdDir, entry.dest);
    if (!fs.existsSync(srcPath)) continue;
    if (entry.type === 'dir') {
      copyWithPathReplacement(srcPath, destPath, pathPrefix);
    } else {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
  if (verifyInstalled(path.join(gmdDir, 'scripts'), 'scripts')) {
    console.log(`  ${green}✓${reset} Installed scripts`);
  } else {
    failures.push('scripts');
  }
  if (verifyInstalled(path.join(gmdDir, 'hooks'), 'hooks')) {
    console.log(`  ${green}✓${reset} Installed hooks`);
  } else {
    failures.push('hooks');
  }

  // 2. Ensure data directory exists
  const dataDir = path.join(gmdDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  // 3. Create config.json from example if not present
  const configDest = path.join(gmdDir, 'config.json');
  if (!fs.existsSync(configDest)) {
    const exampleSrc = path.join(PKG_ROOT, 'config.example.json');
    if (fs.existsSync(exampleSrc)) {
      fs.copyFileSync(exampleSrc, configDest);
      console.log(`  ${green}✓${reset} Created config.json from example`);
    }
  } else {
    console.log(`  ${dim}─ config.json already exists, preserved${reset}`);
  }

  // 4. Convert skills to commands
  const commandsDir = path.join(targetDir, COMMANDS_DIR_NAME);
  fs.mkdirSync(commandsDir, { recursive: true });

  const skills = discoverSkills();
  // Clean existing command files first
  if (fs.existsSync(commandsDir)) {
    for (const file of fs.readdirSync(commandsDir)) {
      if (file.endsWith('.md')) {
        fs.unlinkSync(path.join(commandsDir, file));
      }
    }
  }
  for (const skill of skills) {
    const commandContent = convertSkillToCommand(skill.path, pathPrefix);
    const commandFile = path.join(commandsDir, skill.name + '.md');
    fs.writeFileSync(commandFile, commandContent);
  }
  if (verifyInstalled(commandsDir, 'commands/' + COMMAND_PREFIX)) {
    console.log(`  ${green}✓${reset} Installed ${skills.length} commands to commands/${COMMAND_PREFIX}/`);
  } else {
    failures.push('commands/' + COMMAND_PREFIX);
  }

  // 5. Write VERSION file
  const versionDest = path.join(gmdDir, 'VERSION');
  fs.writeFileSync(versionDest, pkg.version);
  if (verifyFileInstalled(versionDest, 'VERSION')) {
    console.log(`  ${green}✓${reset} Wrote VERSION (${pkg.version})`);
  } else {
    failures.push('VERSION');
  }

  if (failures.length > 0) {
    console.error(`\n  ${yellow}Installation incomplete!${reset} Failed: ${failures.join(', ')}`);
    process.exit(1);
  }

  // Write file manifest for future modification detection
  writeFileManifest(targetDir);
  console.log(`  ${green}✓${reset} Wrote file manifest (${MANIFEST_NAME})`);

  // Report any backed-up local patches
  reportLocalPatches(targetDir);

  // Configure hooks in settings.json
  const settingsPath = path.join(targetDir, 'settings.json');
  const settings = cleanupOrphanedHooks(readSettings(settingsPath));
  const gmdInstallDir = path.join(targetDir, INSTALL_DIR_NAME);

  const statuslineCommand = isGlobal
    ? buildHookCommand(gmdInstallDir, 'statusline.js')
    : 'node .claude/' + INSTALL_DIR_NAME + '/hooks/statusline.js';
  const contextMonitorCommand = isGlobal
    ? buildHookCommand(gmdInstallDir, 'context-monitor.js')
    : 'node .claude/' + INSTALL_DIR_NAME + '/hooks/context-monitor.js';
  const sessionStartCommand = isGlobal
    ? buildHookCommand(gmdInstallDir, 'session-start.js')
    : 'node .claude/' + INSTALL_DIR_NAME + '/hooks/session-start.js';

  // Configure hooks
  if (!settings.hooks) settings.hooks = {};

  // SessionStart: add session-start hook
  if (!settings.hooks.SessionStart) settings.hooks.SessionStart = [];
  const hasSessionStart = settings.hooks.SessionStart.some(entry =>
    entry.hooks && entry.hooks.some(h => h.command && h.command.includes(INSTALL_DIR_NAME) && h.command.includes('session-start'))
  );
  if (!hasSessionStart) {
    settings.hooks.SessionStart.push({
      hooks: [{ type: 'command', command: sessionStartCommand }]
    });
    console.log(`  ${green}✓${reset} Configured session-start hook`);
  }

  // PostToolUse: add context-monitor hook
  if (!settings.hooks.PostToolUse) settings.hooks.PostToolUse = [];
  const hasContextMonitor = settings.hooks.PostToolUse.some(entry =>
    entry.hooks && entry.hooks.some(h => h.command && h.command.includes(INSTALL_DIR_NAME) && h.command.includes('context-monitor'))
  );
  if (!hasContextMonitor) {
    settings.hooks.PostToolUse.push({
      hooks: [{ type: 'command', command: contextMonitorCommand }]
    });
    console.log(`  ${green}✓${reset} Configured context monitor hook`);
  }

  // Configure permissions
  if (!settings.permissions) settings.permissions = {};
  if (!Array.isArray(settings.permissions.allow)) settings.permissions.allow = [];

  const hookPrefix = gmdInstallDir.replace(/\\/g, '/');
  const gmdPerms = [
    'Bash(python3 "' + hookPrefix + '/scripts/*")',
    'Bash(node "' + hookPrefix + '/scripts/*")',
    'Bash(sqlite3 "' + hookPrefix + '/data/gtm.db" *)',
  ];
  for (const perm of gmdPerms) {
    if (!settings.permissions.allow.includes(perm)) {
      settings.permissions.allow.push(perm);
    }
  }

  return { settingsPath, settings, statuslineCommand };
}

// ──────────────────────────────────────────────────────
// Handle Statusline
// ──────────────────────────────────────────────────────

/**
 * Handle statusline configuration with optional prompt
 */
function handleStatusline(settings, isInteractive, callback) {
  const hasExisting = settings.statusLine != null;

  if (!hasExisting) {
    callback(true);
    return;
  }

  if (forceStatusline) {
    callback(true);
    return;
  }

  if (!isInteractive) {
    console.log(`  ${yellow}⚠${reset} Skipping statusline (already configured)`);
    console.log(`    Use ${cyan}--force-statusline${reset} to replace\n`);
    callback(false);
    return;
  }

  const existingCmd = settings.statusLine.command || settings.statusLine.url || '(custom)';

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(`
  ${yellow}⚠${reset} Existing statusline detected\n
  Your current statusline:
    ${dim}command: ${existingCmd}${reset}

  GMD includes a statusline showing:
    • Campaign pipeline progress
    • Current step and company counts

  ${cyan}1${reset}) Keep existing
  ${cyan}2${reset}) Replace with GMD statusline
`);

  rl.question(`  Choice ${dim}[1]${reset}: `, (answer) => {
    rl.close();
    const choice = answer.trim() || '1';
    callback(choice === '2');
  });
}

/**
 * Apply statusline config, then print completion message
 */
function finishInstall(settingsPath, settings, statuslineCommand, shouldInstallStatusline) {
  if (shouldInstallStatusline) {
    settings.statusLine = {
      type: 'command',
      command: statuslineCommand
    };
    console.log(`  ${green}✓${reset} Configured statusline`);
  }

  writeSettings(settingsPath, settings);

  const commandNames = discoverSkills().map(s => '/' + COMMAND_PREFIX + ':' + s.name).sort();
  const configPath = '~/.claude/' + INSTALL_DIR_NAME + '/config.json';

  console.log(`
  ${green}Done!${reset} Open Claude Code and run ${cyan}/${COMMAND_PREFIX}:company-context-builder init${reset}.

  Configure API keys (optional):
    ${dim}Edit ${configPath}${reset}
    ${dim}Set: extruct_api_key, instantly_api_key, perplexity_api_key${reset}

  Available commands:
${commandNames.map(n => '    ' + dim + n + reset).join('\n')}
`);
}

// ──────────────────────────────────────────────────────
// Uninstall
// ──────────────────────────────────────────────────────

function uninstall(isGlobal) {
  const targetDir = isGlobal
    ? (process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'))
    : path.join(process.cwd(), '.claude');

  const locationLabel = isGlobal
    ? targetDir.replace(os.homedir(), '~')
    : targetDir.replace(process.cwd(), '.');

  console.log(`  Uninstalling from ${cyan}${locationLabel}${reset}\n`);

  if (!fs.existsSync(targetDir)) {
    console.log(`  ${yellow}⚠${reset} Directory does not exist: ${locationLabel}`);
    console.log(`  Nothing to uninstall.\n`);
    return;
  }

  let removedCount = 0;

  // 1. Remove command files
  const commandsDir = path.join(targetDir, COMMANDS_DIR_NAME);
  if (fs.existsSync(commandsDir)) {
    fs.rmSync(commandsDir, { recursive: true });
    removedCount++;
    console.log(`  ${green}✓${reset} Removed commands/${COMMAND_PREFIX}/`);
  }

  // 2. Remove install directory (except data/)
  const gmdDir = path.join(targetDir, INSTALL_DIR_NAME);
  if (fs.existsSync(gmdDir)) {
    const dataDir = path.join(gmdDir, 'data');
    let hasData = false;

    // Check if data dir has content
    if (fs.existsSync(dataDir)) {
      const dataFiles = fs.readdirSync(dataDir);
      if (dataFiles.length > 0) {
        hasData = true;
      }
    }

    // Remove everything except data/
    for (const entry of fs.readdirSync(gmdDir, { withFileTypes: true })) {
      const fullPath = path.join(gmdDir, entry.name);
      if (entry.name === 'data') continue;
      if (entry.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true });
      } else {
        fs.unlinkSync(fullPath);
      }
    }
    removedCount++;
    console.log(`  ${green}✓${reset} Removed ${INSTALL_DIR_NAME}/`);

    if (hasData) {
      console.log(`  ${yellow}⚠${reset} Preserved data/ directory — your campaign data is safe`);
      console.log(`    ${dim}To remove: rm -rf "${dataDir}"${reset}`);
    } else {
      // Remove empty data dir and parent
      try { fs.rmdirSync(dataDir); } catch {}
      try { fs.rmdirSync(gmdDir); } catch {}
    }
  }

  // 3. Remove manifest
  const manifestPath = path.join(targetDir, MANIFEST_NAME);
  if (fs.existsSync(manifestPath)) {
    fs.unlinkSync(manifestPath);
  }

  // 4. Remove local patches dir
  const patchesDir = path.join(targetDir, PATCHES_DIR_NAME);
  if (fs.existsSync(patchesDir)) {
    fs.rmSync(patchesDir, { recursive: true });
  }

  // 5. Clean up settings.json
  const settingsPath = path.join(targetDir, 'settings.json');
  if (fs.existsSync(settingsPath)) {
    let settings = readSettings(settingsPath);
    let settingsModified = false;

    // Remove statusline if it's ours
    if (settings.statusLine && settings.statusLine.command &&
        settings.statusLine.command.includes(INSTALL_DIR_NAME)) {
      delete settings.statusLine;
      settingsModified = true;
      console.log(`  ${green}✓${reset} Removed statusline from settings`);
    }

    // Remove hooks from SessionStart
    if (settings.hooks && settings.hooks.SessionStart) {
      const before = settings.hooks.SessionStart.length;
      settings.hooks.SessionStart = settings.hooks.SessionStart.filter(entry => {
        if (entry.hooks && Array.isArray(entry.hooks)) {
          const hasOurs = entry.hooks.some(h =>
            h.command && h.command.includes(INSTALL_DIR_NAME)
          );
          return !hasOurs;
        }
        return true;
      });
      if (settings.hooks.SessionStart.length < before) {
        settingsModified = true;
        console.log(`  ${green}✓${reset} Removed session-start hook from settings`);
      }
      if (settings.hooks.SessionStart.length === 0) {
        delete settings.hooks.SessionStart;
      }
    }

    // Remove hooks from PostToolUse
    if (settings.hooks && settings.hooks.PostToolUse) {
      const before = settings.hooks.PostToolUse.length;
      settings.hooks.PostToolUse = settings.hooks.PostToolUse.filter(entry => {
        if (entry.hooks && Array.isArray(entry.hooks)) {
          const hasOurs = entry.hooks.some(h =>
            h.command && h.command.includes(INSTALL_DIR_NAME)
          );
          return !hasOurs;
        }
        return true;
      });
      if (settings.hooks.PostToolUse.length < before) {
        settingsModified = true;
        console.log(`  ${green}✓${reset} Removed context monitor hook from settings`);
      }
      if (settings.hooks.PostToolUse.length === 0) {
        delete settings.hooks.PostToolUse;
      }
    }

    // Remove permissions
    if (settings.permissions && Array.isArray(settings.permissions.allow)) {
      const before = settings.permissions.allow.length;
      settings.permissions.allow = settings.permissions.allow.filter(
        p => !p.includes(INSTALL_DIR_NAME)
      );
      if (settings.permissions.allow.length < before) {
        settingsModified = true;
        console.log(`  ${green}✓${reset} Removed permissions from settings`);
      }
    }

    // Clean up empty structures
    if (settings.hooks && Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }

    if (settingsModified) {
      writeSettings(settingsPath, settings);
      removedCount++;
    }
  }

  if (removedCount === 0) {
    console.log(`  ${yellow}⚠${reset} No GMD files found to remove.`);
  }

  console.log(`
  ${green}Done!${reset} GMD has been uninstalled.
  Your other files and settings have been preserved.
`);
}

// ──────────────────────────────────────────────────────
// Main (callback-based interactive flow)
// ──────────────────────────────────────────────────────

if (hasGlobal && hasLocal) {
  console.error(`  ${yellow}Cannot specify both --global and --local${reset}`);
  process.exit(1);
} else if (hasUninstall) {
  if (!hasGlobal && !hasLocal) {
    console.error(`  ${yellow}--uninstall requires --global or --local${reset}`);
    process.exit(1);
  }
  uninstall(hasGlobal);
} else if (hasGlobal || hasLocal) {
  const isGlobal = hasGlobal;
  const result = install(isGlobal);
  handleStatusline(result.settings, false, (shouldInstallStatusline) => {
    finishInstall(result.settingsPath, result.settings, result.statuslineCommand, shouldInstallStatusline);
  });
} else {
  // Interactive mode
  if (!process.stdin.isTTY) {
    console.log(`  ${yellow}Non-interactive terminal detected, defaulting to global install${reset}\n`);
    const result = install(true);
    handleStatusline(result.settings, false, (shouldInstallStatusline) => {
      finishInstall(result.settingsPath, result.settings, result.statuslineCommand, shouldInstallStatusline);
    });
  } else {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    let answered = false;

    rl.on('close', () => {
      if (!answered) {
        answered = true;
        console.log(`\n  ${yellow}Installation cancelled${reset}\n`);
        process.exit(0);
      }
    });

    console.log(`  ${yellow}Where would you like to install?${reset}\n\n  ${cyan}1${reset}) Global ${dim}(~/.claude)${reset} - available in all projects\n  ${cyan}2${reset}) Local  ${dim}(./.claude)${reset} - this project only\n`);

    rl.question(`  Choice ${dim}[1]${reset}: `, (answer) => {
      answered = true;
      rl.close();
      const isGlobal = (answer.trim() || '1') !== '2';
      const result = install(isGlobal);
      handleStatusline(result.settings, true, (shouldInstallStatusline) => {
        finishInstall(result.settingsPath, result.settings, result.statuslineCommand, shouldInstallStatusline);
      });
    });
  }
}
