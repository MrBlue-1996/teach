# CLAUDE.md

Last updated: 2026-05-26

This file is the primary operating guide for coding agents working in this repository.

## Product Vision

Top Shelf Teaching exists to deliver reliable, adaptive training that works on real low-end devices in real work environments. The product principle is:

**Solve First, Teach Second.**

Agents should optimize for:

- Learner progress over feature novelty
- Stability and correctness over cleverness
- Chromebook-first performance and accessibility
- Cross-package contract integrity in a strict TypeScript monorepo

## Repository Map

Workspace roots in `pnpm-workspace.yaml`:

- `packages/*`
- `apps/*`
- `implementations/*`
- `content-packs`
- `policy`
- `docs`
- `pilot`

`packages/_future/` is out of scope for active work and must not be imported.

## Command Reference

```bash
# install
pnpm install

# full workspace checks
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm validate

# build
pnpm build
pnpm build:packages

# run
pnpm dev
pnpm dev:app

# targeted package commands
pnpm --filter @topshelf/engine test
pnpm --filter @topshelf/api-server test
pnpm --filter @topshelf/web build

# db
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

## Architecture Summary

### Engine

`packages/engine/` is pure TypeScript business logic with no runtime framework coupling.

- `TriggerDetector`: emits triggers from learner context
- `ConstraintEngine`: enforces device and payload constraints
- `PedagogyEngine`: orchestrates trigger + mode + constrained output

### API

`packages/api-server/` (Hono) exposes learner, auth, content, session, policy, and badge routes.

- Middleware order is intentional and should be preserved
- Inputs are validated with Zod
- Auth is route-level via bearer JWT middleware

### Data

`packages/database/` uses Drizzle with PostgreSQL.

- Schema source of truth: `packages/database/src/schema/index.ts`
- Learning/session data includes teaching mode and trigger tracking

### Web

`apps/web/` is Next.js App Router and must remain responsive and usable on Chromebook-class hardware.

## Non-Negotiable Engineering Rules

- Use `pnpm` only
- Keep TypeScript strict (`exactOptionalPropertyTypes` honored)
- Preserve cross-package contracts; update both sides of boundary changes
- Do not add runtime dependencies to `packages/engine`
- Do not weaken tests or type safety to pass CI
- Avoid broad refactors unless explicitly requested

Optional property pattern required in strict contexts:

```ts
return { required, ...(optional ? { optional } : {}) };
```

## Definition Of Done

A task is complete only when all items below are true:

- Requested behavior is implemented end-to-end
- Affected tests are added or updated
- Relevant checks pass (`format`, `lint`, `typecheck`, targeted tests)
- No unrelated files were modified
- Cross-boundary impact is documented if contracts changed

## Multi-Agent Protocol

When working in a multi-agent flow, always use `.github/state/` as the shared source of truth.

Before starting:

- Read `.github/state/board.md`
- Read `.github/state/decisions.md`
- Check `.github/state/blockers.md`

After finishing:

- Append a timestamped update to your section in `.github/state/board.md`
- Add or resolve blockers in `.github/state/blockers.md`
- Record any new architecture decision in `.github/state/decisions.md`

## Hotspot Tags

When tasks include these tags, read these files first:

- `schema`: `packages/database/src/schema/index.ts`
- `types`: `packages/engine/src/types.ts`, `packages/shared/src/types/`
- `api`: `packages/api-server/src/routes/learner.ts`
- `contracts`: API route plus `apps/web/src/lib/api/`
- `config`: `packages/config/src/index.ts`, `.env.example`
- `infra`: `infrastructure/docker/docker-compose.yml`
- `policy`: `governance/policies/promotion_policy_config.json`
- `pedagogy`: `packages/engine/src/pedagogy-engine.ts`

## UI And Brand Requirements

Before UI work in `apps/web/src/`, read:

- `governance/standards/brand/tokens/design-tokens.md`
- `governance/standards/brand/voice/voice-and-tone.md`
- `governance/standards/brand/doctrine/brand-doctrine.md`

Always follow:

- Semantic tokens over raw hex
- Montserrat for heading, Inter for body
- `lucide-react` icons only
- Minimum 44x44 touch targets
- Brand names: "Top Shelf Service LLC™" and "Top Shelf Teaching"

## Local Infrastructure

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

Web app env needs include `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
