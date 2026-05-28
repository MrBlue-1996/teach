# CLAUDE.md

Last updated: 2026-05-28

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

Active tooling lives in `tools/` (not a workspace package): `tools/uj-tracker/` is the production user-journey tracker driven by `tasks.yaml`.

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

PWA shell has shipped: `apps/web/public/sw.js` (service worker), `apps/web/public/manifest.json`, and an offline fallback page are present. Do not remove or overwrite these files without updating the PWA skill.

## Skills

VS Code Copilot skills live in `.vscode/` or `.github/` and are invoked by the chat agent for specialized tasks. The full skill registry is in `skills-lock.json` at the repo root.

When a task touches one of the following domains, invoke the corresponding skill rather than working from scratch:

| Skill | When to use |
| ----- | ----------- |
| `supabase` | Any Supabase, database, or auth work |
| `top-shelf-ui` | UI authoring in `apps/web/src/` |
| `pwa-validation` | PWA, service worker, or offline validation |
| `topshelf-content-pack-authoring` | Content pack JSON authoring or validation |
| `stimulus-renderer-integration` | Wiring stimulus renderers into surfaces |
| `spaced-retrieval-scheduler` | Retention queue or spaced-review work |
| `trigger-engine-implementation` | Trigger detection and mode elevation work |
| `worked-example-fading` | Novice teaching mode and expertise reversal |

## Non-Negotiable Engineering Rules

- Use `pnpm` only
- Keep TypeScript strict (`exactOptionalPropertyTypes` honored)
- Preserve cross-package contracts; update both sides of boundary changes
- Do not add runtime dependencies to `packages/engine`
- Do not weaken tests or type safety to pass CI
- Avoid broad refactors unless explicitly requested
- Never use `any` — use `unknown` and narrow, or define the missing type
- All new cross-package types go in `packages/shared/src/types/`
- Import from package roots only: `@topshelf/engine`, not `@topshelf/engine/src/...`
- All source files must include the copyright header (see below)

Optional property pattern required in strict contexts:

```ts
return { required, ...(optional ? { optional } : {}) };
```

## Cross-Package Contract Rules

- When changing a type in `packages/shared/`, update all consumers in the same commit
- When changing a DB schema, coordinate with `api-server` typecheck to ensure Drizzle-inferred types remain consistent
- Never import from `packages/_future/` — this directory is out of scope for all active work
- When adding a new package, add it to `pnpm-workspace.yaml` and update `turbo.json` pipeline entries so it participates in the build graph

## Definition Of Done

A task is complete only when all items below are true:

- Requested behavior is implemented end-to-end
- Affected tests are added or updated
- Relevant checks pass (`format`, `lint`, `typecheck`, targeted tests)
- No unrelated files were modified
- Cross-boundary impact is documented if contracts changed

## Multi-Agent Protocol

When working in a multi-agent flow, always use `.github/state/` as the shared source of truth.

Each specialized agent has an individual scope guide in `.github/agents/` (e.g., `api-engineer.agent.md`, `frontend-engineer.agent.md`). Read your agent's scope guide before starting work.

### State File Locations

| File | Purpose |
| ---- | ------- |
| `.github/state/board.md` | Per-agent work status and timestamped progress updates |
| `.github/state/queue.md` | Pending tasks and dispatch queue |
| `.github/state/decisions.md` | Architecture decisions with rationale |
| `.github/state/blockers.md` | Active blockers and their resolution status |

### Before Starting

- Read `.github/state/board.md`
- Read `.github/state/queue.md`
- Read `.github/state/decisions.md`
- Check `.github/state/blockers.md`

### After Finishing

- Append a timestamped update to your section in `.github/state/board.md`
- Add or resolve blockers in `.github/state/blockers.md`
- Record any new architecture decision in `.github/state/decisions.md`

### Parallel vs Sequential

Agents can run in parallel when they own different packages and have no shared file writes. Agents that touch the same file (e.g., a shared type file or a state file) must coordinate sequentially or via the queue.

### Conflict Rule

Never overwrite another agent's board entry. All writes to `.github/state/board.md` are **append-only**. Use your agent name as a section header.

### Decisions Format

```
## [DATE] Title
Decision: ...
Rationale: ...
Impact: ...
Decided by: ...
```

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
- `pwa`: `apps/web/public/sw.js`, `apps/web/public/manifest.json`

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

## Local Development

```bash
# Check what's changed
pnpm format:check

# Fix formatting
pnpm format

# Individual package type check
pnpm --filter @topshelf/<name> typecheck

# Run a single test file
pnpm --filter @topshelf/<name> test -- path/to/file.test.ts
```

## Git Conventions

- Use Conventional Commits: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`
- One logical change per commit
- Branch naming: `<agent>/<short-description>` (e.g., `frontend-engineer/add-learn-page`)
- Always include the co-authored-by trailer on agent commits:

```
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

## Copyright Header

All source files must include:

```typescript
/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */
```
