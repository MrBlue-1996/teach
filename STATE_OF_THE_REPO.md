# State of the Repo — Batch 0.1 Inventory

> Generated: 2026-05-26  
> Branch: `main` @ `339457e`  
> Agent: GitHub Copilot (Claude Sonnet 4.6)  
> Purpose: Pre-flight baseline for UJ Pack → Production execution plan

---

## Section 1 — Repo Structure

### Workspace Roots (`pnpm-workspace.yaml`)

| Path                | Type       | Notes                                          |
| ------------------- | ---------- | ---------------------------------------------- |
| `packages/*`        | Libraries  | Active packages only — `_future/` is gated off |
| `apps/*`            | Apps       | `web/` only                                    |
| `implementations/*` | Prototypes | `mcp-server/` only                             |
| `content-packs`     | Data       | JSON content packs (teaching + kitchen)        |
| `content`           | Data       | Legacy manifest stubs                          |
| `policy`            | Config     | Not a workspace package                        |
| `docs`              | Docs       | Documentation only                             |
| `pilot`             | Data       | Sample learner fixtures                        |

### Active Packages

| Package                             | Path                                | Build      | Description                                                                                                              |
| ----------------------------------- | ----------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| `@topshelf/engine`                  | `packages/engine/`                  | tsup       | Teaching engine: TriggerDetector, ConstraintEngine, PedagogyEngine + kitchen ChallengeMachine/ShadowValidator            |
| `@topshelf/api-server`              | `packages/api-server/`              | tsup       | Hono framework API; routes: auth, learner, content, session, policy, badge, billing, admin, instructor, manager, metrics |
| `@topshelf/database`                | `packages/database/`                | tsup       | Drizzle ORM + PostgreSQL; all schema in `src/schema/index.ts`                                                            |
| `@topshelf/auth`                    | `packages/auth/`                    | tsup       | Custom JWT via `jose`, bcryptjs password hashing; NO Supabase Auth, NO Firebase                                          |
| `@topshelf/shared`                  | `packages/shared/`                  | tsup       | Single source of truth: Zod schemas, TS types, constants, utilities                                                      |
| `@topshelf/config`                  | `packages/config/`                  | tsup       | Env var parsing; all env references must go through here                                                                 |
| `@topshelf/content-authoring`       | `packages/content-authoring/`       | tsup       | ContentPackValidator → ContentPackSigner → AuthoringPipeline; CLI at `src/cli/validate-packs.ts`                         |
| `@topshelf/deterministic-formatter` | `packages/deterministic-formatter/` | tsup       | CanonicalFormatter + ParityValidator; promoted from `_future/`                                                           |
| `@topshelf/billing`                 | `packages/billing/`                 | tsup       | Stripe subscriptions + invoices                                                                                          |
| `@topshelf/email`                   | `packages/email/`                   | tsup       | Transactional email                                                                                                      |
| `@topshelf/observability`           | `packages/observability/`           | tsup       | Structured logging, metrics, tracing                                                                                     |
| `@topshelf/cli`                     | `packages/cli/`                     | tsup       | Admin CLI                                                                                                                |
| `@topshelf/shared`                  | `packages/shared/`                  | tsup       | Types, schemas, utils                                                                                                    |
| `@topshelf/testkit`                 | `packages/testkit/`                 | —          | Shared test helpers; no package.json yet                                                                                 |
| `@topshelf/tests`                   | `packages/tests/`                   | Playwright | E2E + integration tests; excluded from `pnpm dev`                                                                        |

### Gated Off (`packages/_future/`)

`client-pwa`, `nlp`, `policy-engine`, `mcp-server` (old copy), `deterministic-formatter` (old copy). **Do not import from `_future/`.**

### Agent Scope Guides (`.github/agents/`)

9 specialized `.agent.md` files define bounded scopes for each coding agent (api-engineer, content-engineer, db-engineer, engine-engineer, frontend-engineer, infra-engineer, quality-reviewer, test-engineer, coordinator). Read the relevant file before working in that area.

### Web App (`apps/web/`)

- **Framework**: Next.js 15.5.18, React 19, App Router
- **UI**: Tailwind CSS 3.4, Radix UI primitives, Lucide icons
- **State**: Zustand 4.5 (auth-store, challenge-store)
- **Data fetching**: TanStack Query 5.17
- **Forms**: react-hook-form 7.50
- **PWA**: `public/sw.js` service worker, `public/manifest.webmanifest`, offline fallback page — app is installable on mobile (added `339457e` era)
- **Key routes**:
  - `/(app)/learn/[courseId]/` — teaching content runner (P3.1 trigger UI wired)
  - `/kitchen/` — kitchen challenge index
  - `/kitchen/challenges/[slug]/` — kitchen challenge runner (see Section 3)
  - `/kitchen/mastery/` — mastery dashboard (retention decay status panel, `retentionQueue` from API)
  - `/kitchen/preview/` — phone emulator preview surface
  - `/kitchen/recipes/` — recipe book
  - `/kitchen/qr-validate/` — QR code validation
  - `/(app)/settings/`, `/onboarding/`, `/notifications/`

### Content Packs

| Path                                                  | Format                           | Count      | Notes                                             |
| ----------------------------------------------------- | -------------------------------- | ---------- | ------------------------------------------------- |
| `content-packs/content_pack_uncle_julios_v1.json`     | `ContentPackManifest` (teaching) | 8 blocks   | v0.1.1; 6 of 8 have `stimulus` objects            |
| `content-packs/content_pack_linux_v1.json`            | `ContentPackManifest`            | —          | Linux fundamentals                                |
| `content-packs/content_pack_networkplus_v1.json`      | `ContentPackManifest`            | —          | Network+ cert                                     |
| `content-packs/content_pack_web-fundamentals_v1.json` | `ContentPackManifest`            | —          | Web fundamentals                                  |
| `content-packs/kitchen/uj-*.json`                     | `ChallengeConfig` (kitchen)      | 6 UJ packs | Registered in `apps/web/src/lib/kitchen-packs.ts` |
| `content-packs/kitchen/*.json`                        | `ChallengeConfig`                | 8 generic  | Not all registered                                |

**Important**: `ContentPackManifest` (teaching) and `ChallengeConfig` (kitchen) are **different formats**. The UJ teaching pack and UJ kitchen packs are separate artifacts.

### Build Tooling

- **Orchestration**: Turbo (caches build/lint/test; `globalEnv` includes NODE_ENV, CI, TOPSHELF_ENV)
- **Libraries**: tsup
- **Web**: next build
- **Tests**: Vitest (unit), Playwright (E2E)
- **Package manager**: pnpm@10.33.3
- **Node**: v20.20.2

---

## Section 2 — Auth & Data Flow

### ⚠️ CRITICAL: No Firebase — Custom JWT + Supabase Client

The execution plan may reference Firebase. **This repo does not use Firebase.** Auth is:

| Layer               | Technology                                           | Location                            |
| ------------------- | ---------------------------------------------------- | ----------------------------------- |
| API auth            | Custom JWT (`jose` + `bcryptjs`)                     | `packages/auth/src/index.ts`        |
| API session storage | PostgreSQL via Drizzle (`authSessions` table)        | `packages/database/`                |
| Web auth client     | Supabase (`@supabase/ssr`, `@supabase/supabase-js`)  | `apps/web/src/lib/supabase.ts`      |
| Web auth state      | Zustand (`useAuthStore`) persisted to `localStorage` | `apps/web/src/stores/auth-store.ts` |

### Auth Flow (API Server)

```
POST /auth/login
  → packages/auth: verifyPassword (bcrypt) + generateTokens (jose HS256 JWT)
  → Returns { user, accessToken, refreshToken, expiresIn, tokenType: 'Bearer' }
  → Web: useAuthStore.setAuthFromResponse()
```

### Token Shape

```typescript
// JWT payload (sub = userId)
{ email, role, organizationId?, sessionId, iat, exp }
// Signed with: HS256, issuer 'topshelf-teaching', audience 'topshelf-api'
// Expiry controlled by config.auth.jwtExpiresIn (e.g. "24h")
```

### Request Auth (API)

All protected routes: `Authorization: Bearer <accessToken>` header.  
Middleware extracts `userId` and `userRole` into Hono context vars.

### Supabase Role (Web Client Only)

`apps/web/src/lib/supabase.ts` → `getSupabaseBrowserClient()` creates a Supabase browser client using `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`. **As of `fdbc4b5`, the DB config is Supabase-first** — both the API server and web client use Supabase as the backing database; Drizzle schema targets the Supabase Postgres instance.

### Supabase Migrations (separate from Drizzle)

`infrastructure/supabase/migrations/`:

- `001_kitchen_tables.sql`
- `002_kitchen_seed.sql`
- `003_uncle_julios_seed.sql`

These are Supabase-native migrations (separate from the Drizzle ORM schema used by the API server).

### Database Schema (Drizzle, `packages/database/src/schema/index.ts`)

Key table clusters (from CLAUDE.md):

| Cluster  | Tables                                                       |
| -------- | ------------------------------------------------------------ |
| Auth     | `users`, `organizations`, `authSessions`, `oauthAccounts`    |
| Content  | `contentPacks`, `contentBlocks`                              |
| Learning | `learnerStates`, `learnerProgressEvents`, `learningSessions` |
| Policy   | `policyEvaluations`                                          |
| Billing  | `subscriptions`, `invoices`, `seatAssignments`               |
| Audit    | `auditLogs`, `dataExportRequests`                            |

### Config Required (from `packages/config/src/index.ts`)

Key env vars:

- `JWT_SECRET` — required for token signing
- `SESSION_SECRET` — required
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` — PostgreSQL
- `REDIS_HOST`, `REDIS_PORT` — Redis (rate limiter, session cache)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — web Supabase client
- `TOPSHELF_ENV=hybrid` — enables hybrid env mode (added post-`3bea8a4`; required for Supabase-first DB config)

### API Server Middleware Stack (in order)

```
requestId → secureHeaders → compress → timing → cors → logger(dev) → rateLimiter → errorHandler
```

Auth middleware (Bearer JWT) added per-router.

---

## Section 3 — Challenge Surface Forensics

### Entry Point

`apps/web/src/app/kitchen/challenges/[slug]/page.tsx`

- Client component (`'use client'`)
- Gets `slug` from `useParams()`
- Calls `getPack(slug)` → `ChallengeConfig | null`
- Passes config to `useChallenge(config)` hook
- Renders `<PhaseView>` based on `ch.phase`
- **Golden path link selector fixed** (`339457e` era): `/kitchen/challenges/[slug]` link selector corrected so challenge runner is reachable from the kitchen index

### Stimulus Renderers

All six challenge-stimulus renderers (`ticket`, `station_state`, `recipe`, `huddle_notes`, `image`, `recipe`) are fully integrated into the challenge surface. The discriminator router is exhaustively switched.

### Content Registry

`apps/web/src/lib/kitchen-packs.ts`

**Statically registered packs** (bundled into the client):

| Slug                | File                                           |
| ------------------- | ---------------------------------------------- |
| `uj-fajita-rush`    | `content-packs/kitchen/uj-fajita-rush.json`    |
| `uj-enchilada-rush` | `content-packs/kitchen/uj-enchilada-rush.json` |
| `uj-line-temps`     | `content-packs/kitchen/uj-line-temps.json`     |
| `uj-grill-setup`    | `content-packs/kitchen/uj-grill-setup.json`    |
| `uj-queso-scale`    | `content-packs/kitchen/uj-queso-scale.json`    |
| `uj-allergy-order`  | `content-packs/kitchen/uj-allergy-order.json`  |

To add a new pack: add JSON import + entry to `PACKS` record. No API call — purely client-side.

### Engine Bridge (`useChallenge` hook)

`apps/web/src/hooks/use-challenge.ts`

```typescript
// Initializes per config.id:
machineRef.current = new ChallengeMachine(config);
validatorRef.current = new ShadowValidator(
  config.availableIngredients ?? [],
  config.expertRecipe?.steps?.map((s) => s.id) ?? [],
  config.stationLayout?.maxCapacity ?? 8
);
```

- Tick interval: 500ms (during SOLVE/VERIFY phases)
- ShadowValidator runs silently — infractions invisible to learner until CONSEQUENCE phase ("Trojan horse" pattern)

### Zustand Challenge Store

`apps/web/src/stores/challenge-store.ts`

| Field                               | Type                         | Notes                                                |
| ----------------------------------- | ---------------------------- | ---------------------------------------------------- |
| `config`                            | `ChallengeConfig \| null`    | Active pack config                                   |
| `phase`                             | `ChallengePhase \| null`     | SETUP → SOLVE/VERIFY → CONSEQUENCE → TEACH → MASTERY |
| `timeRemainingMs`                   | `number`                     | Countdown from config                                |
| `ticketsCompleted` / `ticketsTotal` | `number`                     | Progress counters                                    |
| `infractions`                       | `HiddenInfraction[]`         | Appended silently by ShadowValidator                 |
| `wasteAccumulated`                  | `number`                     | Dollar cost of waste                                 |
| `consequencePayload`                | `ConsequencePayload \| null` | Populated at CONSEQUENCE phase                       |
| `overallGrade`                      | `string \| null`             | Final grade after MASTERY                            |
| `domainScores`                      | `Record<string, number>`     | Per-domain mastery scores                            |

### Kitchen UI Components

| Component        | Path                                    | Purpose                    |
| ---------------- | --------------------------------------- | -------------------------- |
| `RushTimer`      | `components/kitchen/RushTimer.tsx`      | Countdown timer display    |
| `DirtyHandTimer` | `components/kitchen/DirtyHandTimer.tsx` | Handwash timer             |
| `TicketQueue`    | _(imported but not found above)_        | Ticket list                |
| `InventoryBins`  | _(imported but not found above)_        | Ingredient bins            |
| `ReflectionHUD`  | `components/kitchen/ReflectionHUD.tsx`  | CONSEQUENCE/TEACH HUD      |
| `GradeBadge`     | _(imported but not found above)_        | Final grade display        |
| `RecipeCard`     | `components/kitchen/RecipeCard.tsx`     | Recipe reference card      |
| `SafetyAlert`    | `components/kitchen/SafetyAlert.tsx`    | Safety warning overlay     |
| `TempGauge`      | _(imported but not found above)_        | Temperature display        |
| `MasteryRing`    | `components/kitchen/MasteryRing.tsx`    | Circular mastery indicator |

### Phase State Machine

```
null / SETUP → SOLVE ↔ VERIFY → CONSEQUENCE → TEACH → MASTERY
```

`ChallengePhase` and `EventType` imported from `@topshelf/engine`.

---

## Section 4 — Deployment & Ops

### CI/CD

**GitHub Actions** (`.github/workflows/`):

| Workflow                   | Trigger                                                                   | Purpose                                                                                     |
| -------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `ci.yml`                   | push (main, feat/**, fix/**, hotfix/**, copilot/**, claude/\*\*), PR→main | Full validate: lint, typecheck, test. Path-filtered by area (packages, web, content, repo). |
| `ci-parity-playwright.yml` | push, PR                                                                  | Parity + Playwright E2E                                                                     |
| `workflow-lint.yml`        | push                                                                      | Lint workflow YAML files                                                                    |

CI concurrency group: `primary-ci-${{ pr.number || ref }}`, cancel-in-progress.  
Node version: 20.

### Docker (`infrastructure/docker/`)

**`docker-compose.yml`** services:

| Service    | Image                  | Port   | Notes                        |
| ---------- | ---------------------- | ------ | ---------------------------- |
| `api`      | Built from Dockerfile  | `3000` | Requires DB + Redis healthy  |
| `postgres` | `postgres:16-alpine`   | `5432` | pgdata persisted to volume   |
| `redis`    | _(defined, not shown)_ | `6379` | Rate limiter + session cache |

**`Dockerfile`** (multi-stage):

1. `builder`: node:20-alpine, corepack pnpm, full build
2. `production`: node:20-alpine, prune dev deps

API healthcheck: `wget http://localhost:3000/health`.  
Required secrets: `DB_PASSWORD`, `JWT_SECRET`, `SESSION_SECRET` (no defaults, fail-fast).

### PWA Status

**PWA shell shipped** (`339457e` era): `apps/web/public/sw.js` service worker, `manifest.webmanifest`, and offline fallback page added. App is installable on mobile. P1.1 phone installability target is met.

### Monitoring / Observability

`packages/observability/` — structured logging, metrics, tracing primitives.  
No production monitoring config found (no Datadog/Sentry/etc. configs visible).

### Supabase Infrastructure

`infrastructure/supabase/migrations/` — 3 SQL migration files:

1. `001_kitchen_tables.sql` — kitchen table definitions
2. `002_kitchen_seed.sql` — kitchen data seed
3. `003_uncle_julios_seed.sql` — UJ-specific seed

Run separately from Drizzle migrations (`pnpm db:migrate`).

### Agent Coordination State

`.github/state/` (tracked in git):

- `board.md` — shared blackboard (hotspots, agent status)
- `blockers.md` — blocking issues
- `decisions.md` — architectural decisions
- `queue.md` — task queue

### Demo-to-Pilot Gates

`governance/repo/uj-pack-demo-to-pilot-gates.md` and `tools/uj-tracker/tasks.yaml` define the gating criteria and production task tracker for the demo→pilot transition. Current focus: closing demo-to-pilot phase gates.

### Key Scripts

| Script                                                             | Command                                |
| ------------------------------------------------------------------ | -------------------------------------- |
| `pnpm build`                                                       | Full Turbo build                       |
| `pnpm test`                                                        | All tests via Turbo                    |
| `pnpm validate`                                                    | format:check + lint + typecheck + test |
| `pnpm db:migrate`                                                  | Run Drizzle migrations                 |
| `pnpm db:studio`                                                   | Drizzle Studio                         |
| `docker compose -f infrastructure/docker/docker-compose.yml up -d` | Start local infra (Postgres + Redis)   |

---

## Open Issues / Gaps

| #   | Area                          | Finding                                                                                                                                                                           | Impact                                                                 |
| --- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | Auth                          | **No Firebase.** Plan references Firebase — ignore those steps. Custom JWT + Supabase browser client only. Onboarding auth flow stabilized (`339457e` era).                       | Phase 1+ auth work must NOT introduce Firebase.                        |
| 2   | PWA                           | ~~No manifest.json~~ **Resolved.** PWA shell shipped: `sw.js`, `manifest.webmanifest`, offline fallback. Installable on mobile.                                                   | P1.1 phone installability met.                                         |
| 3   | Kitchen packs                 | **Static bundle only.** Packs are imported at build time. Adding a pack requires code change + redeploy.                                                                          | Phase 1 may need a dynamic registry if runtime pack loading is needed. |
| 4   | Teaching pack vs Kitchen pack | **Two formats.** `content_pack_uncle_julios_v1.json` (ContentPackManifest) and `content-packs/kitchen/uj-*.json` (ChallengeConfig) are separate artifacts with different schemas. | Content pack validation CLI targets ContentPackManifest only.          |
| 5   | Supabase dual-stack           | Drizzle/Postgres for API + Supabase client for web = two migration systems. Supabase-first DB config now active (`fdbc4b5`).                                                      | Schema changes may need to be applied in both Drizzle and Supabase.    |
| 6   | Task 0.1.5                    | **User-only task** — run app on phone. Cannot be delegated to agent.                                                                                                              | Must be completed by Patrick before Phase 1 gate closes.               |
| 7   | Demo-to-pilot gates           | P1/P2/P3 feature phases shipped. Current focus: demo-to-pilot gate criteria in `governance/repo/uj-pack-demo-to-pilot-gates.md` and `tools/uj-tracker/tasks.yaml`.                | Gate tasks must pass before production pilot launch.                   |
