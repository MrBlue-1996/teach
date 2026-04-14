# Agent Blackboard

Shared state file for inter-agent communication. Agents READ this before starting and WRITE updates after completing work.

## Hotspots — Critical Integration Boundaries

Files touched by multiple agents. **Always check these before and after changes.**

### Schema & Types (shape of data — changes here ripple everywhere)

<!-- tags: schema, types, contracts -->

| File                                    | Owners          | Consumers                       | Watch For                                                               |
| --------------------------------------- | --------------- | ------------------------------- | ----------------------------------------------------------------------- |
| `packages/database/src/schema/index.ts` | db-engineer     | api-engineer, test-engineer     | Column additions, enum changes, new tables                              |
| `packages/engine/src/types.ts`          | engine-engineer | api-engineer, frontend-engineer | TeachingMode, DeviceProfile, TeachingContext, TeachingResponse shapes   |
| `packages/shared/src/types/`            | any             | all                             | LearnerState, ContentPack, PolicyDecision type changes                  |
| `packages/engine/src/index.ts`          | engine-engineer | api-engineer                    | New/removed exports (PedagogyEngine, TriggerDetector, ConstraintEngine) |

### API Contracts (request/response shapes — frontend and backend must agree)

<!-- tags: api, contracts, routes -->

| File                                        | Owners            | Consumers                           | Watch For                                    |
| ------------------------------------------- | ----------------- | ----------------------------------- | -------------------------------------------- |
| `packages/api-server/src/routes/learner.ts` | api-engineer      | frontend-engineer                   | Endpoint paths, Zod schemas, response shapes |
| `packages/api-server/src/routes/policy.ts`  | api-engineer      | engine-engineer                     | Policy evaluation inputs/outputs             |
| `packages/api-server/src/routes/content.ts` | api-engineer      | frontend-engineer, content-engineer | Pack/block query shapes                      |
| `apps/web/src/lib/api/learner.ts`           | frontend-engineer | —                                   | Must mirror API route contracts              |
| `apps/web/src/lib/api/client.ts`            | frontend-engineer | —                                   | Base URL, auth headers, error handling       |

### Config & Infrastructure (env vars, ports, connection strings)

<!-- tags: config, env, infra -->

| File                                       | Owners         | Consumers                 | Watch For                    |
| ------------------------------------------ | -------------- | ------------------------- | ---------------------------- |
| `packages/config/src/index.ts`             | infra-engineer | api-engineer, db-engineer | New env var references       |
| `.env.example`                             | infra-engineer | all                       | New required variables       |
| `infrastructure/docker/docker-compose.yml` | infra-engineer | all                       | Service ports, volume mounts |

### Content & Policy (teaching behavior)

<!-- tags: content, policy, pedagogy -->

| File                                               | Owners           | Consumers                 | Watch For                      |
| -------------------------------------------------- | ---------------- | ------------------------- | ------------------------------ |
| `governance/policies/promotion_policy_config.json` | engine-engineer  | api-engineer              | Threshold changes, new signals |
| `content-packs/template_content_pack.json`         | content-engineer | db-engineer, api-engineer | Schema structure for seeding   |
| `content/web-fundamentals/manifest.json`           | content-engineer | —                         | Domain scope, topic list       |

### Key Enums (two taxonomies — don't confuse them)

<!-- tags: enums, modes, taxonomy -->

| Enum                                                                                            | Location                                | Values                           | Meaning                                            |
| ----------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------- | -------------------------------------------------- |
| `TeachingMode`                                                                                  | `packages/engine/src/types.ts`          | L0_SILENT..L4_TUTORIAL (int 0-4) | Intervention depth (how much the engine helps)     |
| `learningModeEnum`                                                                              | `packages/database/src/schema/index.ts` | L1_RECALL..L5_EXPERT             | Learner competency level (what the learner can do) |
| These are **orthogonal** — a L5_EXPERT learner might still get L4_TUTORIAL help on new content. |

## Status Board

<!-- Agents: append your status below in your section. Most recent entry first. -->

### db-engineer

_No updates yet._

### api-engineer

_No updates yet._

### engine-engineer

_No updates yet._

### frontend-engineer

- 2026-04-13: Reworked the learn flow in `apps/web/src/app/learn/[courseId]/page.tsx` to use backend session/progress state more directly. The page now boots from `content/next`, starts or recovers a learner session, records `started` and `completed` events, advances to the next block only when the backend supports it, and surfaces support/device/recent-activity context in the UI.
- 2026-04-13: Added the official Sisyphus trace asset at `apps/web/public/brand/topshelf-sisyphus-trace.svg` and used it as a restrained background accent in the learner flow.
- 2026-04-13: Skip-to-next is still not backend-supported. `learner/session/:id/event` accepts `skipped`, but `content/next/:packId` only advances from `blocksCompleted`, so the UI now avoids promising skip progression.

### content-engineer

_No updates yet._

### infra-engineer

**[2026-04-14]** `infra` Completed: Added a self-contained workflow lint path using `scripts/workflow-lint.mjs`, a new `.github/workflows/workflow-lint.yml`, and the `actionlint` WASM package. Also updated `.github/workflows/ci-parity-playwright.yml` to `codecov/codecov-action@v4` for current compatibility. Files changed: `.github/workflows/workflow-lint.yml`, `scripts/workflow-lint.mjs`, `scripts/README.md`, `.github/workflows/ci-parity-playwright.yml`. Other agents should know: `pnpm run workflow:lint` now passes locally without requiring a system `actionlint` binary.

### test-engineer

- **[2026-04-14]** `test` `api` Baseline capture only. Local `pnpm --dir implementations/mcp-server test` passes at 4 files / 25 tests in ~5.2s wall-clock; focused `tests/api.test.ts` passes at 2 tests in ~1.7s. Root `pnpm test` currently fails outside MCP on `@topshelf/policy-engine#build` (`TS5103` in DTS build), so MCP package health and monorepo test health are currently divergent.
- 2026-04-13: Expanded `packages/api-server` learner/policy route coverage around teaching-state lifecycle.
- Added learner session-start assertions for persisted default teaching context and event-ingestion assertions for learner/session state updates, trigger persistence, and non-completion behavior.
- Added policy evaluation assertions for demotion persistence, session-aware evaluation records, and no-op protection when stored teaching state already matches computed state.

### quality-reviewer

- **[2026-04-14]** `schema` `types` Completed: Added dependency drift enforcement with root `deps:drift:check` / `deps:drift:fix` scripts via `@manypkg/cli`, normalized root package metadata, aligned `implementations/mcp-server` `@types/node`, and sorted `packages/cli` dependencies. Files changed: `package.json`, `implementations/mcp-server/package.json`, `packages/cli/package.json`, `pnpm-lock.yaml`. Other agents should know: `pnpm run deps:drift:check` now passes locally.
