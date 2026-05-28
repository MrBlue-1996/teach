# CLAUDE.md

Last updated: 2026-05-28

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package: `@topshelf/database`

Drizzle ORM schema + connection manager for PostgreSQL. Consumed by `api-server`; not used directly by `engine`, `shared`, or `web`.

```bash
pnpm db:generate    # generate migration from schema changes
pnpm db:migrate     # apply pending migrations
pnpm db:studio      # Drizzle Studio UI
pnpm test           # schema shape tests
pnpm typecheck
```

## Connection

```ts
import { getDatabase } from '@topshelf/database';
const db = getDatabase();
```

`getDatabase()` returns the singleton connection. `connectDatabase()` must be called at server startup (api-server `src/index.ts` handles this). Do not call `connectDatabase()` inside route handlers.

## Schema Overview

All tables and enums are in `src/schema/index.ts`, re-exported from the package root. Operators (`eq`, `and`, `desc`, etc.) are also re-exported from the package root — import everything from `@topshelf/database`, never directly from `drizzle-orm`.

### Table Clusters

**Auth / Identity**

- `users` — `role` enum: `learner | instructor | content_author | school_admin | district_admin | system_admin`
- `organizations` — multi-tenant hierarchy; `users.organizationId` foreign key
- `authSessions`, `oauthAccounts`, `passwordResetTokens`, `emailVerificationTokens`

**Content**

- `contentPacks` — `(slug, version)` unique; `status` enum: `draft | review | approved | published | archived`; `signature` + `signedBy` for tamper detection
- `contentBlocks` — `blockId` is a human-readable string (not UUID); `targetMode` enum: `L1_RECALL | L2_RECOGNITION | L3_APPLICATION | L4_ANALYSIS | L5_EXPERT`; `content` is JSONB; `hints` is `text[]`

**Learning**

- `learnerStates` — `(userId, contentPackId)` unique; `skillEstimates` JSONB, `retentionHistory` JSONB, `inProbation` boolean
- `learnerProgressEvents` — `eventType`: `started | completed | hint_used | skipped | paused | resumed`; `correctness` is `0.0–1.0` float
- `learningSessions` — `teachingMode` stored as integer 0–4; `triggersFired` is JSONB array; `deviceProfile` is string; `pausedDurationSeconds` for accurate time tracking

**Policy Audit Chain**

- `policyEvaluations` — `decision` enum: `promote | demote | hold | defer`; `chainHash / previousHash / signature` form a tamper-evident audit chain

**Billing**

- `subscriptions` (Stripe-linked), `invoices`, `seatAssignments`

**Audit / GDPR**

- `auditLogs` — `previousState / newState` JSONB for resource change history
- `dataExportRequests` — GDPR data export workflow

### Relations

`learnerState` → `learnerProgressEvents` (one-to-many)  
`learnerState` → `learningSessions` (one-to-many)  
`learnerState` → `policyEvaluations` (one-to-many)  
`contentPack` → `contentBlocks` (one-to-many)  
`user` → `learnerStates`, `badges`, `authSessions` (one-to-many)  
`organization` → `users` (one-to-many)

Use `with:` in Drizzle queries to fetch relations rather than manual joins.

## Query Patterns

```ts
// Fetch with relations
const state = await db.query.learnerStates.findFirst({
  where: eq(learnerStates.userId, userId),
  with: { progressEvents: true },
});

// Insert
const [inserted] = await db.insert(learnerStates).values({ ... }).returning();

// Update
await db.update(learnerStates).set({ ... }).where(eq(learnerStates.id, id));
```

Prefer `findFirst` / `findMany` with `with:` over manual joins. Use `.returning()` on inserts when you need the persisted row.

## Schema Changes

1. Edit `src/schema/index.ts`
2. Run `pnpm db:generate` to produce a migration file
3. Run `pnpm db:migrate` to apply
4. Re-run `pnpm typecheck` across `api-server` — Drizzle infers types from the schema, so type errors surface after schema changes

Do not hand-write migration SQL unless correcting a Drizzle generator bug. The generated migrations are the source of truth.

## Migration Safety Rules

Generated migrations are the source of truth. **Never hand-edit migration files.** Before applying a migration:

1. Read the generated SQL and confirm it is additive (new tables, new columns, new indexes).
2. `DROP TABLE`, `DROP COLUMN`, or destructive `ALTER` statements require explicit approval — do not apply silently.
3. Run `pnpm --filter @topshelf/api-server typecheck` after migrations — Drizzle infers types from the schema and type errors will surface there.

## Conventions

- Always import from `@topshelf/database` (package root) — never from `drizzle-orm` or internal paths directly.
- Test files are named `*.test.ts` and live in `src/` alongside the module they test.
- All source files must include the copyright header:
  ```ts
  /**
   * TopShelf Service LLC
   * PROPRIETARY AND CONFIDENTIAL
   * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
   */
  ```
- Run `pnpm --filter @topshelf/database typecheck` after schema changes.
