---
description: 'Blackboard communication protocol for all specialized agents. Teaches agents to read shared state before working and write updates after completing work.'
applyTo: '.github/agents/**'
lastUpdated: '2026-05-28'
---

# Agent Communication Protocol

This repository uses a blackboard model. Agents must coordinate through shared state files so work remains aligned and auditable.

## Required Read Order Before Work

1. `.github/state/queue.md`
2. `.github/state/board.md`
3. `.github/state/decisions.md`
4. `.github/state/blockers.md`

## Queue Format

Each task entry in `queue.md` uses the following structure:

```markdown
## [TASK-ID] Agent: <agent-name> | Status: pending/in_progress/done/blocked

**Description**: What needs to be done.
**Tags**: schema, api, contracts, etc.
**Blocking**: TASK-ID of any task this must complete before
**Deliverable**: Concrete artifact or behavior that proves the task is done
```

Update the `Status` field in place as work progresses. Do not remove entries — mark them `done`.

## Parallel vs Sequential Execution

Tasks **may run in parallel** when all of the following are true:
- They touch different packages (no shared file writes)
- Neither produces an artifact the other consumes
- They have no declared dependency relationship in `queue.md`

Tasks **must run sequentially** when:
- One task produces a type, schema, or API contract that another task consumes
- Both tasks write to the same package or shared file (e.g., `packages/shared/src/types/`)
- A `Blocking` relationship is declared in `queue.md`

When in doubt, run sequentially and note the dependency in `blockers.md`.

## Required Updates After Work

1. Append a timestamped update under your section in `.github/state/board.md`
2. Add `[OPEN]` blocker entries in `.github/state/blockers.md` if you depend on another agent
3. Mark blockers `[RESOLVED]` when completed
4. Record architecture decisions in `.github/state/decisions.md` when behavior/contract changes are made

## Board Update Standard

Each board entry must include:

- Date
- Tags
- What changed
- Files changed
- What downstream agents must know

Normal completion example:

```markdown
- **[2026-05-11]** `api` `contracts` Completed: Added learner teach endpoint validation and response envelope alignment. Files: `packages/api-server/src/routes/learner.ts`. Downstream: web client should expect `data.teachingResponse`.
```

Blocker scenario example:

```markdown
- **[2026-05-14]** `schema` `contracts` Blocked: Cannot complete session history endpoint — requires new index on `learningSessions(userId, createdAt)`. Filed blocker to db-engineer. No files changed yet. Resuming after DB migration lands.
```

## Blocker Standard

Use this format:

```markdown
## [OPEN] From: api-engineer -> To: db-engineer

**Need**: Add index on `learningSessions(userId, createdAt)`.
**Why**: Endpoint latency regression under session history query.
**Filed**: 2026-05-11
```

When resolved, update header to `[RESOLVED]` and add resolution note.

## Decisions Format

Record all architecture and contract decisions in `decisions.md`:

```markdown
## [DATE] Title

**Decision**: What was decided.
**Rationale**: Why this approach was chosen over alternatives.
**Impact**: Which packages and agents are affected.
**Decided by**: agent name or human
```

Example:

```markdown
## [2026-05-14] Use response envelope for all teach endpoints

**Decision**: All `/api/learner/teach` responses wrap payload in `{ data: ..., meta: ... }`.
**Rationale**: Consistent shape allows the web client to handle errors uniformly.
**Impact**: packages/api-server, apps/web/src/lib/api/
**Decided by**: api-engineer
```

## Rules

- Append only. Never edit or remove another agent's historical entries.
- Keep updates concise and concrete.
- Include explicit file paths for all material changes.
- Resolve blockers proactively before starting dependent work.

## Tags And Hotspots

If a task includes tags, read the corresponding hotspots before coding.

- `schema`: `packages/database/src/schema/index.ts`
- `types`: `packages/engine/src/types.ts`, `packages/shared/src/types/`
- `api`: `packages/api-server/src/routes/learner.ts`
- `contracts`: API route and `apps/web/src/lib/api/`
- `enums`: see taxonomy notes in board
- `config`: `packages/config/src/index.ts`, `.env.example`
- `infra`: `infrastructure/docker/docker-compose.yml`
- `content`: `content-packs/`, `content/web-fundamentals/`
- `policy`: `governance/policies/promotion_policy_config.json`
- `pedagogy`: `packages/engine/src/pedagogy-engine.ts`
- `pwa`: `apps/web/public/sw.js`, `apps/web/public/manifest.json`
