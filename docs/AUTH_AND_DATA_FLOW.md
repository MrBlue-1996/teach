# Auth and Data Flow — TopShelf Teaching

## Objective

Document the current authentication and data-flow boundaries for the TopShelf Teaching repo without changing implementation behavior.

This document exists to prevent accidental architecture drift during demo-readiness work.

## Current Rule

Do not introduce or document a new authentication provider unless the architecture decision is explicit.

Known provider names such as Firebase, Supabase Auth, Clerk, or Auth0 should not be added casually during demo-readiness work.

## Primary Runtime Areas

Authentication, configuration, API, and data behavior are split across these package areas:

```txt
packages/api-server
packages/auth
packages/config
packages/database
packages/shared
apps/web
```

## API Server

The API server package is:

```txt
packages/api-server
```

The API server exposes health/readiness endpoints in:

```txt
packages/api-server/src/index.ts
```

Local health checks:

```bash
curl -i http://localhost:3000/health
curl -i http://localhost:3000/ready
```

Expected local result:

```txt
HTTP/1.1 200 OK
```

## Database Boundary

Database commands are routed through the database package using root package scripts.

Relevant root scripts:

```txt
db:migrate
db:generate
db:push
db:studio
seed
```

The database package path is:

```txt
packages/database
```

Local infrastructure uses Postgres and Redis through Docker Compose.

Start local dependencies:

```bash
docker compose --env-file .env -f infrastructure/docker/docker-compose.yml up -d postgres redis
```

Verify local dependencies:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

Expected containers:

```txt
topshelf-postgres
topshelf-redis
```

## Web Boundary

The web app package is:

```txt
apps/web
```

The web app runs locally at:

```txt
http://localhost:3001
```

The API server runs locally at:

```txt
http://localhost:3000
```

## Environment Boundary

Local environment setup is expected to support:

```txt
API server configuration
Database connection
Redis connection
Web public configuration
Auth/session secrets
```

Do not commit real secrets.

Do not place production credentials in documentation.

Do not place client-private credentials in demo scripts.

## Demo-Readiness Constraints

During demo-readiness work:

- Do not change auth provider strategy.
- Do not replace the API auth flow.
- Do not add a new database provider.
- Do not move schema ownership out of `packages/database`.
- Do not hardcode demo credentials into app source.
- Do not mix reusable engine logic with client-specific content.

## Verification Commands

Run baseline validation:

```bash
pnpm run typecheck
pnpm run test
pnpm run build
```

Run API health checks:

```bash
curl -i http://localhost:3000/health
curl -i http://localhost:3000/ready
```

## Acceptance Criteria

This auth/data-flow boundary is acceptable when:

- Local Postgres is healthy.
- Local Redis is healthy.
- API `/health` returns `200 OK`.
- API `/ready` returns `200 OK`.
- Typecheck passes.
- Tests pass.
- Build passes.
- No new auth provider is introduced.
- No secrets are committed.

## Definition of Done

Auth/data-flow documentation is done when a future developer can identify where API, auth, config, database, web, and local infrastructure responsibilities live without guessing or introducing a new provider.
