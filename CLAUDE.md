# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

TopShelf Teaching is a pnpm monorepo implementing a device-aware AI teaching kernel with a "Solve First, Teach Second" pedagogy. The system delivers adaptive teaching interventions based on detected triggers and device capability constraints (Chromebook-first design).

**Structure:**
- `apps/` — User-facing products (Next.js web app)
- `packages/` — Reusable platform building blocks (engine, api-server, shared, database, auth)
- `implementations/` — Focused prototypes
- `governance/` — Policies, standards, schemas
- `content/` — Teaching materials and definitions

## Commands

```bash
# Install
pnpm install
pnpm install <pkg> -w                        # Add to root
pnpm --filter @topshelf/<name> add <pkg>     # Add to specific package

# Build
pnpm build              # All packages via Turbo
pnpm build:packages     # Only packages in ./packages/*

# Dev
pnpm dev                # All packages in parallel dev mode

# Test
pnpm test               # All packages
pnpm test:ci            # With coverage (for CI)
pnpm test:parity        # Parity tests
pnpm test:e2e           # End-to-end tests

# Single package test
pnpm --filter @topshelf/engine test

# Single test file (within a package)
pnpm --filter @topshelf/engine test -- src/engine.test.ts

# Lint / Format / Typecheck
pnpm lint               # Lint all (NODE_OPTIONS memory limit: 4096)
pnpm lint:fix
pnpm typecheck
pnpm format
pnpm format:check

# Full CI validation (format:check + lint + typecheck + test)
pnpm validate

# Database
pnpm db:migrate
pnpm db:generate
pnpm db:studio
```

## Architecture

### Teaching Engine (`packages/engine/`)

The core of the system. Three collaborating classes:

- **`PedagogyEngine`** — Orchestrates the full teaching decision: detect triggers → check mode gate → validate device constraints → filter content → format response.
- **`TriggerDetector`** — Detects five trigger types from session metrics: `ERROR_REPEATED` (3+ errors), `STUCK_DETECTED` (5+ min, <0.1 problems/min), `TIME_THRESHOLD` (5+ min elapsed), `HELP_REQUESTED`, `CONCEPT_GAP`. Also enforces mode gating (`shouldTeach()`).
- **`ConstraintEngine`** — Maps device profiles to resource budgets (maxMemoryMB, maxCPUCores, maxResponseSize, offline flag, framework allowances) and truncates oversized content with `"[Response truncated for device constraints]"`.

**Teaching Modes (gradient of intervention):**

| Level | Constant | Behavior | Prefix |
|---|---|---|---|
| 0 | `L0_SILENT` | Never teach | *(none)* |
| 1 | `L1_MINIMAL` | Only on `HELP_REQUESTED` | `💡 Hint:` |
| 2 | `L2_CONTEXTUAL` | On ERROR_REPEATED / STUCK / HELP (default) | `📚 Guidance:` |
| 3 | `L3_ACTIVE` | Any trigger | `🎓 Teaching:` |
| 4 | `L4_TUTORIAL` | Always | `📖 Tutorial:` |

**Device profiles:** `CHROMEBOOK_LOW`, `CHROMEBOOK_STANDARD`, `DESKTOP_LOW`, `DESKTOP_STANDARD`, `DESKTOP_HIGH`. Chromebook profiles block heavy frameworks and large assets.

### Two Separate Enum Taxonomies — Do Not Conflate

| Enum | Location | Values | Meaning |
|---|---|---|---|
| `TeachingMode` | `packages/engine/src/types.ts` | L0_SILENT..L4_TUTORIAL (int 0–4) | Intervention depth (how much the engine helps) |
| `learningModeEnum` | `packages/database/src/schema/index.ts` | L1_RECALL..L5_EXPERT | Learner competency level (what the learner can do) |

These are orthogonal — a L5_EXPERT learner might still receive L4_TUTORIAL help on new content.

### Session Lifecycle

1. `POST /api/session/init` — creates `TeachingContext` (mode, deviceProfile, constraints, empty triggers[], timestamps, counters)
2. `POST /api/teach` — client sends current metrics; engine detects triggers, gates on mode, filters via device constraints, returns `TeachingResponse { shouldTeach, content?, mode, filtered }`
3. `GET /api/session/:id` — retrieve current context
4. `POST /api/triggers/detect` — detect triggers without committing a teach response

### API Server (`packages/api-server/`)

Hono framework. Auth, learner, content, session, policy, badge, and admin routes — all protected except `/auth`, `/health`, `/ready`. Drizzle ORM + Postgres.

### Shared / Database / Auth Packages

- `packages/shared/` — Central export for cross-package types and Zod schemas. Workspace dependency: `"@topshelf/shared": "workspace:*"`.
- `packages/database/` — Drizzle schema and migration tooling.
- `packages/auth/` — Authentication package (tsup build).

## Key Conventions

**Copyright header required on all source files:**
```typescript
/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */
```

**TypeScript:** Strict mode with `exactOptionalPropertyTypes` enabled. For optional properties, use the spread pattern:
```typescript
return { required, ...(opt ? { opt } : {}) };
```
ES2022 target, ESNext modules.

**Build tooling:** `tsup` for library packages, Next.js for web app, Turbo for monorepo task orchestration.

**Tests:** Vitest with globals enabled. Tests live alongside source as `src/**/*.test.ts`. Coverage via v8.

## Integration Boundaries (Hotspots)

When your change touches one of these tags, read the corresponding files before editing:

| Tag | Files to read first |
|---|---|
| `schema` | `packages/database/src/schema/index.ts` |
| `types` | `packages/engine/src/types.ts`, `packages/shared/src/types/` |
| `api` / `contracts` | `packages/api-server/src/routes/learner.ts` + `apps/web/src/lib/api/` |
| `config` | `packages/config/src/index.ts`, `.env.example` |
| `infra` | `infrastructure/docker/docker-compose.yml` |
| `policy` | `governance/policies/promotion_policy_config.json` |
| `pedagogy` | `packages/engine/src/pedagogy-engine.ts` |

## Agent Blackboard Protocol

This repo uses a blackboard architecture for multi-agent coordination. When operating as a specialized agent:

- **Before starting:** Read `.github/state/board.md`, `.github/state/decisions.md`, and `.github/state/blockers.md`.
- **After completing:** Append a timestamped entry to your section in `board.md`. Include which tags your changes affect.
- **Never delete or overwrite another agent's entries** — only append.
- File blockers in `.github/state/blockers.md`; resolve and mark `[RESOLVED]` when done.
- Record architectural decisions in `.github/state/decisions.md`.

See `.github/instructions/agent-comms.instructions.md` for the full protocol and tag definitions.
