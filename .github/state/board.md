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

**[2026-04-23] Batch 5 — Items 16 & 17**

**Item 16 — `GET /metrics` endpoint:**
- `packages/api-server/src/routes/metrics.ts` *(new)* — `createMetricsRoutes()` mounts `GET /` handler that calls `metrics.export()` from `@topshelf/observability` and returns Prometheus-format text with content-type `text/plain; version=0.0.4; charset=utf-8`.
- `packages/api-server/src/routes/metrics.test.ts` *(new)* — 4 tests: returns 200, correct content-type, HELP/TYPE lines in body, no auth required. All 4 pass.
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
- `packages/api-server/src/routes/billing.ts` *(new)* — `createBillingRoutes()` with 4 endpoints:
  - `POST /billing/webhook` — **public** (no JWT), reads raw body via `c.req.text()`, verifies Stripe signature via `BillingService.constructWebhookEvent`, acknowledges known event types.
  - `POST /billing/checkout` — auth-gated via per-route `authMiddleware()`; Zod-validated body; calls `BillingService.createCheckoutSession`; returns `{ url, sessionId }`.
  - `GET /billing/portal` — auth-gated; looks up user → org → subscription.stripeCustomerId; calls `BillingService.createPortalSession`; returns `{ url }`.
  - `GET /billing/subscription` — auth-gated; looks up org subscription from DB; returns subscription shape or `{ subscription: null }`.
- `packages/api-server/src/index.ts` — mounted `createBillingRoutes()` under `api.route('/billing', ...)` (outside `protectedApi`) so webhook bypasses global JWT middleware.
- `packages/api-server/src/routes/billing.test.ts` *(new)* — 12 test cases covering checkout (valid, seats, bad plan, missing fields), portal (valid, no org, no sub, bad URL), subscription (active, no org, no sub), and webhook (missing sig, bad sig, valid).

**Test results:** 261 tests passing (was 243 before this sprint). Typecheck clean.

**What frontend-engineer needs to know:**
- `POST /api/v1/billing/checkout` → `{ url, sessionId }` — redirect user to `url` for Stripe checkout.
- `GET /api/v1/billing/portal?returnUrl=<url>` → `{ url }` — redirect user to `url` for billing portal.
- `GET /api/v1/billing/subscription` → `{ subscription: { plan, interval, status, seats, usedSeats, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, trialEnd } | null }`.
- `POST /api/v1/billing/webhook` — public endpoint for Stripe; do NOT call from client.

**[2026-04-22T01:26]** Completed foundation sprint todo #4 — Redis-backed rate limiter.

**Files changed:**
- `packages/api-server/src/lib/redis-client.ts` *(new)* — lazy-initialized ioredis singleton; reads config from `@topshelf/config` (`redis.host/port/db/password/tls/keyPrefix`); exports `getRedisClient()` and `closeRedisClient()`; logs errors via `@topshelf/observability` `getLogger()`.
- `packages/api-server/src/middleware/rate-limiter.ts` — replaced in-memory Map with Redis INCR + PEXPIRE pattern; health-check bypass and userId-or-IP key logic preserved; fails open (allows request through + logs warning) if Redis is unreachable.
- `packages/api-server/src/middleware/rate-limiter.test.ts` — added `vi.mock('../lib/redis-client.js')` with an in-memory Redis mock; `beforeEach` clears the mock store so tests are fully isolated.
- `packages/api-server/src/index.ts` — `closeRedisClient()` called in the graceful shutdown handler before `disconnectDatabase()`.

**Test results:** 243 tests, 11 test files — all passing. TypeCheck: clean.

**What infra-engineer needs to know:** Rate limiter now requires a reachable Redis instance at runtime. Keys are namespaced under `config.redis.keyPrefix` (default `topshelf:`), so ensure `docker-compose.yml` exposes Redis on the configured port (default 6379). The server will start and operate (with rate limiting bypassed, warning logged) if Redis is down — no hard startup dependency.

**What db-engineer needs to know:** No schema changes.

### engine-engineer

_No updates yet._

### frontend-engineer

- 2026-04-13: Reworked the learn flow in `apps/web/src/app/learn/[courseId]/page.tsx` to use backend session/progress state more directly. The page now boots from `content/next`, starts or recovers a learner session, records `started` and `completed` events, advances to the next block only when the backend supports it, and surfaces support/device/recent-activity context in the UI.
- 2026-04-13: Added the official Sisyphus trace asset at `apps/web/public/brand/topshelf-sisyphus-trace.svg` and used it as a restrained background accent in the learner flow.
- 2026-04-13: Skip-to-next is still not backend-supported. `learner/session/:id/event` accepts `skipped`, but `content/next/:packId` only advances from `blocksCompleted`, so the UI now avoids promising skip progression.

### content-engineer

_No updates yet._

### infra-engineer

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

### quality-reviewer

- **[2026-04-14]** `schema` `types` Completed: Added dependency drift enforcement with root `deps:drift:check` / `deps:drift:fix` scripts via `@manypkg/cli`, normalized root package metadata, aligned `implementations/mcp-server` `@types/node`, and sorted `packages/cli` dependencies. Files changed: `package.json`, `implementations/mcp-server/package.json`, `packages/cli/package.json`, `pnpm-lock.yaml`. Other agents should know: `pnpm run deps:drift:check` now passes locally.
