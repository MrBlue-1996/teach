# Phase 1 — Schema & Validator Tasks

**Status**: Ready to start  
**Owner**: Guard agent (schema validation)  
**Duration**: 2–3 days (sequential gate checks)  
**Gate criterion**: All 6 validator rules tested; schema round-trips verified; 42 tests passing

---

## T1.1 — Extend `packages/shared/src/schemas/content.schema.ts`

- [ ] Verify all 8 atomic schemas exported
  - `sourceDataStatus` (enum: ORIGINAL, SECONDARY, PROPRIETARY)
  - `retention` (reassessAfterDays, decayHalfLifeDays)
  - `trainerNotes` (string, optional)
  - `recoveryPlay` (string, optional)
  - `realWorldImpact` (string, optional)
  - `contentLinks` (fundamentalsTaught, fundamentalsReinforced arrays)
  - `deviceConstraints` (maxResponseChars: min(200), max(50000))
  - `triggerRule` (triggerType, threshold, modeLift, maxConcurrentDays)
- [ ] Verify 6 stimulus schemas exported
  - `ticketStimulus` (table, guests, server, time, items)
  - `stationStateStimulus` (context, bullets, windowMinutes)
  - `huddleNotesStimulusSchema` (label/detail pairs)
  - `menuBoardStimulus` (features, aboveLineCount, secondsUntilCall)
  - `stepBankStimulus` (bank chips, cardinality, order)
  - `plainTextStimulus` (text, format: "mono" | "normal")
- [ ] Verify `challengeStimulusSchema` discriminated union on `kind`
- [ ] Verify `commonErrorSchema` extensions (recoveryPlay, realWorldImpact optional)
- [ ] Verify `teachingBlockSchema` extensions (5 new optional fields)

**Checkpoint**: `pnpm --filter @topshelf/shared typecheck && pnpm --filter @topshelf/shared build`

---

## T1.2 — Schema index exports

- [ ] Confirm all new schemas exported from `packages/shared/src/schemas/index.ts`
- [ ] Run downstream package typecheck (api-server, content-authoring, engine)

**Checkpoint**: `pnpm typecheck` from repo root — all packages resolve

---

## T1.3 — Validator rule integration verification

Six rules already in place (from v0.1.2 deltas):

- [ ] Rule 1: `validateTextOverDeviceCap` — explanation/hints ≤ maxResponseChars
- [ ] Rule 2: `validateFundamentalsReinforcement` — every fundamental taught + 2+ reinforced
- [ ] Rule 3: `validateUncleJuliosOrphanLinks` — all required IDs referenced
- [ ] Rule 4: `validateSafetyTriggers` — safety blocks stuck_time ≤45s, repeated_errors = 1
- [ ] Rule 5: `validateProprietaryClaims` — no "official Uncle Julio's" without authorized sourceDataStatus
- [ ] Rule 6: `validateStimulusRequired` — stimulus objects match prompt context

**Checkpoint**: `pnpm --filter @topshelf/content-authoring typecheck && pnpm --filter @topshelf/content-authoring build`

---

## T1.4 — CLI validator test coverage

- [ ] Run validator CLI against all 4 manifest packs
  - `content_pack_web-fundamentals_v1.json` (should pass)
  - `content_pack_uncle_julios_v1.json` (should pass)
  - `content_pack_networkplus_v1.json` (should pass)
  - `content_pack_linux_v1.json` (should pass)
- [ ] Run validator CLI against all 9 bad fixtures (should fail with correct rule)
- [ ] Verify exit codes (0 = pass, 1 = fail)

**Checkpoint**: `pnpm validate:content-packs` — OK

---

## T1.5 — Test assertions

- [ ] Confirm 9 bad fixture tests pass in `validate-packs.test.ts`
- [ ] Confirm 6 stimulus unit tests pass in `content.schema.test.ts`
- [ ] Confirm schema round-trip tests pass
- [ ] Run full test suite: `pnpm test`

**Checkpoint**: `pnpm test` → 42 tests passing (including 9 new fixture tests)

---

## T1.6 — Phase 1 gate closure

- [x] Content packs validate ✓
- [x] @topshelf/shared typecheck ✓
- [x] @topshelf/content-authoring typecheck ✓
- [ ] Format + lint + typecheck pass
- [ ] All 42 tests passing
- [ ] No regressions vs Phase 0 baseline

**Final checkpoint**:

```bash
pnpm validate:content-packs      # ✓ OK
pnpm typecheck                    # ✓ Pass
pnpm format:check                 # ✓ Pass
pnpm test                         # ✓ 42 pass
```

**Gate status**: ⏳ PENDING T0.2 skill creation for Phase 1 documentation

---

## Blockers

- T0.2 skill (`topshelf-content-pack-authoring`) — needed for content authoring guidance in Phase 2
- Task 0.1.5 (user phone test) — Phase 0 gate
