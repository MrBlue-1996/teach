# TopShelf Demo Operations Runbook

Last updated: 2026-05-26

## Purpose

This runbook is the operating checklist for demo readiness. It covers the current v0.1.x path: a Next.js web app deployed first on Vercel, an API backed by Postgres and Redis, static-bundled Uncle Julio's kitchen content, and tracker gates that keep pilot work honest.

Do not use this runbook to imply Sun Holdings or Uncle Julio's authorization. Authorization is pending and recorded in `docs/decisions/sun-holdings-auth-decision.md`.

## Current Operating Model

- Web app: `apps/web`, first production hosting target is Vercel.
- API: `@topshelf/api-server`, default local URL `http://localhost:3000/api/v1`.
- Database: Postgres, default local port `5432`.
- Cache/rate limiter: Redis, default local port `6379`; API fails open for rate limiting if Redis is unavailable.
- Content: kitchen challenge packs remain static-bundled for v0.1.x.
- Tracker: `tools/uj-tracker/tasks.yaml` is the demo-roadmap source of truth.

## Demo Readiness Gate

Run this before calling a demo build ready:

```bash
pnpm run demo:ops:check
pnpm run validate:content-packs
pnpm --filter @topshelf/web run build
pnpm run test:e2e
```

For a deeper repo gate, run:

```bash
pnpm bootstrap
```

The bootstrap writes reports to `.bootstrap/latest.json` and `.bootstrap/latest.txt`.

## Local Startup

1. Copy `.env.example` to `.env` and fill secrets locally. Never commit `.env`.
2. Start local infrastructure:

   ```bash
   pnpm run docker:up
   ```

3. Run migrations and seed data if the database is new:

   ```bash
   pnpm run db:migrate
   pnpm run seed
   ```

4. Start the app/API development path:

   ```bash
   pnpm run dev:app
   ```

5. Confirm the API health endpoint:

   ```bash
   curl http://localhost:3000/health
   ```

6. Shut down local infrastructure when done:

   ```bash
   pnpm run docker:down
   ```

## Required Demo Environment

Set these explicitly for any shared demo environment:

- `NODE_ENV=production`
- `API_HOST`
- `API_PORT`
- `API_BASE_PATH`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_SSL`
- `REDIS_HOST`
- `REDIS_PORT`
- `JWT_SECRET`
- `SESSION_SECRET`
- `ALLOWED_ORIGINS`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Secrets must live in the deployment platform or local `.env`; they must not appear in docs, commits, screenshots, or tracker notes.

## Vercel Web Deploy Checklist

1. Confirm `docs/decisions/hosting-decision.md` still applies.
2. Set `NEXT_PUBLIC_API_URL` to the intended API base URL.
3. Set Supabase public browser variables only. Do not put server secrets in `NEXT_PUBLIC_*`.
4. Build locally:

   ```bash
   pnpm --filter @topshelf/web run build
   ```

5. Deploy through Vercel preview first.
6. Smoke test login, kitchen home, block detail, challenge interaction, refresh, and mobile viewport.
7. Promote only after the preview passes the demo readiness gate.

## Content Release Checklist

Kitchen demo content is static-bundled. A pack change requires validation and redeploy.

```bash
pnpm run validate:content-packs
pnpm run package:uncle-julios
pnpm run checksum:uncle-julios
pnpm run test:e2e
```

Do not mix teaching `ContentPackManifest` files with kitchen `ChallengeConfig` packs.

## Tracker Operations

Useful tracker commands:

```bash
pnpm run track:status:md
pnpm run track:next
pnpm run track:check X3
pnpm run track:check P5
pnpm run track:sanity
```

Gate meanings:

- `X3` is the Sun Holdings / Uncle Julio's authorization conversation. It is not complete until the decision memo records a real approval, denial, or explicit non-UJ demo scope.
- `P5.5.2` is satisfied when this runbook exists and covers major failure modes.
- Manual gates still require Patrick or the responsible owner to confirm real-world outcomes.

## Major Failure Modes

### Web App Down

- Check the latest Vercel deployment and rollback to the last known-good deployment if the failure is user-visible.
- Confirm `NEXT_PUBLIC_API_URL` points at the live API.
- Run `pnpm --filter @topshelf/web run build` locally to separate build failure from deployment failure.

### API Down

- Check `/health`.
- Confirm `API_PORT`, `API_BASE_PATH`, `DB_*`, `REDIS_*`, `JWT_SECRET`, and `SESSION_SECRET`.
- For Docker, inspect `topshelf-api` logs and service health:

  ```bash
  docker compose -f infrastructure/docker/docker-compose.yml ps
  docker logs topshelf-api
  ```

### Database Unavailable

- Confirm Postgres health:

  ```bash
  docker compose -f infrastructure/docker/docker-compose.yml ps postgres
  ```

- Confirm credentials match `.env`.
- If data was changed during a demo, stop and preserve logs before attempting repair.
- For production, restore only from a verified backup and record the restore point.

### Redis Unavailable

- Confirm Redis health:

  ```bash
  docker compose -f infrastructure/docker/docker-compose.yml ps redis
  ```

- API rate limiting should fail open, so the app may continue serving traffic.
- Restore Redis before any broader demo or load test.

### Auth Or Session Failures

- Confirm `JWT_SECRET`, `SESSION_SECRET`, token lifetimes, and `ALLOWED_ORIGINS`.
- Test sign up, logout, login, refresh, and protected API calls.
- Treat repeated session failures as a demo blocker until reproduced and fixed.

### Content Pack Failure

- Run `pnpm run validate:content-packs`.
- Run `pnpm run package:uncle-julios`.
- Confirm displayed kitchen cards still map to real static packs.
- Roll back the content change if validation fails close to demo time.

### PWA Or Mobile Failure

- Test on the actual target phone or Chromebook-class device.
- Confirm installability, refresh behavior, app shell fallback, and tap targets.
- Record manual device results in the tracker or board. Simulator-only checks do not close the real-device gate.

### CI Or Gate Failure

- Run `pnpm run workflow:lint` for workflow syntax.
- Run `pnpm run format:check` before deeper checks.
- Use `pnpm bootstrap` when multiple failures need one report.
- Do not mark a tracker task `done` while its automated gate fails.

### Unauthorized External Pilot Risk

- Stop. Do not onboard real cooks, managers, stores, or Sun Holdings/Uncle Julio's data.
- Read `docs/decisions/sun-holdings-auth-decision.md`.
- Continue only with internal demo data unless explicit authorization and consent are recorded.

## Backup Verification

`P5.5.1` remains manual until a production backup provider and restore target are chosen. Minimum proof before pilot:

1. Create a backup from the intended production database.
2. Restore it into an isolated environment.
3. Run migrations or compatibility checks as needed.
4. Start the API against the restored database.
5. Smoke test login and learner progress reads.
6. Record date, operator, source backup, restore target, and result.

## Incident Notes

For incidents during demo prep, record:

- Date and owner
- Environment
- User-visible symptom
- Commands run
- Rollback or fix applied
- Follow-up gate that prevents recurrence

Use `.github/state/blockers.md` for cross-agent blockers and `.github/state/board.md` for concise completion notes.
