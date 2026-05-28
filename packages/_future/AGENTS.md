# AGENTS.md

This file provides guidance to AI coding agents (OpenAI Codex and compatible) when working with code in this directory.

## `packages/_future/` — Gated Phase 2 Packages

These packages are **fully gated off** from the active workspace. They are not listed in `pnpm-workspace.yaml` and cannot be installed, built, or imported by active packages.

| Package         | Status  | Blocker                                                                            |
| --------------- | ------- | ---------------------------------------------------------------------------------- |
| `nlp`           | Phase 2 | Scoring model not implemented; lint OOMs on current hardware                       |
| `policy-engine` | Phase 2 | `PolicyEvaluator.evaluate()` returns hardcoded `hold`; signal evaluation not wired |
| `client-pwa`    | Phase 2 | Offline/probe modules stubbed; duplicates `apps/web` functionality                 |

**`deterministic-formatter`** was previously here but was promoted to `packages/deterministic-formatter/` because `packages/content-authoring` and `packages/tests` depend on it.

## Activating a Package

To promote a package from `_future/` to active:

1. Move the directory: `mv packages/_future/foo packages/foo`
2. No workspace edit needed; `packages/foo` is already covered by `packages/*` in `pnpm-workspace.yaml`
3. Fix any typecheck / lint failures
4. Remove it from this table above

Do not import from `packages/_future/` in any active package.
