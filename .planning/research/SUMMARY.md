# Research Summary

## Stack
Adopt a shared-core plus adapter architecture: keep existing Node/Python/SQLite workflow core, and add assistant-specific adapters for command/hook/runtime differences.

## Table Stakes
Maintain command continuity, persisted campaign memory, and manual quality gates across all supported assistants.

## Watch Out For
Main risks are provider-logic leakage into core scripts, parity drift, and state/resume incompatibilities. Mitigate with clear contracts and parity verification.

## Recommendation
Implement Codex adapter first as the reference migration path, then add Gemini/OpenCode/Mistral-compatible adapters in incremental phases while preserving current Claude behavior.
