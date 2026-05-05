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

**TypeScript:** strict mode + `exactOptionalPropertyTypes` (see `tsconfig.base.json`). ES2022 target, ESNext modules. Optional properties must be explicitly `undefined`-typed — don't add optional fields that could be `| undefined` without acknowledging it. Use the spread pattern for optional returns:

```ts
return { required, ...(opt ? { opt } : {}) };
```

**Build tooling:** `tsup` for library packages, Next.js for web app, Turbo for task orchestration. Turbo caches `build/lint/test` outputs; `globalEnv` includes `NODE_ENV`, `CI`, `TOPSHELF_ENV`.

**Tests:** Vitest with globals. Tests colocated as `src/**/*.test.ts`. Mock `@topshelf/database` at module level in route tests — use the pattern established in existing `*.test.ts` files.

**`pnpm dev` concurrency:** Turbo's default concurrency (CPU-based) is used. Do not add a global `"concurrency"` to `turbo.json` — the machine has 6 GB RAM and no swap; 20 parallel Node processes will OOM-kill.

**Package management:**

```bash
pnpm install <pkg> -w                      # Add to workspace root
pnpm --filter @topshelf/<name> add <pkg>   # Add to specific package
```

Workspace deps use `"@topshelf/engine": "workspace:*"` in `package.json`.

**Content signing:** `CONTENT_SIGNING_MODE` controls pack signing — `off` for pilot/dev, `hmac` for HMAC-SHA256 (requires `CONTENT_SIGNING_KEY`). Generate key with `openssl rand -hex 32`.

## Additional Packages

- **`packages/auth/`** — auth utilities (JWT helpers, session logic) consumed by `api-server`
- **`packages/config/`** — centralized env var parsing via `packages/config/src/index.ts`; add new env var references here
- **`packages/ui/`** — shared React component library for `apps/web`
- **`packages/billing/`** — Stripe integration; subscription + invoice management
- **`packages/observability/`** — metrics, tracing, structured logging primitives
- **`packages/agent/`** — agent coordination utilities
- **`packages/testkit/`** — shared test helpers and fixtures

## Local Infrastructure

```bash
# Start PostgreSQL + Redis (required before pnpm dev)
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

Web app requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`). API server reads DB config from `packages/config/src/index.ts`.

## Agent Blackboard Protocol

When working as part of a multi-agent workflow, read `.github/state/board.md` before starting and append a timestamped update when done. Check `.github/state/blockers.md` for dependencies and `.github/state/decisions.md` for architectural decisions you must follow.

**Integration hotspot tags** — when a task carries one of these tags, read the listed files before making changes:

| Tag         | Must-read files                                              |
| ----------- | ------------------------------------------------------------ |
| `schema`    | `packages/database/src/schema/index.ts`                      |
| `types`     | `packages/engine/src/types.ts`, `packages/shared/src/types/` |
| `api`       | `packages/api-server/src/routes/learner.ts`                  |
| `contracts` | The API route AND `apps/web/src/lib/api/`                    |
| `config`    | `packages/config/src/index.ts`, `.env.example`               |
| `infra`     | `infrastructure/docker/docker-compose.yml`                   |
| `policy`    | `governance/policies/promotion_policy_config.json`           |
| `pedagogy`  | `packages/engine/src/pedagogy-engine.ts`                     |

## UI / Brand Rules

Before any UI work in `apps/web/src/`, read:

- `governance/standards/brand/tokens/design-tokens.md` — color palette (`ts-*`), typography, spacing
- `governance/standards/brand/voice/voice-and-tone.md` — "Direct, calm, competent. No hype, no jargon."
- `governance/standards/brand/doctrine/brand-doctrine.md` — dark-first, Chromebook-first, boulder logo

Quick rules: use semantic tokens (`primary`, `success`, `destructive`) not raw hex; `font-heading` = Montserrat 600–800, `font-sans` = Inter; icons via `lucide-react` only; touch targets ≥ 44×44 px; buttons verb-first max 3 words; company name is "Top Shelf Service LLC™", product name is "Top Shelf Teaching".
