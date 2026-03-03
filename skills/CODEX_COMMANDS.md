# Codex Command Surface

Codex-native commands in this project use strict `$gmd-*` format.

Rules:
- `$gmd-*` is the only native Codex surface.
- Unmapped native commands hard-fail (no alias fallback).
- Canonical aliases (`gmd:<action>`) are optional and not native Codex commands.

Validation:
- Run `node scripts/verify_codex_command_sweep.js` for full native command coverage.
