---
name: update
description: Update GMD to latest version with changelog display
user-invocable: true
allowed-tools: Bash, AskUserQuestion, Read
---

# Update GMD

Check for updates, show what changed, and install the latest version.

## Process

### Step 1: Detect installed version and install type

```bash
# Check local first (takes priority)
if [ -f "./.claude/get-marketing-done/VERSION" ]; then
  cat "./.claude/get-marketing-done/VERSION"
  echo "LOCAL"
elif [ -f ~/.claude/get-marketing-done/VERSION ]; then
  cat ~/.claude/get-marketing-done/VERSION
  echo "GLOBAL"
else
  echo "UNKNOWN"
fi
```

Parse output:
- If last line is "LOCAL": installed version is the first line, use `--local` flag for update
- If last line is "GLOBAL": installed version is the first line, use `--global` flag for update
- If "UNKNOWN": treat as version 0.0.0, default to `--global`

### Step 2: Check npm for latest version

```bash
npm view get-marketing-done version 2>/dev/null
```

If npm check fails, tell the user:

```
Couldn't check for updates (offline or npm unavailable).

To update manually: `npx get-marketing-done --global`
```

Exit.

### Step 3: Compare versions

**If installed == latest:**
```
## GMD Update

**Installed:** X.Y.Z
**Latest:** X.Y.Z

You're already on the latest version.
```
Exit.

**If installed > latest:**
```
## GMD Update

**Installed:** X.Y.Z
**Latest:** A.B.C

You're ahead of the latest release (development version?).
```
Exit.

### Step 4: Fetch changelog and confirm

Fetch the changelog from the GitHub raw URL:

```bash
curl -sL https://raw.githubusercontent.com/jqueguiner/get-marketing-done/main/CHANGELOG.md 2>/dev/null
```

Extract entries between the installed and latest versions. If the fetch fails or there is no CHANGELOG.md, skip the changelog display and just show the version bump.

Display the update preview:

```
## GMD Update Available

**Installed:** {installed}
**Latest:** {latest}

### What's New
---

{changelog entries between installed and latest}

---

**Note:** The installer performs a clean install of GMD folders:
- `commands/gmd/` will be wiped and replaced
- `get-marketing-done/` will be wiped and replaced

(Paths are relative to your install location: `~/.claude/` for global, `./.claude/` for local)

Your data is preserved:
- `data/` directory (campaign DB, context files)
- `config.json` (your API keys and settings)
- Custom commands not in `commands/gmd/`
- Your CLAUDE.md files

If you've modified any GMD files directly, they'll be automatically backed up to `gmd-local-patches/` and can be merged back manually after the update.
```

Use AskUserQuestion to confirm:
- Question: "Proceed with update?"
- Options:
  - "Yes, update now" (description: "Download and install the latest version")
  - "No, cancel" (description: "Stay on current version")

If user cancels, exit.

### Step 5: Run the update

Run the installer with the appropriate flag:

**If LOCAL install:**
```bash
npx -y get-marketing-done@latest --local
```

**If GLOBAL install (or unknown):**
```bash
npx -y get-marketing-done@latest --global
```

Capture output. If install fails, show the error and exit.

Clear the update cache so statusline indicator disappears:

**If LOCAL install:**
```bash
rm -f ./.claude/cache/gmd-update-check.json
```

**If GLOBAL install:**
```bash
rm -f ~/.claude/cache/gmd-update-check.json
```

### Step 6: Check for local patches

Check for `gmd-local-patches/backup-meta.json` in the config directory.

**If patches found:**
```
Local patches were backed up before the update.
Review the files in `gmd-local-patches/` and manually merge your modifications into the new version.
```

### Step 7: Show completion

```
## GMD Updated: v{old} -> v{new}

Restart Claude Code to pick up the new commands.
```

## Rules

- Always show the changelog BEFORE running the update
- Always get explicit user confirmation before updating
- Never skip the clean-install warning
- If any step fails, show the error clearly and exit
