---
description: 'Orchestrate parallel development batches across specialized agents. Use when running multiple development tasks simultaneously, coordinating cross-team work, or executing a phase of the development plan.'
---

# Batch Orchestrator

Coordinates parallel work across the specialized agent teams for the TopShelf development plan.

## Communication: Blackboard Architecture

Agents communicate through shared state files in `.github/state/`:

```
.github/state/
├── board.md      ← Status updates (each agent appends to their section)
├── queue.md      ← Task assignments + batch progress (coordinator manages)
├── blockers.md   ← Cross-agent dependency requests ([OPEN] → [RESOLVED])
└── decisions.md  ← Architectural decisions all agents must follow
```

**Flow:**

```
Coordinator reads board.md + queue.md + blockers.md
    ├─→ dispatches @db-engineer (includes context from board.md)
    │       └─→ db-engineer reads board.md, does work, writes update to board.md
    ├─→ dispatches @engine-engineer (includes context from board.md)
    │       └─→ engine-engineer reads board.md, does work, writes update to board.md
    └─→ dispatches @infra-engineer (includes context from board.md)
            └─→ infra-engineer reads board.md, does work, writes update to board.md

Coordinator reads updated board.md, resolves blockers, advances to next batch
```

**To use:** Invoke `@coordinator` and tell it which batch to run, or ask it to assess current state and continue.

## Agent Teams

### Team 1: Platform (can run in parallel — no file conflicts)

| Agent             | Domain                          | Packages                                   |
| ----------------- | ------------------------------- | ------------------------------------------ |
| `db-engineer`     | Schema, migrations, seeding     | `packages/database/`, `scripts/migration/` |
| `api-engineer`    | Routes, middleware, auth        | `packages/api-server/`, `packages/auth/`   |
| `engine-engineer` | Pedagogy, triggers, constraints | `packages/engine/`, `governance/policies/` |

### Team 2: Surfaces (can run in parallel — no file conflicts)

| Agent               | Domain                         | Packages                                                    |
| ------------------- | ------------------------------ | ----------------------------------------------------------- |
| `frontend-engineer` | Pages, components, API clients | `apps/web/src/`                                             |
| `content-engineer`  | Blocks, packs, validation      | `content/`, `content-packs/`, `packages/content-authoring/` |
| `infra-engineer`    | Docker, CI, scripts            | `infrastructure/`, `.github/workflows/`, `scripts/`         |

### Team 3: Quality (runs after Teams 1 & 2)

| Agent              | Domain                | Scope           |
| ------------------ | --------------------- | --------------- |
| `test-engineer`    | Test coverage         | All test files  |
| `quality-reviewer` | Lint, types, security | Read-only audit |

## Execution Batches

### Batch 1: Foundation (parallel)

Run these simultaneously — they touch non-overlapping files:

1. **db-engineer**: Generate migration for teaching context columns, create content seed script
2. **engine-engineer**: Port unit tests from MCP server, add promotion policy logic
3. **infra-engineer**: Set up `.env.example`, Docker Compose with Postgres + API + web

### Batch 2: Integration (parallel after Batch 1)

Run these simultaneously — depends on Batch 1 outputs:

1. **api-engineer**: Wire engine into teach endpoint, implement session lifecycle, add event recording
2. **content-engineer**: Author web-fundamentals blocks, validate pack structure
3. **frontend-engineer**: Wire dashboard to real data, build content browser, add auth guards

### Batch 3: Polish (parallel after Batch 2)

1. **frontend-engineer**: Settings page with mode preferences, achievements page
2. **api-engineer**: Admin dashboard queries, badge issuance flow
3. **engine-engineer**: Multi-signal promotion from governance config, probation logic

### Batch 4: Verification (sequential after Batch 3)

1. **test-engineer**: Add tests for all new code from Batches 1-3
2. **quality-reviewer**: Full audit — types, lint, security, deps

## Usage

### Option A: Use the Coordinator Agent (recommended)

The `@coordinator` agent automates the loop — it reads the blackboard, dispatches agents, updates state, and resolves blockers.

```
@coordinator Run Batch 1
@coordinator Check progress and resolve any blockers
@coordinator Advance to the next batch
```

### Option B: Manual Dispatch

Invoke agents directly and manage the blackboard yourself:

```
@db-engineer Generate a Drizzle migration for the current schema and create a seed script for content_pack_linux_v1.json. Read .github/state/board.md first for context, and update your section when done.

@engine-engineer Port all unit tests from implementations/mcp-server/tests/ to packages/engine/. Read .github/state/board.md first, update when done.

@infra-engineer Create .env with all required vars and update docker-compose.yml. Read .github/state/board.md first, update when done.
```

## Parallelization Rules

- Agents within the same batch can run in parallel (non-overlapping file ownership)
- Batches must run sequentially (each depends on prior batch outputs)
- Team 3 agents always run last as a quality gate
- If an agent reports a blocker, pause that agent's batch and resolve before continuing
