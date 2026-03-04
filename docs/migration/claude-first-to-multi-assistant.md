# Migration Guide: Claude-First to Multi-Assistant

This guide helps existing Claude-first installations adopt Codex and optional alias mode incrementally.

## Migration Policy

- Default path is safe and non-breaking: existing Claude commands (`/gmd:*`) remain unchanged.
- Codex support is opt-in through its native `$gmd-*` command surface.
- Alias mode (`gmd:<action>`) is advanced and off by default.
- Scaffold providers (Gemini/OpenCode/Mistral) are documented as scaffold-only in this milestone.

## Path A: Stay As-Is (Claude Only)

Use this if you do not need multi-assistant operation yet.

Checklist:
1. Keep using Claude-native commands (`/gmd:*`).
2. Run quick health checks after updates:

```bash
node scripts/verify_claude_parity.js
node scripts/verify_adapter_parity.js
```

3. Keep manual verification gate active before send actions.

## Path B: Enable Codex Usage (Recommended Incremental Step)

Checklist:
1. Keep existing Claude workflows unchanged.
2. Start using Codex-native commands for equivalent actions:
   - `/gmd:campaign-progress` -> `$gmd-campaign-progress`
   - `/gmd:resume-work` -> `$gmd-resume-work`
3. Validate Codex command routing:

```bash
node scripts/verify_codex_command_sweep.js
node scripts/verify_adapter_parity.js
```

4. Validate cross-adapter continuity (pause in one, resume in the other):

```bash
node scripts/verify_cross_adapter_continuity.js
```

5. Keep quality gate consistency checks in release workflow:

```bash
node scripts/verify_quality_gate_consistency.js
```

## Path C: Enable Alias Mode (Advanced, Optional)

Use only when you need canonical command syntax for cross-assistant workflows.

Checklist:
1. Enable alias mode explicitly in config.
2. Continue using native commands as primary commands.
3. Treat alias commands as compatibility convenience, not native surface.
4. Validate no routing regressions:

```bash
node scripts/verify_adapter_parity.js
```

## Scaffold Provider Notes

Gemini/OpenCode/Mistral are scaffold providers in this milestone:
- They are contract-registered.
- They are config-gated (inactive unless enabled).
- They emit structured capability-gap diagnostics when unsupported paths are used.

Scaffold checks:

```bash
node scripts/verify_scaffold_conformance.js
node scripts/verify_adapter_parity.js --include-scaffolds
```

Do not treat scaffold validation as proof of full parity support.

## Rollback

If optional changes cause unexpected behavior:

1. Disable optional modes in config:
   - turn off alias mode
   - turn off any scaffold provider activation flags
2. Continue using Claude-native `/gmd:*` commands.
3. Re-run baseline checks:

```bash
node scripts/verify_claude_parity.js
node scripts/verify_quality_gate_consistency.js
```

4. If needed, compare against prior behavior with:

```bash
node scripts/verify_adapter_parity.js
```

Rollback is documentation/config-level for this phase; no data migration is required.
