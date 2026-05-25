# Agent Progress Tracker

Last updated: 2026-05-25

This tracks implementation progress against the local `.agents/skills/**/SKILL.md` contracts and eval files. Status is based on code inspection, targeted tests, and parallel agent review.

Legend:

- `[x]` Done
- `[~]` Partial
- `[ ]` Missing / next

## Image Stimulus Asset Pipeline

Skill: `.agents/skills/image-stimulus-asset-pipeline/SKILL.md`

- [x] `image` stimulus type exists in web local types and shared schema.
- [x] `ImageStimulus` renderer exists and is routed through `StimulusRenderer`.
- [x] Learn page parser accepts `kind: "image"`.
- [x] Kitchen image manifest exists with 35 entries matching placeholder/demo assets.
- [x] Demo SVGs exist for all manifest entries.
- [x] Manifest schema exists and validates seeded entries.
- [x] Content validator catches missing image manifest references.
- [x] Content validator blocks release packs that reference non-authorized images.
- [x] Renderer tests cover alt text, demo badge, missing-asset fallback, and focus regions.
- [~] Renderer uses a plain `<img>` rather than the skill's requested Next `<Image>`.
- [~] Demo recipe SVGs are 16:9, while the skill notes 4:3 for recipes.
- [ ] Add at least one authored `kind: "image"` teaching-block stimulus to prove the full content path.
- [ ] Add functional eval tasks beyond trigger/anti-trigger checks.

Evidence:

- `apps/web/src/components/kitchen/stimuli/ImageStimulus.tsx`
- `apps/web/src/components/kitchen/stimuli/StimulusRenderer.tsx`
- `apps/web/public/kitchen/manifest.json`
- `packages/shared/src/schemas/content.schema.ts`
- `packages/content-authoring/src/validation/content-validator.ts`
- `packages/content-authoring/src/index.test.ts`

## Stimulus Renderer Integration

Skill: `.agents/skills/stimulus-renderer-integration/SKILL.md`

- [x] Renderer supports 8 kinds: `ticket`, `station_state`, `huddle_notes`, `menu_board`, `step_bank`, `plain_text`, `recipe`, `image`.
- [x] Kitchen challenge surface renders stimuli.
- [x] Learn page renders stimuli above the prompt.
- [x] Unit tests cover route/render behavior for all current kinds.
- [~] Skill doc is stale: it still describes six kinds and marks learn page as not wired.
- [~] Exhaustive switch is covered by runtime tests, not the documented compile-time `never` pattern.
- [ ] Update skill documentation to reflect 8 current kinds.
- [ ] Consider replacing router `default: return null` with a typed exhaustiveness guard plus a separate resilient boundary if desired.

Evidence:

- `apps/web/src/components/kitchen/stimuli/StimulusRenderer.tsx`
- `apps/web/src/components/kitchen/stimuli/__tests__/stimulus-renderers.test.tsx`
- `apps/web/src/app/(app)/learn/[courseId]/page.tsx`
- `apps/web/src/app/kitchen/challenges/[slug]/page.tsx`

## Stimulus Synthesis From Prompts

Skill: `.agents/skills/stimulus-synthesis-from-prompts/SKILL.md`

- [x] Heuristic library exists.
- [x] `synth-stimulus` CLI exists.
- [x] Drafted outputs validate against `challengeStimulusSchema`.
- [x] Tests cover existing-stimulus skip, no-text skip, ticket, recipe, huddle notes, station state, step-bank-ish synthesis, no-match, and review envelope.
- [~] Tests do not yet cover every documented kind/path.
- [~] `--backfill` behavior differs from the skill's documented glob wording.
- [ ] Add tests for `menu_board`, `plain_text`, and image no-synthesis/skip behavior.
- [ ] Add CLI tests for `--dry-run`, `--write`, and backfill.
- [ ] Resolve validator severity mismatch: synthesis skill says missing artifact stimuli should warn, while current validator emits errors in some paths.

Evidence:

- `packages/content-authoring/src/heuristics/stimulus-synth.ts`
- `packages/content-authoring/src/heuristics/stimulus-synth.test.ts`
- `packages/content-authoring/src/cli/synth-stimulus.ts`
- `packages/content-authoring/src/validation/content-validator.ts`

## TopShelf Content Pack Authoring

Skill: `.agents/skills/topshelf-content-pack-authoring/SKILL.md`

- [x] Strict content-pack schema exists.
- [x] `moduleLinks` validator rules exist.
- [x] Structured stimulus schema is wired into teaching blocks.
- [x] `validate:packs` CLI exists and loads the kitchen image manifest.
- [x] Validator fixture/unit coverage exists for core schema/business rules.
- [~] Skill doc lists six stimulus kinds; current repo supports eight.
- [~] Authored stimuli are uneven across content packs.
- [ ] Backfill or intentionally exempt remaining stimulus-worthy authored blocks.
- [ ] Update skill documentation to include `recipe` and `image`.
- [ ] Decide and document missing-stimulus warning vs error policy.

Evidence:

- `packages/shared/src/schemas/content.schema.ts`
- `packages/content-authoring/src/validation/content-validator.ts`
- `packages/content-authoring/src/cli/validate-packs.ts`
- `content-packs/content_pack_uncle_julios_v1.json`

## Top Shelf UI

Skill: `.agents/skills/top-shelf-ui/SKILL.md`

- [x] Kitchen stimulus components use established kitchen UI surfaces.
- [x] Learn page displays structured stimuli above prompt content.
- [x] Web unit tests pass for current component surfaces.
- [~] No recorded mobile/a11y/browser checklist evidence found.
- [~] PWA/offline UI exists, but full real-device validation is not recorded.
- [ ] Run and record mobile viewport checks at 320, 375, 768, and 1366x768.
- [ ] Run and record keyboard/focus and screen-reader sweep for primary learning path.

Evidence:

- `apps/web/src/components/kitchen/stimuli/**`
- `apps/web/src/app/(app)/learn/[courseId]/page.tsx`
- `apps/web/src/app/offline/page.tsx`

## Worked Example Fading

Skill: `.agents/skills/worked-example-fading/SKILL.md`

- [x] Engine types include `initialExposure`, `CreateContextOptions`, and `TrialOutcome`.
- [x] `PedagogyEngine.createContext` implements seed precedence.
- [x] `TriggerDetector.suggestModeFade` exists.
- [x] Engine tests cover fade behavior and create-context precedence.
- [~] API teach response computes and returns `recommendedMode`.
- [ ] Session start still hardcodes `TeachingMode.L2_CONTEXTUAL`; wire real seed-mode selection.
- [ ] Implement real initial-exposure detection from mastery plus prior same-concept events.
- [ ] Add learner override persistence/endpoint if that remains part of the contract.
- [ ] Add API tests for novice L4 seeding and `recommendedMode` fade.

Evidence:

- `packages/engine/src/types.ts`
- `packages/engine/src/pedagogy-engine.ts`
- `packages/engine/src/trigger-detector.ts`
- `packages/engine/src/engine.test.ts`
- `packages/api-server/src/routes/learner.ts`

## Trigger Engine Implementation

Skill: `.agents/skills/trigger-engine-implementation/SKILL.md`

- [x] Engine trigger thresholds/gates/elevation exist.
- [x] API records learning events, updates error counters, detects triggers, and persists elevated mode.
- [x] API/engine tests cover repeated-struggle elevation and core trigger behavior.
- [~] Learn page has help affordance, hint event posting, wrong-answer escalation, and stuck timer.
- [ ] Add centralized mode-aware teaching panel for L0-L4 surfaces.
- [ ] Honor L0 no-hint behavior in UI.
- [ ] Separate client soft-stuck affordance from engine stuck telemetry.
- [ ] Pause stuck timer on tab-hide.
- [ ] Extend event schema/telemetry for explicit `help_requested`, `stuck`, or `time_threshold` if still desired.
- [ ] Add web render tests for mode-specific UI.

Evidence:

- `packages/engine/src/trigger-detector.ts`
- `packages/api-server/src/routes/learner.ts`
- `packages/api-server/src/routes/learner.test.ts`
- `apps/web/src/app/(app)/learn/[courseId]/page.tsx`

## Spaced Retrieval Scheduler

Skill: `.agents/skills/spaced-retrieval-scheduler/SKILL.md`

- [x] Pure scheduler service implements interval ladder.
- [x] Pass/fail/help scheduling rules exist.
- [x] Aggregate queue orders due items and caps output at 50.
- [x] Scheduler tests cover math and queue cap.
- [x] Completion events update retention history.
- [x] `GET /learner/retention/queue` endpoint exists.
- [x] Web API client calls the retention queue endpoint.
- [~] Retention is stored in `learnerStates.retentionHistory` JSON, not a dedicated `retention_records` table.
- [~] Dashboard review card exists, but route target is not clearly first due block.
- [ ] Add direct route test for `GET /learner/retention/queue`.
- [ ] Add dashboard render tests for healthy/watch/urgent states.
- [ ] Decide whether JSON retention history is acceptable or migrate to indexed retention table.
- [ ] Route review CTA directly to `dueTaskIds[0]` if the product contract still requires it.

Evidence:

- `packages/api-server/src/lib/retention-scheduler.ts`
- `packages/api-server/src/lib/retention-scheduler.test.ts`
- `packages/api-server/src/routes/learner.ts`
- `apps/web/src/lib/api/learner.ts`
- `apps/web/src/app/(app)/dashboard/page.tsx`

## PWA Validation

Skill: `.agents/skills/pwa-validation/SKILL.md`

- [x] Web manifest exists and parses.
- [x] Manifest includes app identity, start URL, scope, standalone display, categories, and required icons.
- [x] Referenced icon files exist.
- [x] Service worker registration is client-side and production-gated.
- [x] Offline page is static and fetch-free.
- [~] Service worker has versioned caches, route bypasses, and offline fallback.
- [~] `PRECACHE_URLS` does not include install-banner icons.
- [~] `self.skipWaiting()` is used during install without an explicit upgrade-story note in the skill/doc trail.
- [~] Viewport theme color is conditional; skill asks for `#050507`.
- [ ] Run production build/start and Lighthouse mobile PWA audit.
- [ ] Record real-device install/offline validation.

Evidence:

- `apps/web/public/manifest.json`
- `apps/web/public/sw.js`
- `apps/web/src/components/providers/pwa-registrar.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/offline/page.tsx`

## Supabase

Skill: `.agents/skills/supabase/SKILL.md`

- [x] Supabase skill documentation exists with CLI/MCP/security workflow.
- [x] MCP config exists.
- [x] Web Supabase client uses public env configuration.
- [x] Middleware uses Supabase SSR flow.
- [~] Native Supabase migrations exist with RLS policies for kitchen tables.
- [~] Repo documents dual-stack DB reality: Supabase client plus API-server Drizzle/Postgres.
- [ ] Add or locate Supabase `config.toml` if local CLI workflow is intended.
- [ ] Run Supabase CLI/MCP migration status and advisor checks.
- [ ] Verify RLS-protected select/insert paths as `anon` and authenticated users.

Evidence:

- `.mcp.json`
- `apps/web/src/lib/supabase.ts`
- `apps/web/src/middleware.ts`
- `infrastructure/supabase/migrations/001_kitchen_tables.sql`
- `STATE_OF_THE_REPO.md`

## Supabase Postgres Best Practices

Skill: `.agents/skills/supabase-postgres-best-practices/SKILL.md`

- [x] Reference set exists for query, connection, RLS/security, schema, locking, data access, and monitoring.
- [x] Database connection code uses pool limits, disabled prepared statements, and statement timeout.
- [~] Schemas/migrations include many primary keys, foreign keys, and indexes.
- [~] Drizzle snapshots show app schema RLS disabled while separate Supabase kitchen SQL enables RLS; this split needs intentional review.
- [ ] Run advisor output, `EXPLAIN ANALYZE`, and/or `pg_stat_statements` review.
- [ ] Verify FK index coverage on high-read/write tables.
- [ ] Document which schemas are exposed through Supabase Data API vs API-server-only Postgres.

Evidence:

- `.agents/skills/supabase-postgres-best-practices/references/**`
- `packages/database/src/index.ts`
- `packages/database/src/schema/**`
- `infrastructure/supabase/migrations/**`

## Image Stimulus Eval

Eval: `.agents/evals/image-stimulus-asset-pipeline/eval.yaml`

- [x] Eval scaffold exists with metrics and task glob.
- [x] Positive trigger tasks exist.
- [x] Negative trigger task exists.
- [x] Functional task added for manifest validation.
- [x] Functional task added for release-mode demo-image blocking.
- [x] Functional task added for renderer behavior.
- [x] Negative task added for `recipe` stimulus work.
- [~] Eval tasks still rely on text graders rather than executing repo-level functional checks.

Evidence:

- `.agents/evals/image-stimulus-asset-pipeline/eval.yaml`
- `.agents/evals/image-stimulus-asset-pipeline/tasks/*.yaml`

## GitHub Agent Roster

Agents: `.github/agents/*.agent.md`

- [x] `api-engineer` protocol exists for Hono routes, auth, middleware, and API contracts.
- [x] `content-engineer` protocol exists for content packs, content quality, and authoring pipelines.
- [x] `coordinator` protocol exists for batch orchestration and cross-agent state.
- [x] `db-engineer` protocol exists for Drizzle schema, migrations, seeds, and SQL.
- [x] `engine-engineer` protocol exists for pedagogy engine, triggers, constraints, and policy behavior.
- [x] `frontend-engineer` protocol exists for Next.js UI, API clients, accessibility, and brand.
- [x] `infra-engineer` protocol exists for Docker, CI/CD, env, and deployment automation.
- [x] `quality-reviewer` protocol exists for read-only findings, security, type/lint/test health.
- [x] `test-engineer` protocol exists for unit, integration, e2e, fixture, and parity tests.
- [~] Board has entries for several agents, but `coordinator` and `quality-reviewer` have no current status entries.
- [~] Board contains stale notes in places, including old migration counts and mixed `_No updates yet_` markers near later updates.
- [ ] Update `.github/state/board.md` after this pass so the blackboard reflects the actual current state.

Evidence:

- `.github/agents/api-engineer.agent.md`
- `.github/agents/content-engineer.agent.md`
- `.github/agents/coordinator.agent.md`
- `.github/agents/db-engineer.agent.md`
- `.github/agents/engine-engineer.agent.md`
- `.github/agents/frontend-engineer.agent.md`
- `.github/agents/infra-engineer.agent.md`
- `.github/agents/quality-reviewer.agent.md`
- `.github/agents/test-engineer.agent.md`
- `.github/state/board.md`

## Blackboard And Batch Protocols

Protocols:

- `.github/instructions/agent-comms.instructions.md`
- `.github/instructions/workspace.instructions.md`
- `.github/instructions/brand-kit.instructions.md`
- `.github/prompts/batch-orchestrator.prompt.md`
- `CLAUDE.md`

- [x] Repo-wide engineering rules exist: `pnpm`, strict TypeScript, cross-package contracts, no `_future` imports, affected checks required.
- [x] Specialized batch-orchestrator prompt exists.
- [x] Blackboard `board.md` exists and records hotspots and history.
- [x] `.github/state/queue.md`, `.github/state/decisions.md`, and `.github/state/blockers.md` have been restored as minimal blackboard files.
- [x] Multi-agent updates were written to `.agents/progress.md` and summarized in `.github/state/board.md`.
- [~] `skills-lock.json` locks only external Supabase skills, not local `.agents/skills/**`.
- [ ] Decide whether local skills should be represented in `skills-lock.json`.

Evidence:

- `.github/instructions/agent-comms.instructions.md`
- `.github/instructions/workspace.instructions.md`
- `.github/instructions/brand-kit.instructions.md`
- `.github/prompts/batch-orchestrator.prompt.md`
- `.github/state/board.md`
- `skills-lock.json`
- `CLAUDE.md`

## Package Protocols

Protocols: root and package `CLAUDE.md` files.

- [x] Root operating guide exists and defines product principle, command gates, definition of done, hotspot tags, and multi-agent protocol.
- [x] Web protocol exists for App Router, auth store, API clients, route protection, and kitchen UI.
- [x] API protocol exists for middleware order, route-level auth, route tests, learner route shape, and error helpers.
- [x] Database protocol exists for Drizzle schema/migration workflow.
- [x] Engine protocol exists for pure TS engine design, trigger rules, constraints, and kitchen-domain boundaries.
- [x] Shared protocol exists for type/schema/constant/utility ownership.
- [x] Content-authoring and deterministic-formatter protocols exist for validate, parity, review, sign, publish flow.
- [x] MCP prototype and `_future` protocols mark those areas as non-production/gated.
- [ ] Refresh package protocol docs that drifted from current implementation, especially content-authoring shape examples and any old route descriptions.

Evidence:

- `CLAUDE.md`
- `apps/web/CLAUDE.md`
- `packages/api-server/CLAUDE.md`
- `packages/database/CLAUDE.md`
- `packages/engine/CLAUDE.md`
- `packages/shared/CLAUDE.md`
- `packages/content-authoring/CLAUDE.md`
- `packages/deterministic-formatter/CLAUDE.md`
- `implementations/mcp-server/CLAUDE.md`
- `packages/_future/CLAUDE.md`

## UJ Production Tracker

Source of truth: `tools/uj-tracker/tasks.yaml`

- [x] Tracker exists with explicit status values, gate check types, phases, and sanity gate.
- [x] P0 decision tasks are marked done.
- [x] P1 walking skeleton is mostly marked done, except deployment.
- [x] P2 stimulus renderer tasks are marked done, except real-shift validation.
- [~] X1 UJ v0.1.2 content application is blocked on missing authorized/local source artifact or branch.
- [~] X2 authoring backlog is in progress and never-ending by design.
- [~] X3 authorization conversation is `review`, but decisions/governance still make real authorization substantively pending.
- [~] P3 client-side triggers are in review; mode-specific UI is still pending.
- [~] P3 retention scheduler items are marked done, but route/UI tests and first-due routing remain gaps.
- [ ] P1.5.1 production deploy with custom domain + SSL is pending.
- [ ] P2.3.1 real-shift validation is pending.
- [ ] P4 tenant/JWT/admin onboarding and manager surfaces are pending.
- [ ] P5 Sentry, analytics, legal acceptance, bundle audit, backup verification, and related ops gates are pending or incomplete.
- [ ] P6 pilot onboarding/observation/triage/retro remain pending and blocked by authorization/consent.
- [ ] Set `sanity_gate.start_date` if this tracker is actively governing a committed four-week bet.

Evidence:

- `tools/uj-tracker/tasks.yaml`
- `RUNBOOK.md`
- `docs/decisions/sun-holdings-auth-decision.md`

## Governance And Decision Gates

Protocols:

- `docs/decisions/*.md`
- `governance/**/*.md`
- `governance/policies/promotion_policy_config.json`
- `docs/incident_runbooks.md`
- `RUNBOOK.md`

- [x] P0.2 baseline decisions exist: hosting, auth/data, PWA strategy, pack delivery.
- [x] Hosting decision chooses Vercel first for web; API/DB/Redis remain separate.
- [x] Auth/data decision chooses custom JWT plus Drizzle/Postgres plus existing Supabase browser client.
- [x] PWA decision limits scope to minimal app shell; no offline writes or private API caching.
- [x] Pack-delivery decision keeps kitchen packs static-bundled for v0.1.x.
- [x] Demo runbook exists and defines demo readiness gates.
- [x] UJ demo-to-pilot governance exists with repo, tracker, authorization, public-claim, and technical gates.
- [x] Brand standards exist for tokens, voice, and doctrine.
- [x] Promotion policy config exists.
- [~] UJ/Sun authorization remains pending; governance forbids real cooks/managers/store data/proprietary claims until approval.
- [~] Privacy and terms files exist, but tracker P5.2 still treats legal acceptance/attorney review/live signup acceptance as pending.
- [~] Incident runbooks exist but appear partially aspirational; some commands/tables/log paths need production alignment.
- [~] Governance references `pilot/uj-pack/PILOT_GATE_CHECKLIST.md`, but that file is not present in this checkout.
- [ ] Align tracker statuses with governance reality for authorization and legal gates.
- [ ] Add or restore pilot gate checklist if UJ pilot controls remain active.
- [ ] Prove backup/restore before closing P5.5.1.

Evidence:

- `docs/decisions/hosting-decision.md`
- `docs/decisions/auth-data-decision.md`
- `docs/decisions/pwa-strategy.md`
- `docs/decisions/pack-delivery-strategy.md`
- `docs/decisions/sun-holdings-auth-decision.md`
- `governance/repo/uj-pack-demo-to-pilot-gates.md`
- `governance/legal/uj-pack-authorization-boundary.md`
- `governance/standards/brand/**`
- `governance/policies/promotion_policy_config.json`
- `docs/incident_runbooks.md`
- `RUNBOOK.md`

## CI And Workflow Protocols

Sources:

- `.github/workflows/*.yml`
- `.github/actions/setup-workspace/action.yml`
- `.github/checklists/TODO_PHASE_1.md`

- [x] CI workflows exist for main checks, parity/playwright, and workflow lint.
- [x] Phase 1 checklist exists and is marked complete.
- [x] Primary CI no longer ignores docs/Markdown-only changes.
- [x] Phase 1 checklist now includes a post-Phase-1 addendum noting `recipe` and `image` expansion to eight kinds.
- [ ] Consider adding a lighter docs/protocol validation job if full CI on docs proves too expensive.

Evidence:

- `.github/workflows/ci.yml`
- `.github/workflows/ci-parity-playwright.yml`
- `.github/workflows/workflow-lint.yml`
- `.github/checklists/TODO_PHASE_1.md`

## Archived Skill Drift

Source: `zip/uj-pack-v0.1/uj-pack/skill/topshelf-content-pack-authoring/SKILL.md`

- [x] Archived v0.1 content-pack authoring skill exists.
- [~] Archived skill includes branch naming, validation-output capture to `.batch-ledger/<pack>-validation.txt`, and PR title/body protocol not preserved in current local skill.
- [~] Archived skill includes specific content-quality requirements that may be obsolete or dropped: `locale`, `translationStatus`, 3 highest-impact common errors, trainer notes length, and source-data notes.
- [~] Archived `surfaceVariant.data` conventions are not reflected in current skill; current repo uses `moduleLinks`, so this may be intentional.
- [ ] Decide which archived protocols are intentionally superseded and which should be restored into `.agents/skills/topshelf-content-pack-authoring/SKILL.md`.

Evidence:

- `zip/uj-pack-v0.1/uj-pack/skill/topshelf-content-pack-authoring/SKILL.md`
- `.agents/skills/topshelf-content-pack-authoring/SKILL.md`

## Uncovered Protocol/Skill Needs

These tracker areas are not covered by a local `.agents/skills/*/SKILL.md`.

- [ ] Authorization/legal/source-agreement protocol for X3 and real pilot boundary.
- [ ] Deployment/custom-domain protocol for P1.5.1.
- [ ] Field-test/friction-log protocol for P2.3.1.
- [ ] Multi-tenant claims/isolation/admin-onboarding protocol for P4.
- [ ] Monitoring/analytics protocol for P5.1.
- [ ] Legal/compliance publication protocol for P5.2.
- [ ] Bundle-budget protocol for P5.4.2.
- [ ] Backup/restore verification protocol for P5.5.1.
- [ ] Pilot operations/research observation protocol for P6.

## Verification Already Run During This Pass

- [x] `pnpm --filter @topshelf/shared typecheck`
- [x] `pnpm --filter @topshelf/shared test -- content.schema.test.ts`
- [x] `pnpm --filter @topshelf/shared build`
- [x] `pnpm --filter @topshelf/content-authoring typecheck`
- [x] `pnpm --filter @topshelf/content-authoring test -- index.test.ts`
- [x] `pnpm --filter @topshelf/content-authoring validate:packs`
- [x] `pnpm --filter @topshelf/web typecheck`
- [x] `pnpm --filter @topshelf/web test -- stimulus-renderers.test.tsx`
- [x] `git diff --check`

## Recommended Next Batch

1. Update stale skill docs for stimulus kinds and learn-page wiring.
2. Add compile-time exhaustiveness to `StimulusRenderer`.
3. Add image-stimulus authored fixture/content path.
4. Add CLI tests for stimulus synthesis.
5. Add route/UI tests for retention queue and dashboard review card.
6. Start PWA production audit and record real-device results.
