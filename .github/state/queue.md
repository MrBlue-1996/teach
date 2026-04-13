# Work Queue

Tracks batch execution progress. The coordinator updates this; agents check their assignments.

**Tag legend**: `schema` = DB schema change, `types` = type/interface change, `api` = API contract, `contracts` = cross-boundary agreement, `enums` = enum taxonomy, `config` = env/config, `infra` = infrastructure, `content` = content data, `policy` = promotion/pedagogy rules, `pedagogy` = teaching logic

## Current Batch: 1 — Foundation

| Task | Agent | Status | Tags | Notes |
|------|-------|--------|------|-------|
| Generate DB migration for teaching columns | db-engineer | not-started | `schema` `enums` | Touches: `packages/database/src/schema/index.ts` |
| Create content seed script | db-engineer | not-started | `content` `schema` | Reads: `content-packs/*.json`, writes: `scripts/migration/` |
| Port unit tests from MCP server | engine-engineer | not-started | `types` `pedagogy` | From: `implementations/mcp-server/tests/` → `packages/engine/` |
| Add promotion policy logic | engine-engineer | not-started | `policy` `enums` | Reads: `governance/policies/promotion_policy_config.json` |
| Create .env with real defaults | infra-engineer | not-started | `config` `env` | Touches: `.env`, `.env.example` |
| Set up Docker Compose (Postgres + API + web) | infra-engineer | not-started | `infra` `config` | Touches: `infrastructure/docker/docker-compose.yml` |

## Batch 2 — Integration (blocked on Batch 1)

| Task | Agent | Status | Tags | Notes |
|------|-------|--------|------|-------|
| Wire teach endpoint end-to-end | api-engineer | not-started | `api` `contracts` `schema` | Needs: DB migration done. Touches: `routes/learner.ts` |
| Implement session lifecycle | api-engineer | not-started | `api` `schema` | pause/resume/abandon in `routes/session.ts` |
| Author web-fundamentals blocks | content-engineer | not-started | `content` | Writes to: `content/web-fundamentals/` |
| Validate content pack schema | content-engineer | not-started | `content` `types` | Touches: `packages/content-authoring/` |
| Wire dashboard to real data | frontend-engineer | not-started | `api` `contracts` | Needs: API endpoints done. Reads: `lib/api/learner.ts` |
| Build content browse page | frontend-engineer | not-started | `api` `content` | Needs: content seeded. Reads: `lib/api/content.ts` |
| Add auth guards | frontend-engineer | not-started | `config` `env` | Touches: `apps/web/src/` auth middleware |

## Batch 3 — Polish (blocked on Batch 2)

| Task | Agent | Status | Tags | Notes |
|------|-------|--------|------|-------|
| Settings page (mode preferences) | frontend-engineer | not-started | `enums` `api` | Must use TeachingMode L0-L4, not learningModeEnum |
| Achievements page | frontend-engineer | not-started | `api` | Reads: badge API routes |
| Admin dashboard queries | api-engineer | not-started | `schema` `api` | Reads: all tables for aggregates |
| Multi-signal promotion policy | engine-engineer | not-started | `policy` `types` | Reads: `promotion_policy_config.json` |
| Probation logic | engine-engineer | not-started | `policy` `schema` | Uses: `inProbation`, `probationStartedAt` columns |

## Batch 4 — Verification (blocked on Batch 3)

| Task | Agent | Status | Tags | Notes |
|------|-------|--------|------|-------|
| Add tests for all new code | test-engineer | not-started | `all` | Read board.md to see everything that changed |
| Full quality audit | quality-reviewer | not-started | `all` | Read board.md hotspots section for boundaries |
