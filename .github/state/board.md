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

- **[2026-04-14]** `infra` Completed: Validated workflow lint end-to-end with temporary `actionlint 1.7.12` and updated `.github/workflows/ci-parity-playwright.yml` to `codecov/codecov-action@v4` so the repository's current workflows pass lint. Files changed: `.github/workflows/ci-parity-playwright.yml`, `.github/state/board.md`. Other agents should know: `node scripts/workflow-lint.mjs` now passes against all current workflow files when `actionlint` is available in `PATH`.
- **[2026-04-14]** `infra` Completed: Added dedicated GitHub Actions workflow linting via `.github/workflows/workflow-lint.yml` and a local runner at `scripts/workflow-lint.mjs`; documented the command path in `scripts/README.md`. Files changed: `.github/workflows/workflow-lint.yml`, `scripts/workflow-lint.mjs`, `scripts/README.md`, `.github/state/board.md`. Other agents should know: workflow lint now runs independently of the main CI workflows, targets `.github/workflows/*.yml` and `.yaml`, and can be invoked locally with `node scripts/workflow-lint.mjs` without package.json changes.
- **[2026-04-14]** `infra` Completed:
  - Captured batch 1 CI baseline for `.github/workflows/ci.yml` and `.github/workflows/ci-parity-playwright.yml`.
  - Collected current `main` run status, durations, queue time, and repeated-step hotspots from GitHub Actions.
  - Files changed: `.github/state/board.md`.
  - Other agents should know: current `main` HEAD `4ac3a45409890d02fe27ce280cff63b793722d36` is failing both workflows at the first gate, so this baseline mostly reflects setup/early-failure cost plus queue delay rather than full green-path runtime.

### test-engineer

- **[2026-04-14]** `test` `api` Baseline capture only. Local `pnpm --dir implementations/mcp-server test` passes at 4 files / 25 tests in ~5.2s wall-clock; focused `tests/api.test.ts` passes at 2 tests in ~1.7s. Root `pnpm test` currently fails outside MCP on `@topshelf/policy-engine#build` (`TS5103` in DTS build), so MCP package health and monorepo test health are currently divergent.
- 2026-04-13: Expanded `packages/api-server` learner/policy route coverage around teaching-state lifecycle.
- Added learner session-start assertions for persisted default teaching context and event-ingestion assertions for learner/session state updates, trigger persistence, and non-completion behavior.
- Added policy evaluation assertions for demotion persistence, session-aware evaluation records, and no-op protection when stored teaching state already matches computed state.

### quality-reviewer

- **[2026-04-14]** Completed: Added local dependency drift enforcement via root `deps:drift:check` and `deps:drift:fix` scripts backed by `@manypkg/cli`; normalized current manifest drift in `package.json`, `implementations/mcp-server/package.json`, `packages/cli/package.json`, and `pnpm-lock.yaml`. Other agents should know: `pnpm run deps:drift:check` passes locally.

- 2026-04-14: Batch 1 baseline captured. pnpm lint failed at /policy-engine#build and pnpm typecheck failed at /policy-engine#typecheck, both due to packages/_future/policy-engine/tsconfig.json using ignoreDeprecations: "6.0" (TS5103). pnpm build:packages passed locally. pnpm audit --audit-level=high reported 4 high vulnerabilities (next x2 on apps/web, nodemailer in packages/email, drizzle-orm via packages/database). Local Turbo runs reported remote caching disabled.
