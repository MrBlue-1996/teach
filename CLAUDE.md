# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

TopShelf Teaching is a pnpm monorepo implementing a device-aware AI teaching kernel with a "Solve First, Teach Second" pedagogy. The system delivers adaptive teaching interventions based on detected triggers and device capability constraints (Chromebook-first design).

**Workspace roots** (`pnpm-workspace.yaml`): `packages/*`, `apps/*`, `implementations/*`, `content-packs`, `policy`, `docs`, `pilot`.

**`packages/_future/`** is fully gated off — removed from the workspace. Packages there (`nlp`, `policy-engine`, `client-pwa`) are Phase 2 and must not be imported by active packages. `deterministic-formatter` was promoted to `packages/` as it has active dependents.

## Commands

```bash
# Install
pnpm install

# Build
pnpm build              # All packages via Turbo (uses scripts/build.mjs)
pnpm build:packages     # Only packages in ./packages/*

# Dev
pnpm dev                # All packages (excludes @topshelf/tests)

# Test
pnpm test               # All packages
pnpm test:ci            # With coverage
pnpm test:parity        # Formatter parity tests only
pnpm test:e2e           # Playwright end-to-end

# Single package
pnpm --filter @topshelf/engine test
pnpm --filter @topshelf/engine test -- src/engine.test.ts

# Lint / Format / Typecheck
pnpm lint               # NODE_OPTIONS=--max-old-space-size=4096 enforced
pnpm lint:fix
pnpm typecheck
pnpm format:check
pnpm format

# Full CI gate (format:check + lint + typecheck + test)
pnpm validate

# Database
pnpm db:migrate
pnpm db:generate
pnpm db:studio

# MCP Server prototype
pnpm --dir implementations/mcp-server start   # http://localhost:3000/mvp
```

## Architecture

### Teaching Engine (`packages/engine/`)

The core decision system. Three plain objects (not classes) work together:

- **`TriggerDetector`** — pure functions; `detectTriggers(context)` returns `TriggerType[]`. Fires `ERROR_REPEATED` at 3+ errors, `STUCK_DETECTED` when >5 min and <0.1 problems/min, `TIME_THRESHOLD` at 5+ min, plus `HELP_REQUESTED` and `CONCEPT_GAP`. `shouldTeach(mode, triggers)` gates on mode. `suggestModeElevation()` escalates mode automatically.
- **`ConstraintEngine`** — maps device profiles to budgets (`maxMemoryMB`, `maxResponseSize`, `offline`, framework allowances). `filterSuggestion()` truncates oversized content with the sentinel `"[Response truncated for device constraints]"`. `inferProfile(deviceInfo)` detects profile from UA/hardware hints.
- **`PedagogyEngine`** — orchestrates: trigger detection → mode gate → device constraint filter → formatted response. Entry point: `processTeachingRequest(context, content)` → `TeachingResponse`.

**`TeachingContext`** shape:

```ts
{ mode: TeachingMode; deviceProfile: DeviceProfile; constraints: DeviceConstraints;
  triggers: TriggerType[]; sessionStartTime: Date; problemsSolved: number; errorsEncountered: number }
```

**Teaching mode table:**

| Level | Constant        | Triggers that fire                    | Response prefix |
| ----- | --------------- | ------------------------------------- | --------------- |
| 0     | `L0_SILENT`     | Never                                 | _(none)_        |
| 1     | `L1_MINIMAL`    | HELP_REQUESTED only                   | `💡 Hint:`      |
| 2     | `L2_CONTEXTUAL` | ERROR_REPEATED, STUCK, HELP (default) | `📚 Guidance:`  |
| 3     | `L3_ACTIVE`     | Any trigger                           | `🎓 Teaching:`  |
| 4     | `L4_TUTORIAL`   | Always                                | `📖 Tutorial:`  |

**Kitchen training** (`packages/engine/src/kitchen/`) — separate pedagogical domain: `ChallengeMachine` state machine + `ShadowValidator` hidden rule checker. Exports 50+ types (ChallengePhase, MasteryProfile, TicketItem, etc.).

**Device profiles:** `CHROMEBOOK_LOW`, `CHROMEBOOK_STANDARD`, `DESKTOP_LOW`, `DESKTOP_STANDARD`, `DESKTOP_HIGH`. Chromebook profiles block heavy frameworks and cap response size.

### Session Lifecycle (API Server)

1. `POST /learner/session/start` — creates or retrieves `LearnerState`, starts `LearningSession` with inferred `deviceProfile` and `TeachingMode.L2_CONTEXTUAL`
2. `POST /learner/session/:id/event` — records `LearnerProgressEvent`, updates session counters, runs `TriggerDetector` and persists elevated `teachingMode` if triggered
3. `POST /learner/session/:id/teach` — reconstructs `TeachingContext` from DB, runs `PedagogyEngine`, returns `TeachingResponse` + trigger state
4. `POST /learner/session/:id/end` — marks session `completed`, sets `endedAt`
5. `GET /learner/stats` — aggregates `totalTimeMinutes`, `totalBlocksCompleted`, `averageMastery`, `packsStarted`, `packsActive` (30-day window), `totalSessions` across all of a user's data

### API Server (`packages/api-server/`)

Hono framework. Global middleware stack in order: `requestId → secureHeaders → compress → timing → cors → logger(dev) → rateLimiter → errorHandler`. Auth middleware (Bearer JWT) added per-router; extracts `userId` and `userRole` into Hono context vars. Routes: `/auth`, `/learner`, `/content`, `/session`, `/policy`, `/badge`, `/admin`. Public: `/health`, `/ready`.

### Database (`packages/database/`)

Drizzle ORM + PostgreSQL. Key table clusters:

- **Auth:** `users`, `organizations`, `authSessions`, `oauthAccounts`
- **Content:** `contentPacks` (slug+version unique, signed), `contentBlocks` (blockId human-readable, targetMode L1–L5)
- **Learning:** `learnerStates` (userId+packId unique, skillEstimates/retentionHistory JSONB), `learnerProgressEvents`, `learningSessions` (teachingMode int 0–4, triggersFired JSONB)
- **Policy:** `policyEvaluations` (audit chain via chainHash/previousHash/signature)
- **Billing:** `subscriptions`, `invoices`, `seatAssignments`
- **Audit:** `auditLogs`, `dataExportRequests` (GDPR)

### Inter-Package Contracts

| Consumer            | Provider                  | Contract                                                                         |
| ------------------- | ------------------------- | -------------------------------------------------------------------------------- |
| `api-server`        | `engine`                  | `TeachingContext → TeachingResponse` via `PedagogyEngine.processTeachingRequest` |
| `api-server`        | `database`                | All DB access through `getDatabase()` + Drizzle query builder                    |
| `api-server`        | `shared`                  | Zod schemas for all request validation                                           |
| `content-authoring` | `deterministic-formatter` | `CanonicalFormatter` + `ParityValidator` in validation pipeline                  |
| `web`               | `api-server`              | Bearer JWT in `Authorization` header; token from `useAuthStore`                  |
| `web`               | `shared`                  | Zod schemas reused for client-side form validation                               |

### Supporting Packages

- **`packages/shared/`** — single source of truth for TS types, Zod schemas, constants, and utility functions. All cross-package types live here.
- **`packages/deterministic-formatter/`** — canonical content hashing + offline/online parity validation. Used in content pack publishing pipeline.
- **`packages/content-authoring/`** — three-stage pipeline: `ContentPackValidator → ContentPackSigner → AuthoringPipeline` (state machine: draft → validation → parity_testing → human_review → signing → published).

## Key Conventions

**Copyright header required on every source file:**

```typescript
/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */
```

**TypeScript:** strict mode + `exactOptionalPropertyTypes` (see `tsconfig.base.json`). ES2022 target, ESNext modules. Optional properties must be explicitly `undefined`-typed — don't add optional fields that could be `| undefined` without acknowledging it.

**Build tooling:** `tsup` for library packages, Next.js for web app, Turbo for task orchestration. Turbo caches `build/lint/test` outputs; `globalEnv` includes `NODE_ENV`, `CI`, `TOPSHELF_ENV`.

**Tests:** Vitest with globals. Tests colocated as `src/**/*.test.ts`. Mock `@topshelf/database` at module level in route tests — use the pattern established in existing `*.test.ts` files.

**`pnpm dev` concurrency:** Turbo's default concurrency (CPU-based) is used. Do not add a global `"concurrency"` to `turbo.json` — the machine has 6 GB RAM and no swap; 20 parallel Node processes will OOM-kill.

See `.github/instructions/workspace.instructions.md` for full monorepo conventions, and `.github/instructions/agent-comms.instructions.md` for agent communication standards.
