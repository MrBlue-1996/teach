---
description: 'Blackboard communication protocol for all specialized agents. Teaches agents to read shared state before working and write updates after completing work.'
applyTo: '.github/agents/**'
lastUpdated: '2026-05-11'
---

# Agent Communication Protocol

This repository uses a blackboard model. Agents must coordinate through shared state files so work remains aligned and auditable.

## Required Read Order Before Work

1. `.github/state/queue.md`
2. `.github/state/board.md`
3. `.github/state/decisions.md`
4. `.github/state/blockers.md`

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

Example:

```markdown
- **[2026-05-11]** `api` `contracts` Completed: Added learner teach endpoint validation and response envelope alignment. Files: `packages/api-server/src/routes/learner.ts`. Downstream: web client should expect `data.teachingResponse`.
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
