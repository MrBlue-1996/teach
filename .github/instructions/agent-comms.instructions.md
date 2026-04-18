---
description: 'Blackboard communication protocol for all specialized agents. Teaches agents to read shared state before working and write updates after completing work.'
applyTo: '.github/agents/**'
---

# Agent Communication Protocol

You participate in a **blackboard architecture** for inter-agent coordination. Before starting work and after finishing, you interact with shared state files.

## Before Starting Work

1. **Read the board**: `.github/state/board.md` — check what other agents have done that affects your task
2. **Read decisions**: `.github/state/decisions.md` — check for architectural decisions you must follow
3. **Check blockers**: `.github/state/blockers.md` — see if anyone needs something from you

## After Completing Work

1. **Update your section** in `.github/state/board.md` — append a timestamped entry under your heading:

   ```markdown
   ### your-agent-name

   - **[2026-04-13]** Completed: <what you did>. Files changed: <list>. Other agents should know: <key details>.
   ```

2. **If you need something from another agent**, add to `.github/state/blockers.md`:

   ```markdown
   ## [OPEN] From: your-name → To: target-agent

   **Need**: <specific thing>
   **Why**: <what's blocked>
   **Filed**: 2026-04-13
   ```

3. **If you made an architectural decision**, add to `.github/state/decisions.md`:

   ```markdown
   ## Decision: <title>

   **Date**: 2026-04-13
   **By**: your-name
   **Decision**: <what>
   **Reason**: <why>
   **Affects**: <which agents>
   ```

## Rules

- NEVER delete or overwrite another agent's entries — only append
- Keep updates concise — other agents need to scan quickly
- Include file paths in updates so other agents know where to look
- If a blocker targets you, resolve it and mark it `[RESOLVED]`

## Tags & Hotspots

Tasks in `queue.md` are tagged with metadata indicating which integration boundaries they touch:

| Tag         | Meaning                   | Must-read files                                                 |
| ----------- | ------------------------- | --------------------------------------------------------------- |
| `schema`    | Database schema change    | `packages/database/src/schema/index.ts`                         |
| `types`     | Type/interface change     | `packages/engine/src/types.ts`, `packages/shared/src/types/`    |
| `api`       | API endpoint/contract     | `packages/api-server/src/routes/learner.ts`                     |
| `contracts` | Cross-boundary agreement  | Both the API route AND the web client (`apps/web/src/lib/api/`) |
| `enums`     | Enum taxonomy change      | See board.md "Key Enums" — two separate taxonomies exist        |
| `config`    | Environment/config change | `packages/config/src/index.ts`, `.env.example`                  |
| `infra`     | Infrastructure change     | `infrastructure/docker/docker-compose.yml`                      |
| `content`   | Content data change       | `content-packs/`, `content/web-fundamentals/`                   |
| `policy`    | Promotion/pedagogy rules  | `governance/policies/promotion_policy_config.json`              |
| `pedagogy`  | Teaching logic change     | `packages/engine/src/pedagogy-engine.ts`                        |

**When your task has a tag, you MUST read the hotspot files for that tag in `board.md` before making changes.**

When writing your board update, include which tags your changes affect:

```markdown
- **[2026-04-13]** `schema` `types` Completed: Added triggersFired column. Files: `schema/index.ts`. Other agents: new JSONB column, use `TriggerType[]` shape.
```
