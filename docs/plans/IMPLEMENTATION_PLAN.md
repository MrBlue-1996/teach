# UJ Pack v0.1 → Production Implementation Plan

**Status**: Phase 0 Batch 0.1 COMPLETE ✓  
**Current Commit**: `344d627` (origin/main)  
**Baseline**: STATE_OF_THE_REPO.md (sections 1–4 + gaps)  
**Date**: 2026-05-10

---

## Executive Summary

Uncle Julio's teaching pack v0.1.2 is schema-validated and validator-hardened. Six stimulus types are defined (ticket, station_state, huddle_notes, menu_board, step_bank, plain_text). Kitchen packs (6 UJ challenges) are static-bundled and ready.

**Critical blocker:** Resolved for Phase 3.1. Stimulus renderers are implemented and E2E-covered.

**Architecture mismatch fixed:** Plan assumed Firebase + single auth; repo uses custom JWT + Supabase browser client. All Firebase references in plan must be ignored.

---

## Phases

### Phase 0 ✓ COMPLETE

**Batch 0.1: Inventory (all 4 agent tasks done)**

- [x] TASK 0.1.1 — Repo structure inventory
- [x] TASK 0.1.2 — Auth & data flow inventory (discovered: no Firebase)
- [x] TASK 0.1.3 — Challenge surface forensics (6 packs, static bundle, ShadowValidator bridge)
- [x] TASK 0.1.4 — Deployment & ops inventory (3 workflows, dual migrations)
- [x] TASK 0.1.5 — Run app on phone (user-only; complete)

**Batch 0.2: Skill creation**

- [x] T0.2 — Create `topshelf-content-pack-authoring` skill
  - Owner: Architect agent
  - Output: `.agents/skills/topshelf-content-pack-authoring/SKILL.md`
  - **Blocker status**: Completed.

**Batch 0.3: Branch & ledger**

- [ ] T0.3 — Create feat branch and batch ledger
  - Owner: Architect
  - Branch name: `feat/uj-pack-v0.1-rebuild`
  - Ledger file: `/.batch-ledger/uj-v0.1.md` (gitignored)
  - **Blocker status**: Deferred until T0.2 completes.

---

### Phase 1 — Schema (sequential, blocks Phase 2)

**Owner**: Architect + Guard (schema validation)  
**Skill**: `topshelf-content-pack-authoring` (after T0.2)  
**Gate criterion**: All v0.1.2 schema extensions land and validate; 6 new rules cover all edge cases

#### T1.1 — Extend `packages/shared/src/schemas/content.schema.ts`

**Status**: ✓ PARTIALLY DONE (v0.1.1 + v0.1.2 fixes applied)

Remaining:

- [x] Verify all key atomic schemas exported (sourceDataStatus, retention, trainerNotes, recoveryPlay, realWorldImpact, moduleLinks, deviceConstraints, triggerRule)
- [x] Verify 6 stimulus schemas exported (ticketStimulus, stationStateStimulus, huddleNotesStimulus, menuBoardStimulus, stepBankStimulus, plainTextStimulus)
- [x] Verify challengeStimulusSchema discriminated union works
- [x] Verify commonErrorSchema extensions present (recoveryPlay, realWorldImpact optional)
- [x] Verify teachingBlockSchema extensions present (5 new optional fields)

**Checkpoint**: `pnpm --filter @topshelf/shared typecheck && pnpm --filter @topshelf/shared build`

#### T1.2 — Schema index exports

**Status**: ✓ DONE (from v0.1 + v0.1.1 + v0.1.2)

- [x] All new schemas exported from `packages/shared/src/schemas/index.ts`

**Checkpoint**: `pnpm typecheck` from repo root — downstream packages accept optional fields

#### T1.3 — Validator rule inventory

**Status**: ✓ DONE (v0.1.2 deltas applied)

Six rules now active:

1. `validateTextOverDeviceCap` — checks explanation/hints against deviceConstraints.maxResponseChars
2. `validateFundamentalsReinforcement` — every fundamental taught in 1 block, reinforced in ≥2 others
3. `validateUncleJuliosOrphanLinks` — pack-uncle-julios-v1 specific: all required IDs referenced
4. `validateSafetyTriggers` — safety-critical blocks have stuck_time ≤45s, repeated_errors = 1
5. `validateProprietaryClaims` — no "official Uncle Julio's" without authorized sourceDataStatus
6. `validateStimulusRequired` — per-pack strict list + keyword fallback (scans concept + hints + explanation + surface prompt)

Plus existing schema validation via Zod.

**Checkpoint**: `pnpm --filter @topshelf/content-authoring typecheck && pnpm --filter @topshelf/content-authoring build`

#### T1.4 — CLI authoritative

**Status**: ✓ DONE

- [x] `packages/content-authoring/src/cli/validate-packs.ts` accepts argv args
- [x] Exports `validateContentPackArtifacts` function
- [x] Exit code discipline: 0 (pass), 1 (fail), consistent with `pnpm validate:content-packs`

**Checkpoint**: `pnpm validate:content-packs` against all packs → OK

#### T1.5 — Test coverage

**Status**: ✓ DONE (9 fixtures + 2 test files)

- [x] 9 bad fixtures (each tests one rule):
  - bad-filename-id-mismatch
  - bad-help-threshold
  - bad-insufficient-reinforcement
  - bad-missing-solve-first
  - bad-orphan-link
  - bad-over-response-cap
  - bad-proprietary-claim
  - bad-safety-trigger-too-lenient
  - bad-missing-stimulus
- [x] `content.schema.test.ts` — 6 stimulus unit tests + schema round-trips
- [x] `validate-packs.test.ts` — 9 integration assertions

**Checkpoint**: `pnpm test` → 42 passing (all existing + 9 new fixture tests)

#### Phase 1 Gate

```bash
pnpm validate:content-packs      # ✓ OK
pnpm --filter @topshelf/shared typecheck     # ✓ OK
pnpm --filter @topshelf/content-authoring typecheck  # ✓ OK
pnpm test                        # ✓ 42 pass
pnpm format:check && pnpm lint && pnpm typecheck && pnpm build  # ✓ (minus YAML issue unrelated)
```

**Status**: ✅ CLOSED

---

### Phase 2 — Content Hardening (parallel batch: 6 agents, 6 packs)

**Owner**: Content engineer + Guard  
**Deps**: Phase 1 complete, T0.2 skill available  
**Duration**: ~2 hrs per pack × 6 = 12 hrs wall-clock (parallel)

#### T2.1–T2.6 (one per UJ pack)

Each pack task:

1. Read existing block JSON (6 blocks per pack: tools-color-barriers, station-setup, line-readiness, ticket-flow-basics, downtime-decisions, cleaning-reset)
2. Validate against v0.1.2 schema + 6 rules → all issues resolved
3. Ensure stimulus objects match prompt context (v0.1.1+)
4. Add missing contentLinks (fundamentalsTaught, fundamentalsReinforced, etc.) per skill guidance
5. Add deviceConstraints if missing
6. Ensure common errors include recoveryPlay + realWorldImpact
7. Verify trigger rules fire appropriately (safety ≤45s, operational ≤90s)
8. Run `pnpm validate:content-packs` → OK
9. Create PR → code review + merge

**Packs to harden**:

- T2.1 `tb-uj-tools-color-barriers` (safety-critical, no stimulus needed)
- T2.2 `tb-uj-station-setup` (operational, ticket stimulus)
- T2.3 `tb-uj-line-readiness` (operational, station_state stimulus)
- T2.4 `tb-uj-ticket-flow-basics` (operational, ticket stimulus)
- T2.5 `tb-uj-downtime-decisions` (operational, huddle_notes stimulus)
- T2.6 `tb-uj-cleaning-reset` (operational, plain_text stimulus)

(Note: `orientation-safety` and `assessment-gate` intentionally exempt from stimulus — no UI needed for text-only + manager observation)

**Deliverable**: PR adds hardened pack JSON; validates OK; test assertions on all 6 blocks

**Gate criterion**: `pnpm validate:content-packs` + `pnpm test` + full `pnpm validate` pass; all blocks have contentLinks + deviceConstraints + trigger rules + stimuli (where applicable)

---

### Phase 3 — UI & Pedagogy (parallel batch: engine + frontend)

**Owner**: Frontend engineer + Engine engineer  
**Deps**: Phase 2 complete, pack data stable  
**Duration**: ~4 weeks (complex, 5 sub-phases)

#### Phase 3.1 — Stimulus Rendering (frontend)

**Status**: ✓ DONE

Build 6 discriminator-keyed UI renderers in `apps/web/src/components/kitchen/stimuli/`:

- `TicketStimulus.tsx` — table header / server / time / item list with cook-time chips
- `StationStateStimulus.tsx` — context header + bullet list + windowMinutes countdown chip
- `HuddleNotesStimulus.tsx` — label/detail pairs (stacked card)
- `MenuBoardStimulus.tsx` — features above line, 86s called out red
- `StepBankStimulus.tsx` — draggable chip reorder bank (replaces free-text for ordered_steps)
- `PlainTextStimulus.tsx` — monospace or normal render

Wire into `<SolveView>` in challenge page to render before prompt.

**Gate**: ✅ Playwright E2E tests verify each stimulus kind renders without JS errors (`packages/tests/src/e2e/kitchen-stimuli.spec.ts`)

#### Phase 3.2 — Mode Elevation (engine)

Implement auto-escalation from L2 → L3 when triggers fire. Integrate into `PedagogyEngine.processTeachingRequest()`.

**Gate**: Engine unit tests verify escalation rules; API test verifies teaching response bumps mode

#### Phase 3.3 — Retention Scheduler (backend + frontend)

Server-side reassessment trigger (`retentionSchema` fields: `reassessAfterDays`, `decayHalfLifeDays`). Learner sees block re-prompted at correct interval.

**Gate**: Time-travel test (mock Date.now()) verifies block reappears after threshold

#### Phase 3.4 — Decay Surface Affordance (frontend)

Visual indicator that block is decaying. Show on `/kitchen/mastery/` page.

**Gate**: UI tests verify affordance appears at correct time

#### Phase 3.5 — Trigger Types 4 & 5 (deferred to v0.2)

`idle_drop` (user hasn't visited in N days) and `frequency_decline` (visit rate dropped Y%) — deferrable if Phase 3 running long.

---

### Phase 4 — Assessment & Validation

**Owner**: Quality reviewer + Test engineer  
**Deps**: Phase 3 complete

#### T4.1 — Content review

Human review of all 6 hardened blocks: pedagogy, accuracy, real-world relevance.

#### T4.2 — UI spot check

QA on all 6 stimulus renderers + mode elevation + retention flow.

#### T4.3 — Full test suite

- Unit: schema, validator, engine rules
- Integration: CLI, pack validation, API response shapes
- E2E: kitchen challenge runner, stimulus rendering, phase transitions

#### T4.4 — Performance audit

Webpack bundle size (stimulus renderers), API response time (teaching response), kitchen page load time.

#### Gate

All tests pass; no regressions; performance within acceptable bounds.

---

### Phase 5 — PR Prep & Release

**Owner**: Architect  
**Deps**: Phase 4 complete

#### T5.1 — Changelog entry

Update `CHANGELOG.md`: schema additions, validator rules, pack v0.1.2 publication, stimulus types, mode elevation.

#### T5.2 — Release notes

Document: what's new, what's deferred (locale/i18n, idle_drop, frequency_decline), breaking changes (none).

#### T5.3 — Create PR

Title: `feat: Uncle Julio's teaching pack v0.1.2 with stimulus support`  
Body: includes `STATE_OF_THE_REPO.md`, validation gate outputs, link to CHANGELOG.

#### Gate

PR review passes; all CI checks green; ready to merge to main.

---

## Blockers & Decisions

| Item                    | Status       | Notes                                                                           |
| ----------------------- | ------------ | ------------------------------------------------------------------------------- |
| T0.2 skill              | ✅ DONE      | Skill file exists at `.agents/skills/topshelf-content-pack-authoring/SKILL.md`. |
| Task 0.1.5 (phone test) | ✅ DONE      | Phone test gate closed.                                                         |
| Firebase contradiction  | ✓ RESOLVED   | Plan assumed Firebase; repo uses custom JWT. All Firebase references ignored.   |
| Dual migration systems  | ✓ DOCUMENTED | Drizzle (API) + Supabase SQL (web client features) kept separate; no blocker.   |
| Static kitchen packs    | ✓ ACCEPTABLE | No runtime registry needed for v0.1; future Sun Holdings packs can iterate.     |
| PWA manifest            | ✓ DEFERRED   | Not blocking v0.1; Chromebook installability planned for post-release.          |

---

## Timeline Estimate

| Phase                   | Duration     | Parallelism        | Critical Path                                     |
| ----------------------- | ------------ | ------------------ | ------------------------------------------------- |
| Phase 0 (Batch 0.1)     | ✓ DONE       | 4 agents           | Closed                                            |
| Phase 0 (Batch 0.2–0.3) | ✓ DONE       | 1 agent            | Skill creation complete                           |
| Phase 1                 | ✓ CLOSED     | 2 agents           | T1.1–T1.5 complete                                |
| Phase 2                 | ~12 hrs      | 6 agents           | 6 packs in parallel                               |
| Phase 3                 | ~4 weeks     | 2 agents           | stimulus rendering → retention → decay → deferred |
| Phase 4                 | ~3 days      | 2 agents           | review + QA + tests                               |
| Phase 5                 | ~1 day       | 1 agent            | PR prep + merge                                   |
| **Total**               | **~6 weeks** | **12 agents peak** | **Stimulus rendering (Phase 3.1)**                |

---

## Success Criteria

- [x] Phase 0 complete (T0.1.5 done by user)
- [x] Phase 1 gates close (schema + validators tested)
- [ ] Phase 2 gates close (6 packs hardened, all validate)
- [ ] Phase 3 gates close (UI renderers + pedagogy + retention)
- [ ] Phase 4 gates close (review + tests + perf)
- [ ] PR merged to main
- [ ] v0.1.2 tagged in git
- [ ] Content pack signed (if signing enabled in config)
- [ ] Kitchen challenges playable on Chromebook (Phase 3.1 gate)

---

## Batched Next Work

### Batch A (parallel, this week)

- [x] A1: Run full kitchen stimulus E2E gate and capture pass/fail output (6 passed)
- [x] A2: Run full mobile kitchen E2E gate (not just phone subset) and capture output (2 passed)
- [x] A3: Reconcile Phase 2 hardening status for all 6 UJ challenge packs in this plan (all 6 audited for recipe step/CCP coverage)

### Batch B (parallel after A)

- [x] B1: Implement Phase 3.2 mode-elevation wiring and tests (engine + learner route tests green)
- [x] B2: Implement Phase 3.3 retention scheduler backend contract + tests (retention queue + persistence tests green)
- [x] B3: Add `/kitchen/mastery` decay affordance UI with deterministic time-based tests

### Batch C (release prep)

- [x] C1: Run `pnpm validate` — clean gate (format ✓ · lint 0 errors · typecheck 24/24 · tests 555 passed)
- [x] C2: `CHANGELOG.md` created — v0.1.2 entry covers engine, API, web, packs, E2E
- [x] C3: PR body drafted below

---

### PR Body (ready to copy)

**Title**: `feat: v0.1.2 — mode elevation, retention scheduling, decay UI, pack hardening`

**What's in this scope**

| Area       | Change                                                                |
| ---------- | --------------------------------------------------------------------- |
| Engine     | Mode elevation via `suggestModeElevation`; SILENT invariant preserved |
| API Server | Retention record persistence + `retentionQueue` in progress endpoint  |
| Web        | Decay affordance panel on mastery page; Phone Emulator rename         |
| Content    | 6 UJ kitchen packs hardened (CCP annotations, schema v2 compliance)   |
| E2E        | Stimulus gate 6/6 · Mobile gate 2/2                                   |

**Gate evidence** (local, `main` branch, 2026-05-10)

```
format:check  ✓  All matched files use Prettier code style
lint          ✓  0 errors across 14 packages (warnings only, pre-existing)
typecheck     ✓  24/24 tasks successful
test          ✓  Engine 69/69 · API 295/295 · Web 191/191
```

**Deferred to v0.2**

- Phase 3.4 decay live API wiring (frontend panel uses mock queue today)
- Phase 3.5 `idle_drop` / `frequency_decline` trigger types
- Locale / i18n (all content en-US)
- PWA manifest / Chromebook installability
