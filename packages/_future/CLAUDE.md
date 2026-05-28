# CLAUDE.md

Last updated: 2026-05-28

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
2. Add `'packages/foo'` is already covered by `'packages/*'` in `pnpm-workspace.yaml` — no change needed
3. Fix any typecheck / lint failures
4. Remove it from this table above

Do not import from `packages/_future/` in any active package.

## Promotion Checklist

Before a `_future/` package can be promoted to active, **all** of the following must be true:

- [ ] `pnpm lint` passes with no errors
- [ ] `pnpm typecheck` passes (strict mode, `exactOptionalPropertyTypes`)
- [ ] Test coverage is **>70%** (measured by Vitest coverage report)
- [ ] No hardcoded stubs remain (e.g., functions returning static values, `TODO` comments marking unimplemented logic)
- [ ] The package is wired into `turbo.json` pipeline (`build`, `test`, `typecheck` tasks defined)
- [ ] An entry is added to `.github/state/decisions.md` recording the promotion decision and date

A package that passes lint and typecheck but still has stubs is **not ready** — partial implementations break consumers silently.

## Conventions

- Test files are named `*.test.ts` and live in `src/` alongside the module they test.
- All source files must include the copyright header:
  ```ts
  /**
   * TopShelf Service LLC
   * PROPRIETARY AND CONFIDENTIAL
   * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
   */
  ```
- Do not import from `packages/_future/` in any active package — the workspace configuration prevents installation, but direct path imports would bypass that guard.
