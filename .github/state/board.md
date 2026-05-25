# Agent Blackboard

Shared state file for inter-agent communication. Agents READ this before starting and WRITE updates after completing work.

## Hotspots — Critical Integration Boundaries

Files touched by multiple agents. **Always check these before and after changes.**

### Schema & Types (shape of data — changes here ripple everywhere)

<!-- tags: schema, types, contracts -->

| File                                    | Owners          | Consumers                       | Watch For                                                               |
| --------------------------------------- | --------------- | ------------------------------- | ----------------------------------------------------------------------- |
| `packages/database/src/schema/index.ts` | db-engineer     | api-engineer, test-engineer     | Column additions, enum changes, new tables                              |
| `packages/engine/src/types.ts`          | engine-engineer | api-engineer, frontend-engineer | TeachingMode, DeviceProfile, TeachingContext, TeachingResponse shapes   |
| `packages/shared/src/types/`            | any             | all                             | LearnerState, ContentPack, PolicyDecision type changes                  |
| `packages/engine/src/index.ts`          | engine-engineer | api-engineer                    | New/removed exports (PedagogyEngine, TriggerDetector, ConstraintEngine) |

### API Contracts (request/response shapes — frontend and backend must agree)

<!-- tags: api, contracts, routes -->

| File                                        | Owners            | Consumers                           | Watch For                                    |
| ------------------------------------------- | ----------------- | ----------------------------------- | -------------------------------------------- |
| `packages/api-server/src/routes/learner.ts` | api-engineer      | frontend-engineer                   | Endpoint paths, Zod schemas, response shapes |
| `packages/api-server/src/routes/policy.ts`  | api-engineer      | engine-engineer                     | Policy evaluation inputs/outputs             |
| `packages/api-server/src/routes/content.ts` | api-engineer      | frontend-engineer, content-engineer | Pack/block query shapes                      |
| `apps/web/src/lib/api/learner.ts`           | frontend-engineer | —                                   | Must mirror API route contracts              |
| `apps/web/src/lib/api/client.ts`            | frontend-engineer | —                                   | Base URL, auth headers, error handling       |

### Config & Infrastructure (env vars, ports, connection strings)

<!-- tags: config, env, infra -->

| File                                       | Owners         | Consumers                 | Watch For                    |
| ------------------------------------------ | -------------- | ------------------------- | ---------------------------- |
| `packages/config/src/index.ts`             | infra-engineer | api-engineer, db-engineer | New env var references       |
| `.env.example`                             | infra-engineer | all                       | New required variables       |
| `infrastructure/docker/docker-compose.yml` | infra-engineer | all                       | Service ports, volume mounts |

### Content & Policy (teaching behavior)

<!-- tags: content, policy, pedagogy -->

| File                                               | Owners           | Consumers                 | Watch For                      |
| -------------------------------------------------- | ---------------- | ------------------------- | ------------------------------ |
| `governance/policies/promotion_policy_config.json` | engine-engineer  | api-engineer              | Threshold changes, new signals |
| `content-packs/template_content_pack.json`         | content-engineer | db-engineer, api-engineer | Schema structure for seeding   |
| `content/web-fundamentals/manifest.json`           | content-engineer | —                         | Domain scope, topic list       |

### Key Enums (two taxonomies — don't confuse them)

<!-- tags: enums, modes, taxonomy -->

| Enum                                                                                            | Location                                | Values                           | Meaning                                            |
| ----------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------- | -------------------------------------------------- |
| `TeachingMode`                                                                                  | `packages/engine/src/types.ts`          | L0_SILENT..L4_TUTORIAL (int 0-4) | Intervention depth (how much the engine helps)     |
| `learningModeEnum`                                                                              | `packages/database/src/schema/index.ts` | L1_RECALL..L5_EXPERT             | Learner competency level (what the learner can do) |
| These are **orthogonal** — a L5_EXPERT learner might still get L4_TUTORIAL help on new content. |

## Status Board

<!-- Agents: append your status below in your section. Most recent entry first. -->

### db-engineer

**[2026-04-22]** Completed foundation sprint todos #2 and #3.

**#2 — Migration validation (static analysis, no live DB required):**

- `drizzle.config.ts` — points correctly to `./src/schema/index.ts` and `./drizzle` output dir; credentials loaded from root `.env` via `dotenv`.
- All 3 migration files are well-formed and non-truncated.
- Cross-check: all **21 tables** in `schema/index.ts` are covered by the migrations:
  - `0000_rainy_abomination.sql` — 19 tables + all 8 enums (organizations, users, auth_sessions, oauth_accounts, content_packs, content_blocks, learner_states, learner_progress_events, learning_sessions, policy_evaluations, benchmarks, badges, audit_logs, subscriptions, invoices, seat_assignments, webhook_endpoints, webhook_deliveries, data_export_requests)
  - `0001_public_smiling_tiger.sql` — `password_reset_tokens`
  - `0002_chunky_dragon_man.sql` — `email_verification_tokens`
- No gaps found. Migrations are sequential and complete.

**#3 — Seed script (`packages/database/scripts/seed.ts`):**

- Rewrote existing stub into a full implementation.
- Dynamically reads all non-template JSON from `content-packs/*.json` and all JSON from `content-packs/kitchen/*.json` via `readdirSync`.
- Distinguishes pack types: regular packs have `teachingBlocks`; kitchen packs have `type` + `briefing` + `timeLimitSeconds`.
- Regular packs: inserts `contentPacks` row + one `contentBlocks` row per `teachingBlock` with mode mapped via `L0→L1_RECALL` … `L5→L5_EXPERT`.
- Kitchen packs (8 files): inserts `contentPacks` row + single `contentBlock` with `blockId = challenge.id`, `targetMode = L3_APPLY`, and `content.type = 'kitchen_challenge'`.
- All inserts use `.onConflictDoNothing()` for idempotency.
- `main()` calls `connectDatabase()`, runs seed, then calls `close()` in a `finally` block.
- Uses `Database` type from `../src/index.js` — typechecks clean (`pnpm --filter @topshelf/database typecheck` exits 0).
- `"seed": "tsx scripts/seed.ts"` was already present in `package.json`.

**What api-engineer needs to know:** `content-packs/kitchen/*.json` packs are seeded with `slug = pack.slug` (short form, e.g. `ghost-recipe`). Regular packs use `slug = pack.id` (e.g. `pack-linux-fundamentals-v1`). Query `content_packs` by `slug` to resolve pack identity.

### api-engineer

- **[2026-05-25]** `api` `retention` Added direct HTTP route coverage for `GET /learner/retention/queue`. Files: `packages/api-server/src/routes/learner.test.ts`. Tests now pin empty-queue behavior, aggregation across multiple learner states, oldest-first due ordering, `nextDueAt`, and the retention-history-only query shape. Verification: rebuilt `@topshelf/engine` so API tests resolve current runtime exports, then `pnpm --filter @topshelf/api-server test -- src/routes/learner.test.ts` passed (312/312 due package-level Vitest matching).

- **[2026-05-23]** `api` `auth` `contracts` Completed P1.2/P1.3 validation pass for walking skeleton auth/session isolation. Files: `packages/api-server/src/middleware/auth.test.ts`, `packages/api-server/src/routes/learner.test.ts`. Downstream: no API response or route contract changes; tests now pin custom JWT auth to an unrevoked, unexpired persisted session and verify one completed learner block is recorded only through the current user's active session/learner state.

**[2026-04-25] Instructor routes**

**Created `packages/api-server/src/routes/instructor.ts`:**

- `GET /instructor/courses` — lists content packs authored by the requester with `enrolledCount` aggregate (count distinct learnerState.userId). Requires `instructor`, `school_admin`, `district_admin`, or `system_admin` role.
- `GET /instructor/students?packId=<uuid>` — returns students across the instructor's packs with `lastSessionAt`, `totalSessions`, `masteryScore`, and resolved `displayName`. `packId` is optional UUID filter validated via Zod.

**Schema discrepancies worked around:**

- Task spec referred to `learnerStates.packId` — actual column is `contentPackId`.
- Task spec referred to `learnerStates.currentMastery` — actual column is `overallMastery`.
- `learningSessions` has no direct `packId`; joined via `learnerStateId`.

**Wired into `packages/api-server/src/index.ts`:**

- Added `import { createInstructorRoutes }` and `protectedApi.route('/instructor', createInstructorRoutes())`.

**Typecheck:** clean ✓

**[2026-04-25] change-password endpoint + audit log infrastructure**

**POST /auth/change-password:**

- Added to `packages/api-server/src/routes/auth.ts` before `return router`.
- Schema: `{ currentPassword: z.string().min(1), newPassword: z.string().min(8) }`.
- Auth-gated via `authMiddleware()`. Verifies current password with `verifyPassword()`, validates strength with `validatePasswordStrength()`, hashes new password, updates `users.passwordHash + updatedAt`, revokes all active sessions for the user in a transaction.
- Returns `{ message: 'Password changed successfully.' }`.

**Audit log helper:**

- Created `packages/api-server/src/lib/audit.ts` — exports `insertAuditLog(params: AuditParams)` (fire-and-forget safe).
- Uses `auditLogs` table from `@topshelf/database` (already exported via `export * from './schema/index.js'`).
- `AuditParams` optional fields typed as `string | undefined` to satisfy `exactOptionalPropertyTypes`.

**Audit log calls wired into auth.ts (all fire-and-forget via `void`):**

- `auth.login` — after successful login
- `auth.register` — after successful register
- `auth.logout` — inside try block after session revocation
- `auth.password_reset` — after successful reset-password
- `auth.password_changed` — after successful change-password

**Typecheck:** clean ✓

**Item 16 — `GET /metrics` endpoint:**

- `packages/api-server/src/routes/metrics.ts` _(new)_ — `createMetricsRoutes()` mounts `GET /` handler that calls `metrics.export()` from `@topshelf/observability` and returns Prometheus-format text with content-type `text/plain; version=0.0.4; charset=utf-8`.
- `packages/api-server/src/routes/metrics.test.ts` _(new)_ — 4 tests: returns 200, correct content-type, HELP/TYPE lines in body, no auth required. All 4 pass.
- `packages/api-server/src/index.ts` — imported `createMetricsRoutes`, mounted at `api.route('/metrics', ...)` as a **public** route (no auth middleware).

**Item 17 — `requestId` in route log calls:**

- Audit of all route files (`packages/api-server/src/routes/*.ts`) found **zero** existing logger calls. The `no-change` rule ("only add requestId to existing log call objects") means there is nothing to modify. All log calls are in `index.ts` server startup code where there is no request context (`c`). No changes made.

**Test results:** metrics tests 4/4 ✓ | api-server total 265 tests (261 pre-existing pass, 4 pre-existing `rate-limiter.test.ts` failures unrelated to this batch) | typecheck: clean ✓

**Files fixed:**

- `packages/api-server/src/routes/content.ts` — added `: Hono` return type to `createContentRoutes()`, fixed strict-boolean on nullable string (`certification !== undefined`), replaced all `||` with `??` for nullable string/number coalescing, added `: string` return type to inner `norm` arrow fn, removed unnecessary `?? 0` on non-nullable `blocksCompleted`.
- `packages/api-server/src/routes/content.test.ts` — added `import { createMiddleware } from 'hono/factory'` at top, replaced `require('hono/factory')` with top-level import, added explicit return types to all mock factory functions (`getDatabase`, `eq`, `and`, `desc`, `asc`, `getConfig`, `requireRole`).
- `packages/database/scripts/seed.ts` — removed `!= null` conditional on non-nullable `timeBudgetSeconds` (was `no-unnecessary-condition` + `eqeqeq` error), replaced with direct `timeBudgetSeconds: block.timeBudgetSeconds`.
- `packages/api-server/src/routes/billing.test.ts` — already clean (0 errors before this pass).
- `apps/web/src/app/(app)/machines/page.tsx` and `tools/page.tsx` — only security warnings (object injection), no errors; no changes needed.

**Test results:** api-server: 261/261 ✓ | web: 181/181 ✓ | typecheck: clean ✓

**[2026-04-22T02:15]** Completed foundation sprint todos #5 and #6.

**#5 — POST /content/packs (content pack creation):**

- Added `CreatePackSchema` (slug regex-validated, version, title, optional description/certTarget/status/metadata).
- Pre-insert conflict check via `findFirst` on `(slug, version)` — throws `ConflictError` (409) if pack already exists.
- Returns 201 with the full created pack row via Drizzle `.returning()`.
- `content.ts`: `ConflictError` added to error-handler import; `CreatePackSchema` + full `zValidator` wired to the route.
- `content.test.ts`: added `insert` mock to `mockDb`, extended `contentPacks` mock with `slug`/`version` fields, added 4 test cases (201 create, 409 conflict, 400 invalid slug, 400 missing required fields).

**#6 — Billing routes (`/billing`):**

- `packages/config/src/index.ts` — added `BillingConfigSchema` (flat env-var-friendly: `stripeSecretKey`, `stripeWebhookSecret`, `trialDays`, `taxEnabled`, flat `priceIds` sub-object per tier/interval). Added `billing` to `AppConfigSchema` with `.default({})`. Wired all `STRIPE_*` env vars in the config loader.
- `.env.example` — added `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_TRIAL_DAYS`, `STRIPE_TAX_ENABLED`, and all 8 `STRIPE_PRICE_*` vars with empty defaults.
- `packages/api-server/package.json` — added `"@topshelf/billing": "workspace:*"`.
- `packages/api-server/src/routes/billing.ts` _(new)_ — `createBillingRoutes()` with 4 endpoints:
  - `POST /billing/webhook` — **public** (no JWT), reads raw body via `c.req.text()`, verifies Stripe signature via `BillingService.constructWebhookEvent`, acknowledges known event types.
  - `POST /billing/checkout` — auth-gated via per-route `authMiddleware()`; Zod-validated body; calls `BillingService.createCheckoutSession`; returns `{ url, sessionId }`.
  - `GET /billing/portal` — auth-gated; looks up user → org → subscription.stripeCustomerId; calls `BillingService.createPortalSession`; returns `{ url }`.
  - `GET /billing/subscription` — auth-gated; looks up org subscription from DB; returns subscription shape or `{ subscription: null }`.
- `packages/api-server/src/index.ts` — mounted `createBillingRoutes()` under `api.route('/billing', ...)` (outside `protectedApi`) so webhook bypasses global JWT middleware.
- `packages/api-server/src/routes/billing.test.ts` _(new)_ — 12 test cases covering checkout (valid, seats, bad plan, missing fields), portal (valid, no org, no sub, bad URL), subscription (active, no org, no sub), and webhook (missing sig, bad sig, valid).

**Test results:** 261 tests passing (was 243 before this sprint). Typecheck clean.

**What frontend-engineer needs to know:**

- `POST /api/v1/billing/checkout` → `{ url, sessionId }` — redirect user to `url` for Stripe checkout.
- `GET /api/v1/billing/portal?returnUrl=<url>` → `{ url }` — redirect user to `url` for billing portal.
- `GET /api/v1/billing/subscription` → `{ subscription: { plan, interval, status, seats, usedSeats, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, trialEnd } | null }`.
- `POST /api/v1/billing/webhook` — public endpoint for Stripe; do NOT call from client.

**[2026-04-22T01:26]** Completed foundation sprint todo #4 — Redis-backed rate limiter.

**Files changed:**

- `packages/api-server/src/lib/redis-client.ts` _(new)_ — lazy-initialized ioredis singleton; reads config from `@topshelf/config` (`redis.host/port/db/password/tls/keyPrefix`); exports `getRedisClient()` and `closeRedisClient()`; logs errors via `@topshelf/observability` `getLogger()`.
- `packages/api-server/src/middleware/rate-limiter.ts` — replaced in-memory Map with Redis INCR + PEXPIRE pattern; health-check bypass and userId-or-IP key logic preserved; fails open (allows request through + logs warning) if Redis is unreachable.
- `packages/api-server/src/middleware/rate-limiter.test.ts` — added `vi.mock('../lib/redis-client.js')` with an in-memory Redis mock; `beforeEach` clears the mock store so tests are fully isolated.
- `packages/api-server/src/index.ts` — `closeRedisClient()` called in the graceful shutdown handler before `disconnectDatabase()`.

**Test results:** 243 tests, 11 test files — all passing. TypeCheck: clean.

**What infra-engineer needs to know:** Rate limiter now requires a reachable Redis instance at runtime. Keys are namespaced under `config.redis.keyPrefix` (default `topshelf:`), so ensure `docker-compose.yml` exposes Redis on the configured port (default 6379). The server will start and operate (with rate limiting bypassed, warning logged) if Redis is down — no hard startup dependency.

**What db-engineer needs to know:** No schema changes.

### engine-engineer

**[2026-05-22]** `parallel-sweep` `engine` `bench` Completed a broad multi-agent review across engine, test, quality, API, DB, frontend, infra, and content concerns. Consensus findings: L0 silent-mode now clears triggers before detection, which may be a contract change for direct engine consumers; benchmark fixtures and labels need tightening because mutable contexts can bleed between cases and one HELP_REQUESTED label is not actually driven by detectTriggers; missing regression tests remain for L0 fast-path call-skipping, exact size boundary, and large-asset keyword rejection. Files reviewed: `packages/engine/src/pedagogy-engine.ts`, `packages/engine/src/constraint-engine.ts`, `packages/engine/src/engine.bench.ts`, `packages/engine/src/engine.test.ts`. Downstream: engine/test owners should decide whether to preserve trigger telemetry in silent mode and add the missing fast-path tests before treating the benchmark numbers as fully locked.

_No updates yet._

### test-engineer

- **[2026-05-25]** `test` `stimulus-synthesis` Added heuristic and CLI coverage for the stimulus authoring pipeline. Files: `packages/content-authoring/src/heuristics/stimulus-synth.test.ts`, `packages/content-authoring/src/cli/synth-stimulus.test.ts`. Coverage now includes `menu_board`, `plain_text`, intentional image no-synthesis without `imageRef`, `--dry-run` non-mutation, `--write` mutation plus `_authorReview`, and recursive directory `--backfill`. Verification: `pnpm --filter @topshelf/content-authoring test -- stimulus-synth.test.ts synth-stimulus.test.ts` passed (72/72).

- **[2026-05-23]** `test` `stimulus` `P2.2.1` Added exhaustive-switch and per-renderer render tests. Files: `apps/web/src/components/kitchen/stimuli/__tests__/stimulus-renderers.test.tsx`, `apps/web/vitest.config.ts` (added `@vitejs/plugin-react` plugin to enable automatic JSX transform in Vitest — renderer files don't import React directly, relying on Next.js transform). 20 tests added (7 exhaustive-switch, 13 per-renderer). All web tests pass: 211/211.

### frontend-engineer

- **[2026-05-25]** `frontend` `pedagogy` `P3.1` Wired client-side trigger UI on `apps/web/src/app/(app)/learn/[courseId]/page.tsx`. **P3.1.1 stuck_time**: per-block timer + auto-fire at 180s (`STUCK_PROMPT_SECONDS`) when no guidance shown and not submitted; one-shot via `stuckPromptFiredRef`. **P3.1.2 repeated_errors**: `blockAttempts` counter (reset per block) increments on incorrect submit; after ≥2, `requestGuidance` returns `kind: 'breakdown'` (destructive-tinted panel, forces explanation visible). Attempt counter rendered above action buttons with `aria-live="polite"`. **P3.1.3 help_requested**: existing hint button renamed to "I need help"; `handleShowHint` tags `responseData: { helpRequested: true, source: 'help_button' | 'stuck_timer' }` so the server retention scheduler treats the trial as help-aided. Tests: 221/221 web pass, typecheck + lint clean. Downstream: api-server already accepts `responseData.helpRequested` (line 521 of `learner.ts`); no API/contract change needed. Server-side detectTriggers does NOT currently seed HELP_REQUESTED from this flag — future improvement to push it onto `teachingContext.triggers` before elevation if behavior gap shows up in pilot.

- **[2026-05-23]** `frontend` `stimulus` `P2.2.2` Wired `StimulusRenderer` into teaching-block surface. Files: `apps/web/src/app/(app)/learn/[courseId]/page.tsx`, `apps/web/src/lib/api/content.ts`. Added `stimulus?: unknown` to `ContentBlockDetail.block`, `parseStimulus()` type guard, and render between "Challenge" label and question text. Also completed P1.2.2: auth buttons/inputs now `h-11` (44 px), brand name "Top Shelf" fixed in `apps/web/src/app/auth/layout.tsx`, Loader2 spinner in `apps/web/src/components/ui/button.tsx`. SW HIGH blocker resolved: added 9 missing `(app)`-group prefixes to `PRIVATE_OR_DYNAMIC_PREFIXES` in `sw.js`, bumped to `pwa-shell-v3`. Downstream: teaching blocks that carry `stimulus` in DB content will now render above the prompt; no API/schema contract changes.

- **[2026-05-23]** `frontend` `pwa` `kitchen` Completed P1.1/P1.4 walking skeleton pass. Files: `apps/web/public/sw.js`, `apps/web/public/manifest.json`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/offline/page.tsx`, `apps/web/src/lib/kitchen-packs.ts`, `apps/web/src/lib/kitchen-stimuli.ts`, `apps/web/src/app/kitchen/page.tsx`, `apps/web/src/app/kitchen/recipes/page.tsx`, `apps/web/src/app/kitchen/preview/page.tsx`. Downstream: no API/db/content contract changes; web now lists all local kitchen packs by slug, provides generic text stimuli for packs without custom solve UI, and serves the offline fallback for failed navigations without caching private routes.

- 2026-04-13: Reworked the learn flow in `apps/web/src/app/learn/[courseId]/page.tsx` to use backend session/progress state more directly. The page now boots from `content/next`, starts or recovers a learner session, records `started` and `completed` events, advances to the next block only when the backend supports it, and surfaces support/device/recent-activity context in the UI.
- 2026-04-13: Added the official Sisyphus trace asset at `apps/web/public/brand/topshelf-sisyphus-trace.svg` and used it as a restrained background accent in the learner flow.
- 2026-04-13: Skip-to-next is still not backend-supported. `learner/session/:id/event` accepts `skipped`, but `content/next/:packId` only advances from `blocksCompleted`, so the UI now avoids promising skip progression.

### content-engineer

_No updates yet._

- **[2026-05-23]** `content` `uj` `validation` Completed X1 content gate audit. No local v0.1.2 Uncle Julio's source artifact/branch was found; current teaching manifest remains `content-packs/content_pack_uncle_julios_v1.json` at `version: "0.1.1"` and the only local UJ source artifact is `zip/uj-pack-v0.1` with `version: "0.1.0"`. Added a unit regression that keeps the six shipped UJ kitchen challenge files registered consistently by filename, slug, id, and recipe linkage. Files changed: `packages/tests/src/unit/content-pack-json-validation.test.ts`, `.github/state/blockers.md`. Downstream: coordinator must provide authorized v0.1.2 source before content-engineer can apply pack updates; current UJ manifests validate cleanly.

### infra-engineer

- **[2026-05-23]** `infra` `deploy` P1.5.1 deploy checklist at `docs/deploy-checklist.md`. Blocker filed for Patrick to execute.
- **[2026-05-23]** `infra` `demo-ops` Completed P5.5 runbook and tracker gate support. Files: `RUNBOOK.md`, `docs/decisions/sun-holdings-auth-decision.md`, `package.json`. Downstream: demo ops gate is `pnpm run demo:ops:check`; Sun Holdings/UJ authorization remains pending and must block any real external pilot/onboarding.

**[2026-04-22]** `infra` Completed todos #1 and #7 from the foundation sprint.

**#1 — Docker dev stack hardened:**

- `infrastructure/docker/init-db.sql` — removed `CREATE DATABASE topshelf` and `CREATE USER topshelf` which conflicted with `POSTGRES_DB`/`POSTGRES_USER` Docker env vars (would fail on first-run in PG 15+). Script now only handles schema grants and default privilege grants that the env-var path doesn't apply.
- `infrastructure/docker/docker-compose.yml` — Redis service was missing a host port binding. Added `${REDIS_PORT:-6379}:6379` so the API server running on the host via `pnpm dev` can reach Redis at `localhost:6379`. All three services (postgres, redis, api) have health checks; postgres and redis expose ports to the host; volumes are named.

**#7 — Email config vars added:**

- `packages/config/src/index.ts` — added `EmailConfigSchema` (provider: sendgrid|smtp, sendgridApiKey, smtp.{host,port,user,pass}, fromAddress) and wired it into `AppConfigSchema` and the `rawConfig` loader via `EMAIL_PROVIDER`, `SENDGRID_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM_ADDRESS`. Typechecks clean.
- `.env.example` — added `# EMAIL` section with all six vars and placeholder values.

**What api-engineer needs to know:** `configManager.load().email` is now available with full email config. Use `config.email.provider` to branch between SendGrid and SMTP in the email package.

**What db-engineer needs to know:** `init-db.sql` no longer creates the DB or user — those come entirely from Docker env vars (`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`). The script now also adds `ALTER DEFAULT PRIVILEGES` so future Drizzle migrations get full access on new tables/sequences automatically.

**[2026-04-14]** `infra` Completed: Added a self-contained workflow lint path using `scripts/workflow-lint.mjs`, a new `.github/workflows/workflow-lint.yml`, and the `actionlint` WASM package. Also updated `.github/workflows/ci-parity-playwright.yml` to `codecov/codecov-action@v4` for current compatibility. Files changed: `.github/workflows/workflow-lint.yml`, `scripts/workflow-lint.mjs`, `scripts/README.md`, `.github/workflows/ci-parity-playwright.yml`. Other agents should know: `pnpm run workflow:lint` now passes locally without requiring a system `actionlint` binary.

### test-engineer

- **[2026-04-14]** `test` `api` Baseline capture only. Local `pnpm --dir implementations/mcp-server test` passes at 4 files / 25 tests in ~5.2s wall-clock; focused `tests/api.test.ts` passes at 2 tests in ~1.7s. Root `pnpm test` currently fails outside MCP on `@topshelf/policy-engine#build` (`TS5103` in DTS build), so MCP package health and monorepo test health are currently divergent.
- 2026-04-13: Expanded `packages/api-server` learner/policy route coverage around teaching-state lifecycle.
- Added learner session-start assertions for persisted default teaching context and event-ingestion assertions for learner/session state updates, trigger persistence, and non-completion behavior.
- Added policy evaluation assertions for demotion persistence, session-aware evaluation records, and no-op protection when stored teaching state already matches computed state.

### infra-engineer batch-6

**[2026-04-24] Batch 6 — Items 21 & 22 (static audit only, no code changes)**

---

#### Item 21: `pnpm dev` full-stack configuration verification

**Result: ✅ Config is correct. Both packages have dev scripts, Turbo runs them in parallel.**

| Check                                        | Status  | Detail                                                                              |
| -------------------------------------------- | ------- | ----------------------------------------------------------------------------------- | --- | ------------------------------------------------------ |
| `packages/api-server` has `dev` script       | ✅      | `"dev": "tsx watch src/index.ts"` — hot-reloads Hono on port 3000                   |
| `apps/web` has `dev` script                  | ✅      | `"dev": "next dev -p 3001"` — Next.js on port 3001                                  |
| Root `pnpm dev` calls Turbo                  | ✅      | `"dev": "turbo run dev --filter=!@topshelf/tests"`                                  |
| Turbo `dev` task is persistent and parallel  | ✅      | `"persistent": true`, `"dependsOn": ["^build"]` in `turbo.json`                     |
| Port conflict between API and web            | ✅ None | API=3000, Web=3001                                                                  |
| Web `NEXT_PUBLIC_API_URL` has a fallback     | ✅      | `                                                                                   |     | 'http://localhost:3000/api/v1'`hardcoded in`client.ts` |
| Root `.env.example` covers all required vars | ✅      | All vars documented; `DB_*`, `JWT_SECRET`, `SESSION_SECRET` have placeholder values |

**⚠️ One misconfiguration found:** `apps/web/.env.example` has `NEXT_PUBLIC_SUPABASE_URL=` and `NEXT_PUBLIC_SUPABASE_ANON_KEY=` left **blank**. The auth login page will throw `"Missing Supabase environment variables"` at runtime if these are not set. A dev following only the root `.env.example` will miss this because `apps/web/.env.example` is separate and not linked from the root. Added blocker to `blockers.md`.

---

#### Item 22: Pilot Checklist Audit

**Phase 0: Pre-Pilot Preparation — Infrastructure**

| Checklist Item                           | Status     | Evidence                                                                                                                                      |
| ---------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| MCP server deployed to staging           | ❌ MISSING | `implementations/mcp-server/` is a prototype only; no deployment or Docker config                                                             |
| Database provisioned and configured      | ✅ DONE    | Drizzle migrations (3 files, 21 tables), `docker-compose.yml` postgres service with health check                                              |
| KMS/HSM keys generated and secured       | ❌ MISSING | `content-signer.ts` explicitly notes "In production, use actual cryptographic signing with KMS/HSM" — current impl is HMAC-SHA256 placeholder |
| CDN configured for content pack delivery | ❌ MISSING | No CDN config exists; `STORAGE_PROVIDER` supports S3 but no CDN layer                                                                         |
| Monitoring and alerting configured       | ⚠️ PARTIAL | Prometheus `GET /metrics` endpoint exists; no alerting rules or dashboards defined                                                            |
| Backup and recovery procedures tested    | ❌ MISSING | No backup scripts; `docs/incident_runbooks.md` exists but is a template                                                                       |

**Phase 0: Pre-Pilot Preparation — Content**

| Checklist Item                               | Status     | Evidence                                                                                                                                            |
| -------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Minimum 3 content packs validated and signed | ⚠️ PARTIAL | 2 regular packs + 8 kitchen packs exist; all signatures are `"sig-v1-ECDSA-P256-SHA256-placeholder"` (not real crypto)                              |
| All teaching blocks have 2+ surface variants | ⚠️ PARTIAL | `CONTENT_PACK_CONSTRAINTS.minSurfaceVariants = 2` enforced in schema; packs exist but surface variant compliance unverified                         |
| Parity tests passing for all content         | ⚠️ PARTIAL | `packages/deterministic-formatter` + `ParityTestRunner` implemented; CI `ci-parity-playwright.yml` exists; placeholder signatures may affect parity |
| Role mappings configured for target badges   | ✅ DONE    | `governance/policies/promotion_policy_config.json` has `employerRequirements.requiredBadges`                                                        |
| Content review completed by SME              | ❌ MISSING | Human/process task; no evidence in repo                                                                                                             |

**Phase 0: Pre-Pilot Preparation — Platform**

| Checklist Item                                   | Status     | Evidence                                                                                                                   |
| ------------------------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| Policy configuration reviewed and approved       | ⚠️ PARTIAL | `governance/policies/promotion_policy_config.json` exists with structured thresholds; no formal approval record            |
| Promotion thresholds calibrated for pilot cohort | ⚠️ PARTIAL | Thresholds present (defaults from design: `transferThreshold: 0.75`, `consecutivePasses: 3`); not calibrated on pilot data |
| Calibration probe tested across device matrix    | ❌ MISSING | `CALIBRATION_CONFIG` schema in `@topshelf/shared` exists; no cross-device test evidence                                    |
| Offline mode tested on baseline devices          | ❌ MISSING | `FEATURE_OFFLINE_MODE=true` in `.env.example` but no service worker in `apps/web/`; offline is marketing copy only         |
| Service worker caching verified                  | ❌ MISSING | No service worker files in `apps/web/`; no PWA manifest                                                                    |

**Phase 0: Pre-Pilot Preparation — Security**

| Checklist Item                     | Status     | Evidence                                                                                                                                           |
| ---------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Security audit completed           | ❌ MISSING | No audit report found                                                                                                                              |
| Penetration testing performed      | ❌ MISSING | No evidence                                                                                                                                        |
| PII handling reviewed and approved | ⚠️ PARTIAL | `LOG_REDACT_PII=true`, `data_export_requests` GDPR table exists, Privacy Policy at `governance/legal/PRIVACY_POLICY.md`; no formal approval record |
| Audit logging verified             | ⚠️ PARTIAL | `audit_logs` table defined in schema and migrations; no API route or service actively writes to it                                                 |
| Rate limiting configured           | ✅ DONE    | Redis-backed rate limiter in `packages/api-server/src/middleware/rate-limiter.ts`; configurable via `RATE_LIMIT_*` env vars                        |

**Phase 1 & 2 items** — all operational/human tasks; no code to audit. Skipped.

**Summary counts:** ✅ DONE: 5 | ⚠️ PARTIAL: 9 | ❌ MISSING: 10

**Critical items blocking pilot launch (added to `blockers.md`):**

1. Supabase env vars blank in `apps/web/.env.example` — local dev auth broken
2. Content pack signing uses placeholder HMAC, not real KMS/ECDSA — pilot content is not cryptographically signed
3. Offline mode (`FEATURE_OFFLINE_MODE=true`) has zero implementation — no service worker
4. Audit log table exists but no code writes to it — compliance gap

### quality-reviewer

- **[2026-05-23]** `quality-gate` `P1` Completed: Static review of Batch A P1 items. SW logic and manifest icons PASS. Auth middleware tests PASS (persisted-session checks, revocation, expiry). Learner route session isolation tests PASS (cross-user 404 guards present). Kitchen home + stimuli PASS. ONE HIGH blocker: service worker `PRIVATE_OR_DYNAMIC_PREFIXES` is missing nine protected `(app)` route prefixes (`/learn`, `/content`, `/analytics`, `/achievements`, `/onboarding`, `/ingredients`, `/library`, `/machines`, `/manager`, `/notifications`, `/tools`). A navigation to any of these while offline would cache the auth-gated response (or the login redirect) under that URL key. Type-check and build results unavailable (Bash permission denied); those must be confirmed before P2 dispatch. Files reviewed: `apps/web/public/sw.js`, `apps/web/public/manifest.json`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/offline/page.tsx`, `apps/web/src/components/providers/pwa-registrar.tsx`, `packages/api-server/src/middleware/auth.test.ts`, `packages/api-server/src/routes/learner.test.ts`, `apps/web/src/lib/kitchen-packs.ts`, `apps/web/src/lib/kitchen-stimuli.ts`, `apps/web/src/app/kitchen/page.tsx`, `apps/web/src/app/kitchen/recipes/page.tsx`, `apps/web/src/app/kitchen/preview/page.tsx`. Downstream: frontend-engineer must patch `PRIVATE_OR_DYNAMIC_PREFIXES` in `sw.js` before Batch B; coordinator must confirm typecheck + build green before P2 dispatch.

| #   | Severity | File                                                  | Finding                                                                                                                                                                                                                                                               | Recommendation                                                                                                           |
| --- | -------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | HIGH     | `apps/web/public/sw.js`                               | `PRIVATE_OR_DYNAMIC_PREFIXES` missing `/learn`, `/content`, `/analytics`, `/achievements`, `/onboarding`, `/ingredients`, `/library`, `/machines`, `/manager`, `/notifications`, `/tools` — all are `(app)` auth-protected routes                                     | Add all nine prefixes before Batch B; a failed nav to these offline will cache the 401/redirect response at that URL key |
| 2   | MEDIUM   | `apps/web/src/components/providers/pwa-registrar.tsx` | SW registration is gated to `NODE_ENV === 'production'` — SW cannot be exercised in local dev or Vitest at all                                                                                                                                                        | Acceptable for v0.1.x if demo runs in prod; document as known limitation in RUNBOOK                                      |
| 3   | MEDIUM   | `apps/web/public/manifest.json`                       | `apple-touch-icon.png` referenced in `layout.tsx` metadata (180×180) is present in `icons/` directory but absent from `manifest.json` icons array — iOS add-to-home-screen will miss it in non-Safari browsers that rely on the manifest                              | Add `{ src: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }` to manifest `icons`                    |
| 4   | MEDIUM   | N/A                                                   | Typecheck and test run results unavailable due to Bash permission gate; cannot confirm `pnpm --filter @topshelf/web typecheck`, `pnpm --filter @topshelf/api-server typecheck`, `pnpm --filter @topshelf/web test`, or `pnpm --filter @topshelf/api-server test` pass | Coordinator or frontend-engineer must run and confirm before P2 dispatch                                                 |
| 5   | LOW      | `packages/api-server/src/routes/learner.test.ts`      | Session isolation tests mock `findFirst` returning `null` (simulates DB-level user filter) but the test label says "not owned by current user" — the actual isolation is verified only at the mock boundary, not through a real userId filter assertion               | Acceptable at unit level; integration test with two real users would be stronger                                         |
| 6   | LOW      | `apps/web/src/lib/kitchen-packs.ts`                   | 14 packs registered (8 generic + 6 UJ) vs 8 packs seeded by db-engineer seed script for generic kitchen; UJ pack slugs differ between registry and seed (`uj-fajita-rush` vs `pack.slug` in seed) — may cause 404s if API is queried by slug at runtime               | Static bundle path is fine for v0.1.x; flag for P2 API integration pass                                                  |
| 7   | INFO     | `apps/web/public/sw.js`                               | Precache of `/kitchen` will attempt to cache the page at install time; if the kitchen page requires client-side auth check on load, a cached unauthenticated shell is harmless but could be confusing                                                                 | Acceptable; offline page copy is just the app shell                                                                      |
| 8   | INFO     | `apps/web/src/app/offline/page.tsx`                   | No network fetches — pure static render. `Link` to `/kitchen` satisfies offline fallback requirement                                                                                                                                                                  | PASS                                                                                                                     |

- **[2026-05-22]** `parallel-protocol` `engine` `bench` Completed: Ran parallel agent sweep (`engine-engineer`, `test-engineer`, `quality-reviewer`) on benchmark-related engine changes. Findings converged on one high-risk contract concern (L0 silent-mode trigger telemetry/state now cleared before detection) and test gaps for new fast paths/regex checks. Files reviewed: `packages/engine/src/pedagogy-engine.ts`, `packages/engine/src/constraint-engine.ts`, `packages/engine/src/engine.test.ts`, `packages/engine/src/engine.bench.ts`. Downstream: engine/test owners should decide whether L0 trigger clearing is intentional contract change and add regression tests for no-call fast paths.

- **[2026-04-14]** `schema` `types` Completed: Added dependency drift enforcement with root `deps:drift:check` / `deps:drift:fix` scripts via `@manypkg/cli`, normalized root package metadata, aligned `implementations/mcp-server` `@types/node`, and sorted `packages/cli` dependencies. Files changed: `package.json`, `implementations/mcp-server/package.json`, `packages/cli/package.json`, `pnpm-lock.yaml`. Other agents should know: `pnpm run deps:drift:check` now passes locally.

### coordinator

- **[2026-05-23]** `pedagogy` `stimulus` `implementation` Batches D + E shipped in a single execution round. Final counts: engine 87/87 tests, api-server 310/310, shared 354/354, content-authoring 62/62, web 221/221. Workspace typecheck + build green. **D1 worked-example-first**: `TeachingContext.initialExposure`, `CreateContextOptions` precedence (override > initialExposure → L4 > blockMode > default), `TriggerDetector.suggestModeFade` (3-pass fade window, L1 floor), `learnerApi.getTeachingGuidance` returns `recommendedMode` driven by recent-event fade derivation. **D2 spaced retrieval**: `retention-scheduler.ts` with Leitner ladder 1/3/7/14/30/60/120d, `GET /learner/retention/queue` aggregating across packs, `recordEvent` advances/resets per-task stage; dashboard "Review now" card rendered via existing `computeDecayAffordance`. **D3 trigger-noise fix**: STUCK_DETECTED now requires `errorsEncountered > 0`; per-block `triggerRules` honored via new `TriggerThresholds` context field; TIME_THRESHOLD documented as non-severe. **E1 recipe stimulus**: added `RecipeStimulus` + `recipeStimulusSchema`, renderer wired into router + learn-page type guard. **E2 image stimulus + asset pipeline**: added `ImageStimulus` + `imageStimulusSchema` with focusRegions + altText guard, `apps/web/public/kitchen/manifest.json` cataloging 35 placeholders, 35 demo SVGs generated under `_demo/` with TS branding + "Demo" badge, `kitchen-image-manifest.ts` resolver. **E3 stimulus synthesis**: heuristic library + `synth-stimulus` CLI (`--dry-run` / `--write` / `--backfill`), 10 heuristic tests, every draft validates against `challengeStimulusSchema`. Skill files referenced throughout: `worked-example-fading`, `spaced-retrieval-scheduler`, `image-stimulus-asset-pipeline`, `stimulus-synthesis-from-prompts`. Open items: B-IMG-01 (licensed image swap, demo SVGs cover ship); UJ pack stimulus backfill via E3 CLI (held for Patrick review). Batch C (P3) now unblocked.

- **[2026-05-23]** `pedagogy` `stimulus` Planning batch: ran a web-research audit comparing the TopShelf teaching strategy (Solve First, L0–L4 modes, multi-signal mastery promotion, kitchen stimuli) against 2024–2025 instructional-science literature (expertise reversal effect, spaced retrieval, intervention timing, situated learning). Three high-priority gaps identified: (1) novices start at L2 instead of L4 worked-example — contradicts cognitive load theory for first exposure; (2) mastery decay is modeled but no scheduler populates the retention queue, leaving the most-replicated learning enhancement (spaced retrieval) unused; (3) `TIME_THRESHOLD` + `STUCK_DETECTED` co-fire after 5 min regardless of error history, interrupting productive struggle. Two stimulus-completeness gaps: no `recipe` or `image` kind in the discriminated union despite `RecipeCard` component and 30+ placeholder webp's under `apps/web/public/kitchen/`; no authoring CLI to draft stimuli from existing Q/R block fields. Updated `.github/state/queue.md` with Batches D (pedagogy correctness), E (stimulus completeness), F (interleaving + metacognition, deferred). Authored 4 new skill files: `worked-example-fading`, `spaced-retrieval-scheduler`, `image-stimulus-asset-pipeline`, `stimulus-synthesis-from-prompts`. E2 ships demo-SVG placeholders so image-stimulus infrastructure lands without waiting on licensed assets (B-IMG-01 reframed as future swap, not blocker). Downstream: engine-engineer owns D1+D3 first; db-engineer + api-engineer own D2; content-engineer + frontend-engineer own E1/E2/E3 in parallel after D1 lands.

- **[2026-05-25]** `coordinator` `protocol` `agents` Completed combined `.agents` + `.github/agents` audit and low-conflict protocol repair. Files changed: `.agents/progress.md`, `.github/state/queue.md`, `.github/state/blockers.md`, `.github/state/decisions.md`, `.github/workflows/ci.yml`, `.github/checklists/TODO_PHASE_1.md`, `.agents/skills/stimulus-renderer-integration/SKILL.md`, `.agents/skills/topshelf-content-pack-authoring/SKILL.md`, `.agents/skills/top-shelf-ui/SKILL.md`, `.agents/evals/image-stimulus-asset-pipeline/tasks/*.yaml`, `docs/validation/pwa-2026-05-25.md`. Downstream: agents should read `.agents/progress.md` for the latest cross-system status; the blackboard files expected by `agent-comms.instructions.md` now exist; Markdown/protocol changes now trigger primary CI instead of being ignored.
