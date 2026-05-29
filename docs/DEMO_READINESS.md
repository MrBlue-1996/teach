# Demo Readiness — TopShelf Teaching

## Objective

Document the verified local demo path for the TopShelf Teaching repo using only facts discovered from the current repository state.

This document is for local readiness, demo rehearsal, and future handoff. It does not claim that every route is production-ready.

## Verified Local Baseline

The following baseline has been verified locally:

- Repository path: `/home/patrick/projects/teach`
- Git remote: `https://github.com/peteywee/teach.git`
- Working branch: `chore/demo-readiness-roadmap`
- pnpm version: `10.33.3`
- `pnpm install --frozen-lockfile` succeeds.
- `pnpm run typecheck` succeeds.
- `pnpm run test` succeeds.
- `pnpm run build` succeeds.
- Postgres container is healthy.
- Redis container is healthy.
- API `/health` returns `200 OK`.
- API `/ready` returns `200 OK`.
- Browser URLs were manually checked and load.

## Local Setup

Run from the repository root:

```bash
cd ~/projects/teach
corepack prepare pnpm@10.33.3 --activate
pnpm install --frozen-lockfile
```

## Local Infrastructure

Start the local database and cache dependencies:

```bash
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml up -d postgres redis
```

Check containers:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

Expected containers:

```txt
topshelf-postgres
topshelf-redis
```

## Start the Local App

The primary local app command is:

```bash
pnpm run dev:app
```

This runs the web app and API server through Turbo using these package filters:

```txt
@topshelf/web
@topshelf/api-server
```

The hybrid convenience command is:

```bash
pnpm run dev:app:hybrid
```

That command switches environment mode, starts Postgres and Redis, then starts the app.

## Expected Local Services

```txt
API: http://localhost:3000
Web: http://localhost:3001
```

## API Verification

Run:

```bash
curl -i http://localhost:3000/health
curl -i http://localhost:3000/ready
```

Expected result for both:

```txt
HTTP/1.1 200 OK
```

Expected `/health` behavior:

- Returns `status: healthy`.
- Includes app version.
- Includes environment.
- Includes database health status.

Expected `/ready` behavior:

- Returns ready status when the database check passes.

## Discovered App Routes

The following app route files exist in `apps/web/src/app`:

```txt
/
/achievements
/admin/content-editor
/admin/users
/analytics
/content
/content/[id]
/dashboard
/ingredients
/instructor
/learn/[courseId]
/library
/machines
/manager
/notifications
/onboarding
/profile
/settings
/tools
/contact
/privacy
/support
/terms
/auth/forgot-password
/auth/login
/auth/oauth-complete
/auth/reset-password
/auth/signup
/auth/verify-email
/kitchen
/kitchen/challenges/[slug]
/kitchen/mastery
/kitchen/preview
/kitchen/qr-validate
/kitchen/recipes
/offline
```

Note: route groups such as `(app)` and `(legal)` are Next.js organizational groups and are not literal URL path segments.

## Core Browser Checks

Minimum browser checks:

```txt
http://localhost:3001
http://localhost:3001/kitchen
```

Kitchen feature checks:

```txt
http://localhost:3001/kitchen/mastery
http://localhost:3001/kitchen/preview
http://localhost:3001/kitchen/qr-validate
http://localhost:3001/kitchen/recipes
```

Authentication, legal, and support checks:

```txt
http://localhost:3001/auth/login
http://localhost:3001/auth/signup
http://localhost:3001/auth/forgot-password
http://localhost:3001/auth/reset-password
http://localhost:3001/auth/verify-email
http://localhost:3001/auth/oauth-complete
http://localhost:3001/contact
http://localhost:3001/privacy
http://localhost:3001/support
http://localhost:3001/terms
```

## Registered Kitchen Challenge Packs

The kitchen challenge registry is:

```txt
apps/web/src/lib/kitchen-packs.ts
```

The registry statically imports and registers these slugs:

```txt
ghost-recipe
hazard-scan
inventory-scramble
labor-prep
mock-impossible
rush-hour
station-setup
temp-check
uj-fajita-rush
uj-enchilada-rush
uj-line-temps
uj-grill-setup
uj-queso-scale
uj-allergy-order
```

## Kitchen Challenge URLs

The route pattern is:

```txt
/kitchen/challenges/[slug]
```

Registered generic kitchen challenge URLs:

```txt
http://localhost:3001/kitchen/challenges/ghost-recipe
http://localhost:3001/kitchen/challenges/hazard-scan
http://localhost:3001/kitchen/challenges/inventory-scramble
http://localhost:3001/kitchen/challenges/labor-prep
http://localhost:3001/kitchen/challenges/mock-impossible
http://localhost:3001/kitchen/challenges/rush-hour
http://localhost:3001/kitchen/challenges/station-setup
http://localhost:3001/kitchen/challenges/temp-check
```

Registered Uncle Julio's kitchen challenge URLs:

```txt
http://localhost:3001/kitchen/challenges/uj-fajita-rush
http://localhost:3001/kitchen/challenges/uj-enchilada-rush
http://localhost:3001/kitchen/challenges/uj-line-temps
http://localhost:3001/kitchen/challenges/uj-grill-setup
http://localhost:3001/kitchen/challenges/uj-queso-scale
http://localhost:3001/kitchen/challenges/uj-allergy-order
```

A kitchen challenge route is considered locally verified only when:

- The page loads.
- It is not a 404.
- It is not a blank screen.
- The challenge title or content appears.
- The browser console does not show a blocking runtime error.
- The challenge flow can begin.

## Content Pack Files

Top-level teaching content packs:

```txt
content-packs/content_pack_linux_v1.json
content-packs/content_pack_networkplus_v1.json
content-packs/content_pack_uncle_julios_v1.json
content-packs/content_pack_web-fundamentals_v1.json
```

Kitchen challenge content packs:

```txt
content-packs/kitchen/ghost-recipe.json
content-packs/kitchen/hazard-scan.json
content-packs/kitchen/inventory-scramble.json
content-packs/kitchen/labor-prep.json
content-packs/kitchen/mock-impossible.json
content-packs/kitchen/rush-hour.json
content-packs/kitchen/station-setup.json
content-packs/kitchen/temp-check.json
content-packs/kitchen/uj-allergy-order.json
content-packs/kitchen/uj-enchilada-rush.json
content-packs/kitchen/uj-fajita-rush.json
content-packs/kitchen/uj-grill-setup.json
content-packs/kitchen/uj-line-temps.json
content-packs/kitchen/uj-queso-scale.json
```

Resource packs:

```txt
content-packs/resource-packs/linux.json
content-packs/resource-packs/uncle-julios.json
```

Template:

```txt
content-packs/template_content_pack.json
```

## Verification Commands

Baseline verification:

```bash
pnpm run typecheck
pnpm run test
pnpm run build
```

Full local validation:

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run validate:content-packs
pnpm run package:uncle-julios
```

Available repo scripts relevant to demo readiness:

```txt
dev:app
dev:app:hybrid
validate
validate:content-packs
checksum:uncle-julios
package:uncle-julios
demo:ops:check
verify:local
track:status
track:next
track:check
track:sanity
```

## Engine/Fuel Boundary

Engine means reusable platform logic:

```txt
apps/web
packages/engine
packages/api-server
packages/shared
packages/database
packages/auth
packages/config
packages/content-authoring
```

Fuel means authored content, challenge configuration, resource packs, and pilot/demo data:

```txt
content
content-packs
pilot
```

Governance means standards, policy, legal, docs, repo rules, and agent/project controls:

```txt
docs
governance
policy
.github
```

Infrastructure means runtime and deployment support:

```txt
infrastructure
scripts
Dockerfile
docker-compose.yml
```

## Demo Acceptance Criteria

The local demo is acceptable when:

- Dependencies install from the lockfile.
- Typecheck passes.
- Tests pass.
- Build passes.
- Postgres is healthy.
- Redis is healthy.
- API `/health` returns `200 OK`.
- API `/ready` returns `200 OK`.
- Web app loads at `http://localhost:3001`.
- Kitchen route loads.
- At least one registered kitchen challenge route loads.
- At least one registered Uncle Julio's kitchen challenge route loads.
- The engine/fuel boundary can be explained clearly.

## Known Risks

- Public repository visibility may conflict with proprietary or client-specific content.
- Not every discovered filesystem route should be treated as demo-ready.
- Not every content pack file is necessarily registered as a browser route.
- Route groups like `(app)` and `(legal)` are not literal URL paths.
- Reusable engine logic and client-specific fuel must stay separated.
- Docker builds should use the pinned pnpm version rather than `pnpm@latest`.
- Auth/data architecture should not be changed casually during demo-readiness work.

## Definition of Done

The repo is demo-ready when a fresh clone can install dependencies, run local verification, start Postgres and Redis, start the web/API app, return healthy API responses, load the kitchen surface, load at least one registered Uncle Julio's challenge, and explain the engine/fuel model without undocumented manual fixes.
