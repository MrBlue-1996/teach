# CLAUDE.md

Last updated: 2026-05-28

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> ⚠️ **DO NOT USE FOR PRODUCTION WORK.** This is an experimental prototype. All production session lifecycle work belongs in `packages/api-server`. See the Status section below.

## Implementation: `mcp-server`

Model Context Protocol server prototype. **Not production-ready.** Standalone Express.js server that exposes the teaching engine over HTTP for manual testing and integration experiments.

```bash
pnpm start    # http://localhost:3000 — /mvp for the click-through UI
pnpm test
pnpm build    # tsc → dist/
```

## What It Does

- Stores `TeachingContext` in an in-memory `Map<sessionId, TeachingContext>` — **state is lost on restart**
- Wraps `@topshelf/engine` (PedagogyEngine, TriggerDetector, ConstraintEngine)
- `/mvp` — browser UI for manually exercising the teaching decision loop without a client app
- Not wired into `api-server`; operates independently on its own port

## Status

Phase 2. Not included in `pnpm dev` or `pnpm test` runs from the root. The active session lifecycle is fully implemented in `packages/api-server` — use that for production work. This prototype is useful only for isolated engine experimentation.

Integration blockers before this can be promoted:

- Needs `@topshelf/policy-engine` and `@topshelf/nlp` (both gated in `packages/_future/`)
- Needs persistence layer (currently in-memory only)
- Needs to be wired into `api-server` route delegation or replace it

## Local Test Workflow

Use this to manually exercise the engine decision loop without a running client:

```bash
cd implementations/mcp-server
pnpm install
pnpm start
# → open http://localhost:3000/mvp in a browser
```

From the `/mvp` UI you can:

1. Create a session (generates a `sessionId`)
2. Submit learner context (errors, elapsed time, help requests)
3. Observe the trigger detection output and teaching response
4. Advance the session state and observe mode elevation

For automated testing, `pnpm test` runs unit tests against the route handlers using mocked engine responses — no live server needed.

## Conventions

- This package is **not** in the Turbo pipeline — run commands with `pnpm` directly from this directory, not from the workspace root.
- Test files are named `*.test.ts` and live in `src/` alongside the module they test.
- All source files must include the copyright header:
  ```ts
  /**
   * TopShelf Service LLC
   * PROPRIETARY AND CONFIDENTIAL
   * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
   */
  ```
- Do not add new features here without first checking whether the feature belongs in `packages/api-server` instead.
