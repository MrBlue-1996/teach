# Uncle Julio's Content Pack v0.1 — Parallel Execution Plan

**Target**: `peteywee/teach` repo, single-file pack at `content-packs/content_pack_uncle_julios_v1.json`
**Out of scope**: Spanish/i18n (deferred to v0.2 — locale field will NOT be added in this release)
**Audience**: high-turnover BoH operations (30–90% annual turnover)
**Pedagogical priorities**: micro-credentialing, distributed assessment, spaced reinforcement, recovery-first failure handling

---

## Skills required

### Existing skills (already on disk)

- `top-shelf-ui` — frontend brand standards. **Not used in this batch** (pure backend/schema/content work).
- `mgmt415-humanizer` — academic writing. **Not used.**
- `skill-creator` — used in T0.2 below to produce the new skill.

### Skills to create BEFORE batch starts

#### NEW SKILL: `topshelf-content-pack-authoring`

**Why this skill is required (not optional):**
Patrick will author ≥1 more brand-specific pack after this one (Sun Holdings family, additional restaurant brands). Embedding the v0.1 patterns in a reusable skill prevents drift across packs and means future Sun Holdings packs (Burger King, Popeyes, Applebee's) inherit the same structure without re-deriving rules from this conversation. Without the skill, the next pack will diverge.

**Skill contents (what SKILL.md must cover):**

1. ContentPackManifest field reference — camelCase, `.strict()` constraint, every field documented with type and required/optional status.
2. TeachingBlock structure with v0.1 extensions:
   - `contentLinks` (sourceModuleId, fundamentalsTaught, fundamentalsReinforced, downtimeDecisions, chaosEvents, externalAssessmentId, ticketFlows)
   - `deviceConstraints` (maxResponseChars only)
   - `triggerRules` (discriminated union: stuck_time, repeated_errors, help_requested, idle_drop, frequency_decline)
   - `retention` (reassessAfterDays, decayHalfLifeDays)
   - `trainerNotes` (separate from explanation)
3. Surface variant `data` field conventions: `sourceModuleId`, `sourceDataStatus`, `stationRelevance`, `roleTarget`, `inputType`, `expectedResponse`.
4. CommonError extensions: `recoveryPlay` (imperative, mid-service-applicable), `realWorldImpact` (dollars or guest-impact, demo until authorized).
5. Mode enum: `L0`, `L1`, `L2`, `L3`, `L4` only — NEVER `L0_SILENT`, `L2_GUIDE`, `L3_EXPLAIN` (those are engine-internal teaching mode constants, NOT pack content).
6. sourceDataStatus rules: `demo` | `authorized` | `requires-client-source` | `deprecated`. `authorized` requires `sourceDataNotes`. No `placeholder`.
7. IP safety: no text claiming "official Uncle Julio's [anything]" unless `sourceDataStatus === 'authorized'`.
8. Trigger threshold tiers:
   - Safety-critical (orientation-safety, tools-color-barriers, safe-handling): `stuck_time` 30–45s, `repeated_errors` threshold 1.
   - Operational (station-setup, line-readiness, ticket-flow, downtime, cleaning): `stuck_time` 60–90s, `repeated_errors` threshold 2.
   - Assessment gate: no triggers (manager IS the trigger).
9. Reinforcement rule: every fundamental must be `fundamentalsTaught` in 1 block AND `fundamentalsReinforced` in ≥2 other blocks.
10. Authoring lint: text fields (`explanation`, every `hints[i]`) must fit under declared `deviceConstraints.maxResponseChars`.

**Skill creation task:**

Run `skill-creator` with the spec above. Output path: `/mnt/skills/user/topshelf-content-pack-authoring/SKILL.md`. Do NOT proceed to Phase 1 until skill exists and passes its own eval.

**Owner**: Architect agent
**Estimated effort**: 45–60 min one-time investment, amortized across all future TopShelf packs

---

## Agent responsibility legend

- **Architect** — schemas, types, contracts. Owns: shape definitions, what's possible.
- **Refactor** — code shape changes. Owns: implementation of contracts, file layout.
- **Guard** — validation rules, IP safety, semantic checks. Owns: enforcement, what's blocked.
- **Auditor** — tests, fixtures, review, final sign-off. Owns: proof of correctness.

---

## Phase 0 — Pre-flight (sequential, blocks all other work)

### T0.1 — Repo state baseline

**Agent**: Architect
**Skill**: none
**Deps**: none
**Parallelizable**: no

**Steps:**

- `cd` into the `peteywee/teach` repo root.
- `git status` — confirm clean working tree.
- `git log -10 packages/shared/src/schemas/content.schema.ts` — capture last-modified commit hash.
- `git log -10 packages/content-authoring/src/validation/content-validator.ts` — capture hash.
- `git log -10 packages/content-authoring/src/cli/validate-packs.ts` — capture hash.
- `git log -10 content-packs/content_pack_uncle_julios_v1.json` — capture hash.
- Note: `cat package.json | grep packageManager` — confirm `pnpm@10.33.3`.
- Note: `node --version` — confirm `>= 20`.

**Acceptance criteria:**

- Clean working tree confirmed.
- Four file hashes recorded in batch ledger.
- pnpm 10.33.3 + Node 20+ confirmed.

**If dirty:** stash with `git stash push -m "pre-uj-v0.1"` or commit on a side branch before proceeding. Do NOT begin Phase 1 until clean.

---

### T0.2 — Create `topshelf-content-pack-authoring` skill

**Agent**: Architect
**Skill**: skill-creator (existing)
**Deps**: T0.1
**Parallelizable**: no

**Steps:**

- Invoke skill-creator with spec from "NEW SKILL" section above.
- Verify SKILL.md is written to `/mnt/skills/user/topshelf-content-pack-authoring/SKILL.md`.
- Run skill-creator's eval against 3 sample tasks: "add a new teaching block", "add a contentLinks reference", "extend triggerRules with a new type". Confirm the skill provides actionable guidance for each.
- If eval fails or skill is too thin, iterate before unblocking Phase 1.

**Acceptance criteria:**

- Skill file exists.
- Skill covers all 10 content areas listed in skill spec.
- Eval passes on sample tasks (or skill is iterated until it does).

---

### T0.3 — Branch and ledger setup

**Agent**: Architect
**Skill**: none
**Deps**: T0.2
**Parallelizable**: no

**Steps:**

- `git checkout -b feat/uj-pack-v0.1-rebuild` from main.
- Create `/.batch-ledger/uj-v0.1.md` (gitignored) — running log for parallel agent coordination. Initialize with: branch name, base commit, list of all task IDs from this plan, status `PENDING` for each.

**Acceptance criteria:**

- Branch created.
- Ledger file exists and lists every task ID.

---

## Phase 1 — Schema (sequential, blocks Phase 2)

Schema must land first because the manifest is `.strict()` — adding any field to a pack JSON without the schema accepting it causes immediate validation failure.

### T1.1 — Extend `packages/shared/src/schemas/content.schema.ts`

**Agent**: Architect
**Skill**: topshelf-content-pack-authoring
**Deps**: T0.3
**Parallelizable across sub-tasks**: NO (single-file edits, must be sequential within T1.1)
**File**: `packages/shared/src/schemas/content.schema.ts`

#### T1.1a — Add new enum and atomic schemas

**Sub-tasks:**

- Add `sourceDataStatusSchema` — `z.enum(['demo', 'authorized', 'requires-client-source', 'deprecated'])`.
- Add `retentionSchema` — `z.object({ reassessAfterDays: z.number().int().min(1).max(365), decayHalfLifeDays: z.number().int().min(1).max(365) }).strict()`.
- Add `trainerNotesSchema` — `z.string().min(1).max(1000)`.
- Add `recoveryPlaySchema` — `z.string().min(1).max(400)`.
- Add `realWorldImpactSchema` — `z.string().min(1).max(400)`.
- Confirm no duplication with existing schema exports.

**AC:** File compiles; new schemas exported from this file.

#### T1.1b — Add `contentLinksSchema`

**Sub-tasks:**

- Define with strict shape:
  - `sourceModuleId: z.string().regex(/^MD6-[a-zA-Z0-9_-]+$/)`
  - `fundamentalsTaught: z.array(z.string().regex(/^FT5-[a-zA-Z0-9_-]+$/)).readonly()`
  - `fundamentalsReinforced: z.array(z.string().regex(/^FT5-[a-zA-Z0-9_-]+$/)).readonly()` (NEW vs my prior plan)
  - `downtimeDecisions: z.array(z.string().regex(/^DT8-[a-zA-Z0-9_-]+$/)).readonly()`
  - `chaosEvents: z.array(z.string().regex(/^CE9-[a-zA-Z0-9_-]+$/)).readonly()`
  - `externalAssessmentId: z.string().regex(/^AS7-[a-zA-Z0-9_-]+$/).nullable()`
  - `ticketFlows: z.array(z.string().regex(/^RC4-[a-zA-Z0-9_-]+$/)).readonly()`
- `.strict()` applied.

**AC:** Schema accepts the link map from earlier; rejects malformed IDs.

#### T1.1c — Add `deviceConstraintsSchema`

**Sub-tasks:**

- `z.object({ maxResponseChars: z.number().int().min(200).max(50000) }).strict()`.
- Min 200 prevents accidental tiny caps; max 50000 prevents the cap from being meaningless.

**AC:** Schema accepts realistic values; rejects 0 or negative.

#### T1.1d — Add `triggerRuleSchema` (discriminated union)

**Sub-tasks:**

- Five variants:
  - `{ type: 'stuck_time', thresholdSeconds: z.number().int().min(15).max(600) }`
  - `{ type: 'repeated_errors', threshold: z.number().int().min(1).max(10) }`
  - `{ type: 'help_requested', enabled: z.boolean() }`
  - `{ type: 'idle_drop', thresholdDays: z.number().int().min(1).max(60) }`
  - `{ type: 'frequency_decline', baselineDays: z.number().int().min(7).max(90), declineRatio: z.number().min(0.1).max(0.9) }`
- All variants `.strict()`.
- Use `z.discriminatedUnion('type', [...])`.

**AC:** Each variant accepts its proper shape; cross-variant fields rejected.

#### T1.1e — Extend `commonErrorSchema`

**Sub-tasks:**

- Add optional `recoveryPlay: recoveryPlaySchema.optional()`.
- Add optional `realWorldImpact: realWorldImpactSchema.optional()`.
- Existing fields unchanged.

**AC:** Existing common errors still validate; new fields optional and validated when present.

#### T1.1f — Extend `teachingBlockSchema`

**Sub-tasks:**

- Add optional `contentLinks: contentLinksSchema.optional()`.
- Add optional `deviceConstraints: deviceConstraintsSchema.optional()`.
- Add optional `triggerRules: z.array(triggerRuleSchema).readonly().optional()`.
- Add optional `retention: retentionSchema.optional()`.
- Add optional `trainerNotes: trainerNotesSchema.optional()`.
- Existing fields unchanged.
- `.strict()` re-applied (verify it survives the extension).

**AC:** Existing teaching blocks still validate; new fields accepted when present.

#### T1.1g — `contentPackManifestSchema` (no locale change in v0.1)

**Sub-tasks:**

- DO NOT add `locale` or `translationStatus` (deferred to v0.2 per Patrick's call).
- Verify the schema's `.strict()` still rejects unknown fields.
- No other manifest-level changes.

**AC:** Manifest schema unchanged from current main except for transitive type changes from teachingBlock extensions.

---

### T1.2 — Schema index export

**Agent**: Architect
**Skill**: topshelf-content-pack-authoring
**Deps**: T1.1
**File**: `packages/shared/src/schemas/index.ts`

**Steps:**

- Export every new schema from T1.1: `sourceDataStatusSchema`, `retentionSchema`, `contentLinksSchema`, `deviceConstraintsSchema`, `triggerRuleSchema`, plus the inferred TypeScript types.
- Verify nothing else in the export is broken.

**AC:**

- `pnpm --filter @topshelf/shared typecheck` passes.
- `pnpm --filter @topshelf/shared build` passes.
- New types importable from `@topshelf/shared` in dependent packages.

---

### T1.3 — Type-driven downstream impact scan

**Agent**: Architect
**Skill**: none
**Deps**: T1.2
**Parallelizable**: no

**Steps:**

- `pnpm --filter @topshelf/content-authoring typecheck` — see if anything broke.
- `pnpm --filter @topshelf/api-server typecheck` — same.
- `pnpm --filter @topshelf/web typecheck` — same.
- For each break, log the file/line in the ledger. Most should be zero (everything's optional).
- Address any breaks before unblocking Phase 2.

**AC:** All packages typecheck against the new schemas.

---

## Phase 2 — Parallel batch (4 streams, all start after T1.3)

After Phase 1 lands, four streams run in parallel. Each stream is self-contained. No stream blocks any other stream.

### Stream A — Validator semantic rules

**Agent**: Guard (primary), Refactor (assist)
**Skill**: topshelf-content-pack-authoring
**File**: `packages/content-authoring/src/validation/content-validator.ts`

#### T2.A1 — Add maxResponseChars enforcement

**Sub-tasks:**

- In `validateContentConsistency`, after schema validation, iterate `pack.teachingBlocks`.
- For each block with `deviceConstraints?.maxResponseChars` set:
  - Check `block.explanation.length <= cap` → emit `TEXT_OVER_DEVICE_CAP` error if not.
  - Check every `block.hints[i].length <= cap` → emit per-hint error if not.
- Error code: `TEXT_OVER_DEVICE_CAP`. Path: `teachingBlocks.${block.id}.{field}`.

**AC:** A test fixture with a 1000-char explanation under a 500-char cap produces exactly one error with the right code.

#### T2.A2 — Add fundamentals reinforcement check

**Sub-tasks:**

- Build a Map<fundamentalId, { taughtIn: blockId[], reinforcedIn: blockId[] }>.
- For each block's `contentLinks`, populate the map.
- Validation rule: every fundamental that appears in any block's `fundamentalsTaught` MUST appear in `fundamentalsReinforced` of ≥2 OTHER blocks.
- Error code: `INSUFFICIENT_REINFORCEMENT`. Path: `teachingBlocks.contentLinks.fundamentalsReinforced`. Message includes which fundamental is under-reinforced.

**AC:** Fixture with FT5-clean-as-you-go taught in 1 block but reinforced in only 1 other → error fires.

#### T2.A3 — Per-pack-id orphan check (existing rule from prior plan, refined)

**Sub-tasks:**

- ONLY for `pack.id === 'pack-uncle-julios-v1'`.
- Required IDs (declared structurally in this rule, not from external registry):
  - fundamentals: `['FT5-clean-as-you-go', 'FT5-communication', 'FT5-safety-first']`
  - downtimeDecisions: `['DT8-restock-reset-clean']`
  - chaosEvents: `['CE9-rush-ticket', 'CE9-missing-tool', 'CE9-quality-check']`
  - assessments: `['AS7-orientation-check', 'AS7-station-readiness-check', 'AS7-final-pack-gate']`
  - ticketFlows: `['RC4-demo-ticket-flow']`
- Aggregate every reference across ALL blocks' `contentLinks` (fundamentalsTaught, fundamentalsReinforced, downtimeDecisions, chaosEvents, externalAssessmentId, ticketFlows).
- Each required ID must appear in the aggregate at least once.
- Error code: `UNCLE_JULIOS_ORPHAN_CONTENT_LINK`.

**AC:** Pack with all required IDs referenced → 0 errors. Pack missing CE9-rush-ticket → 1 error with that ID in message.

#### T2.A4 — Trigger threshold tier enforcement

**Sub-tasks:**

- Identify safety-critical blocks by ID prefix or explicit list:
  - `tb-uj-orientation-safety`, `tb-uj-tools-color-barriers` (and any block with `safety` or `safe` in concept).
- For these blocks, validate:
  - If `triggerRules` includes a `stuck_time` rule, `thresholdSeconds <= 45`.
  - If includes `repeated_errors`, `threshold === 1`.
- Error code: `SAFETY_TRIGGER_TOO_LENIENT`.

**AC:** Safety block with stuck_time=90s → error. Safety block with stuck_time=30s → no error.

#### T2.A5 — IP safety check

**Sub-tasks:**

- Scan all string fields in pack (`description`, every block's `concept`, `canonicalSolution`, `explanation`, `hints[]`, `commonErrors[*].description`/`remediation`/`recoveryPlay`/`realWorldImpact`).
- Pattern (case-insensitive): `/official\s+uncle\s+julio'?s/`.
- If matched AND the enclosing variant's `data.sourceDataStatus !== 'authorized'` (or no surrounding variant — i.e., it's at block-level): emit error.
- Error code: `UNAUTHORIZED_PROPRIETARY_CLAIM`. Path points to the offending field.

**AC:** Block with "official Uncle Julio's SOP" in explanation while sourceDataStatus is `demo` → error. Same text with status=`authorized` and sourceDataNotes populated → no error.

#### T2.A6 — Source-module-ID consistency check (already in plan)

**Sub-tasks:**

- For each variant in each block: if `block.contentLinks?.sourceModuleId` set AND `variant.data.sourceModuleId` set → must be equal.
- Error code: `SOURCE_MODULE_ID_MISMATCH`.

**AC:** Mismatch → 1 error per variant with mismatch.

**Stream A overall AC:**

- All 6 rules implemented in `validateContentConsistency`.
- Existing rules still pass (no regressions).
- `pnpm --filter @topshelf/content-authoring test` still green (this stream doesn't write tests yet — that's Stream D + Phase 3).

---

### Stream B — CLI hardening

**Agent**: Refactor
**Skill**: topshelf-content-pack-authoring
**File**: `packages/content-authoring/src/cli/validate-packs.ts`

#### T2.B1 — Accept file/directory args

**Sub-tasks:**

- Change `main()` to read `process.argv.slice(2)`.
- If args provided: validate each path (file or directory).
- If no args: scan `CANDIDATE_DIRECTORIES` (existing behavior).
- Export `validateContentPackArtifacts(inputPaths)` for direct import in tests.

**AC:** `pnpm validate:content-packs path/to/specific.json` works. `pnpm validate:content-packs` with no args still works.

#### T2.B2 — Wire up `validateContentPack`

**Sub-tasks:**

- For each JSON file: parse, check shape (`teachingBlocks` array → ContentPack; `schemaVersion === 'resource-pack.v1'` → resource pack; kitchen-challenge shape → kitchen pack).
- For ContentPack files: call `validateContentPack(parsed, { skipParityCheck: true, skipSignatureCheck: false })`.
- For resource packs: existing carve-out (do not strict-validate).
- For kitchen-challenge JSONs: existing carve-out.
- Format errors as `{file, message: ${code} at ${path}: ${message}}`.

**AC:** Running CLI on the Uncle Julio's pack triggers the full validator chain. Running on a kitchen challenge does not break.

#### T2.B3 — Filename ↔ ID match

**Sub-tasks:**

- In `validateFilenameIdMatch`: if filename starts with `content_pack_`, derive expected `id` as `pack-${slug.replace(/_/g, '-')}` (e.g., `content_pack_uncle_julios_v1.json` → `pack-uncle-julios-v1`).
- Note the `_v1` → `-v1` translation; verify against existing `pack-linux-fundamentals-v1` etc.
- Emit error if mismatch.

**AC:** Renaming the file or changing the inner ID → error. Match → no error.

#### T2.B4 — Exit code discipline

**Sub-tasks:**

- If any errors: print all, exit 1.
- If zero: print `[validate:packs] OK.`, exit 0.
- Verify no test-only paths exit early without proper code.

**AC:** Hand-induced break causes non-zero exit; clean run is exit 0.

**Stream B overall AC:**

- CLI accepts args.
- `validateContentPackArtifacts` is importable.
- Filename match enforced.
- Exit codes correct.

---

### Stream C — Pack content rewrite

**Agent**: Refactor (primary), Guard (review for IP safety as content lands)
**Skill**: topshelf-content-pack-authoring
**File**: `content-packs/content_pack_uncle_julios_v1.json`

#### T2.C1 — Bump version, fix metadata

**Sub-tasks:**

- `version`: `0.1.0-demo` → `0.1.0` (drop `-demo` suffix; `sourceDataStatus: demo` on assets says it).
- `description`: rewrite to reflect v0.1 reality — distributed assessment, micro-credentialing, recovery-first failure handling. Keep the "demo content; brand-specific fields require authorized source" disclaimer.
- `updatedAt`: today's date in ISO.
- Do NOT add `locale` or `translationStatus`.
- Do NOT touch `signature` or `signingKeyId` — those are signing-pipeline concerns.

**AC:** Top-level fields conform to current schema (post-T1).

#### T2.C2 — Per-block: add contentLinks (8 blocks)

**Sub-tasks per block (one block = one sub-task):**

For each `tb-uj-*` block, add `contentLinks` object. Use this map (revised to satisfy reinforcement rule — every fundamental taught in 1 block is reinforced in ≥2 others):

| Block                        | sourceModuleId             | fundamentalsTaught      | fundamentalsReinforced                                       | downtimeDecisions           | chaosEvents                                              | externalAssessmentId          | ticketFlows              |
| ---------------------------- | -------------------------- | ----------------------- | ------------------------------------------------------------ | --------------------------- | -------------------------------------------------------- | ----------------------------- | ------------------------ |
| `tb-uj-orientation-safety`   | `MD6-orientation-safety`   | `[FT5-safety-first]`    | `[FT5-communication]`                                        | `[]`                        | `[CE9-quality-check]`                                    | `AS7-orientation-check`       | `[]`                     |
| `tb-uj-tools-color-barriers` | `MD6-tools-color-barriers` | `[]`                    | `[FT5-safety-first, FT5-clean-as-you-go]`                    | `[]`                        | `[CE9-missing-tool]`                                     | `null`                        | `[]`                     |
| `tb-uj-station-setup`        | `MD6-station-setup`        | `[FT5-clean-as-you-go]` | `[FT5-safety-first, FT5-communication]`                      | `[DT8-restock-reset-clean]` | `[CE9-missing-tool]`                                     | `AS7-station-readiness-check` | `[]`                     |
| `tb-uj-line-readiness`       | `MD6-line-readiness`       | `[FT5-communication]`   | `[FT5-safety-first]`                                         | `[DT8-restock-reset-clean]` | `[CE9-rush-ticket]`                                      | `null`                        | `[]`                     |
| `tb-uj-ticket-flow-basics`   | `MD6-ticket-flow-basics`   | `[]`                    | `[FT5-communication, FT5-safety-first]`                      | `[]`                        | `[CE9-rush-ticket]`                                      | `null`                        | `[RC4-demo-ticket-flow]` |
| `tb-uj-downtime-decisions`   | `MD6-downtime-decisions`   | `[]`                    | `[FT5-clean-as-you-go, FT5-communication]`                   | `[DT8-restock-reset-clean]` | `[]`                                                     | `null`                        | `[]`                     |
| `tb-uj-cleaning-reset`       | `MD6-cleaning-reset`       | `[]`                    | `[FT5-clean-as-you-go, FT5-safety-first]`                    | `[DT8-restock-reset-clean]` | `[CE9-rush-ticket]`                                      | `null`                        | `[]`                     |
| `tb-uj-assessment-gate`      | `MD6-assessment-gate`      | `[]`                    | `[FT5-safety-first, FT5-communication, FT5-clean-as-you-go]` | `[DT8-restock-reset-clean]` | `[CE9-rush-ticket, CE9-missing-tool, CE9-quality-check]` | `AS7-final-pack-gate`         | `[RC4-demo-ticket-flow]` |

**Reinforcement audit (validates against T2.A2):**

- `FT5-safety-first`: taught in orientation-safety; reinforced in tools-color-barriers, station-setup, line-readiness, ticket-flow-basics, cleaning-reset, assessment-gate. ✓ (≥2)
- `FT5-clean-as-you-go`: taught in station-setup; reinforced in tools-color-barriers, downtime-decisions, cleaning-reset, assessment-gate. ✓
- `FT5-communication`: taught in line-readiness; reinforced in orientation-safety, station-setup, ticket-flow-basics, downtime-decisions, assessment-gate. ✓

**AC:** All 8 blocks have contentLinks. Reinforcement rule satisfied. Per-pack orphan check satisfied (every required ID appears at least once).

#### T2.C3 — Per-block: add deviceConstraints (8 blocks)

**Sub-tasks:**

- Set `deviceConstraints.maxResponseChars: 2000` on every block.
- Verify each block's `explanation` and every `hints[i]` is currently under 2000 chars (most are 600–1800; spot-check the longer explanations).
- 2000 is the future-regression guard, not an immediate trim target. If any current text exceeds 2000, that block needs prose tightening as a separate sub-task before this validates.

**AC:** All 8 blocks have `deviceConstraints`. Validator T2.A1 emits zero `TEXT_OVER_DEVICE_CAP` errors against the pack.

#### T2.C4 — Per-block: add triggerRules (8 blocks)

**Sub-tasks per block:**

| Block                        | triggerRules                                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `tb-uj-orientation-safety`   | `[{stuck_time, thresholdSeconds: 30}, {repeated_errors, threshold: 1}, {help_requested, enabled: true}, {idle_drop, thresholdDays: 3}]` |
| `tb-uj-tools-color-barriers` | `[{stuck_time, thresholdSeconds: 45}, {repeated_errors, threshold: 1}, {help_requested, enabled: true}, {idle_drop, thresholdDays: 7}]` |
| `tb-uj-station-setup`        | `[{stuck_time, thresholdSeconds: 60}, {repeated_errors, threshold: 2}, {help_requested, enabled: true}]`                                |
| `tb-uj-line-readiness`       | `[{stuck_time, thresholdSeconds: 75}, {repeated_errors, threshold: 2}, {help_requested, enabled: true}]`                                |
| `tb-uj-ticket-flow-basics`   | `[{stuck_time, thresholdSeconds: 60}, {repeated_errors, threshold: 2}, {help_requested, enabled: true}]`                                |
| `tb-uj-downtime-decisions`   | `[{stuck_time, thresholdSeconds: 90}, {help_requested, enabled: true}]`                                                                 |
| `tb-uj-cleaning-reset`       | `[{stuck_time, thresholdSeconds: 90}, {help_requested, enabled: true}]`                                                                 |
| `tb-uj-assessment-gate`      | `[]` (manager IS the trigger; empty array allowed by schema)                                                                            |

**AC:** Each block has its rules. T2.A4 (safety threshold check) passes.

#### T2.C5 — Per-block: add retention (8 blocks)

**Sub-tasks:**

| Block                        | reassessAfterDays | decayHalfLifeDays | Rationale                               |
| ---------------------------- | ----------------- | ----------------- | --------------------------------------- |
| `tb-uj-orientation-safety`   | 30                | 21                | Safety habits decay fast on a busy line |
| `tb-uj-tools-color-barriers` | 30                | 21                | Same — sanitation cohort                |
| `tb-uj-station-setup`        | 60                | 45                | Procedural; degrades slower             |
| `tb-uj-line-readiness`       | 60                | 45                | Same                                    |
| `tb-uj-ticket-flow-basics`   | 45                | 30                | Reinforced by daily use; mid-decay      |
| `tb-uj-downtime-decisions`   | 90                | 60                | Habit, less drift                       |
| `tb-uj-cleaning-reset`       | 30                | 21                | Sanitation cohort                       |
| `tb-uj-assessment-gate`      | 180               | 120               | Annual-ish recertification              |

**AC:** Each block has retention.

#### T2.C6 — Per-block: add trainerNotes (8 blocks)

**Sub-tasks:**

- Author 200–400 char note per block, voice-of-experience, NOT duplicating explanation.
- Format: "What to watch for: [specific]. Common mismatch with the standard: [specific]. When to override the system and demonstrate: [specific]."
- Each note must be authored by Patrick or his agent — not me. Patrick's 15+ years of food service experience is the source. I can scaffold the structure; the content is his.

**ALTERNATIVE if Patrick wants this stream to land without his bottleneck:** 8 placeholder trainerNotes with `sourceDataStatus: requires-client-source` semantics (note: trainerNotes itself doesn't have a status field — handle by including the placeholder text and a `sourceDataNotes` reference at block level).

**AC:** All 8 blocks have trainerNotes (real or placeholder).

#### T2.C7 — Per-block: extend commonErrors with recoveryPlay + realWorldImpact

**Sub-tasks:**

- For each block, pick the 3 highest-impact `commonErrors` (so 24 total across the pack).
- For each chosen error, author:
  - `recoveryPlay`: 100–300 chars. Imperative. Mid-service-applicable. "Stop. Swap board. Wash hands. Continue ticket count."
  - `realWorldImpact`: 50–200 chars. Concrete. Demo-status framing OK ("Generic industry estimate: a missed handwash event during a 60-cover service means ~3 plates re-fired, $12 waste"). NO fake "Uncle Julio's loses $X" claims (will fail T2.A5).
- Same Patrick-as-source-of-truth note as T2.C6 — these are line-experience artifacts, scaffolded by me, authored by him.

**AC:** 24 commonErrors have both fields. T2.A5 (IP safety) passes against all of them.

**Stream C overall AC:**

- Pack JSON validates clean against the new schema (T1).
- Per-pack orphan check passes (T2.A3).
- Reinforcement rule passes (T2.A2).
- Safety trigger threshold rule passes (T2.A4).
- IP safety rule passes (T2.A5).
- Text-cap rule passes (T2.A1).

---

### Stream D — Test fixtures

**Agent**: Auditor
**Skill**: topshelf-content-pack-authoring
**Files**: New, under `packages/content-authoring/src/fixtures/content-packs/`

#### T2.D1 — Valid fixture

**Sub-tasks:**

- Create directory: `packages/content-authoring/src/fixtures/content-packs/valid-uncle-julios/`
- Create file: `content_pack_valid_fixture_v1.json` — minimal valid pack with `id: pack-valid-fixture-v1`, 1 teaching block, all v0.1 extensions present, no orphan IDs (custom required-ID list bypassed since pack-id ≠ uncle-julios).

**AC:** When validator runs against this fixture: zero errors.

#### T2.D2 — One bad fixture per failure mode (8 bad fixtures)

Each in its own directory with its own JSON file:

- `bad-missing-solve-first/content_pack_bad_missing_solve_first_v1.json`: variant has `sourceDataStatus: demo` but solve-first variant declares non-`solve_first` shape. **Triggers**: schema-level error.
- `bad-filename-id-mismatch/content_pack_bad_filename_v1.json`: file named `..._bad_filename_v1` but `id: pack-something-else-v1`. **Triggers**: T2.B3.
- `bad-orphan-link/content_pack_bad_orphan_link_v1.json`: `pack.id === 'pack-uncle-julios-v1'` but missing `CE9-rush-ticket` from all contentLinks. **Triggers**: T2.A3.
- `bad-over-response-cap/content_pack_bad_over_cap_v1.json`: `deviceConstraints.maxResponseChars: 500` but `explanation.length === 1200`. **Triggers**: T2.A1.
- `bad-help-threshold/content_pack_bad_help_threshold_v1.json`: triggerRules includes `{type: 'help_requested', threshold: 5}` (wrong key — should be `enabled`). **Triggers**: schema discriminated union rejection.
- `bad-proprietary-claim/content_pack_bad_proprietary_v1.json`: explanation says "official Uncle Julio's recipe" with `sourceDataStatus: demo`. **Triggers**: T2.A5.
- `bad-insufficient-reinforcement/content_pack_bad_reinforcement_v1.json`: 4 blocks, FT5-foo `fundamentalsTaught` in 1 block, `fundamentalsReinforced` in only 1 other. **Triggers**: T2.A2.
- `bad-safety-trigger-too-lenient/content_pack_bad_safety_trigger_v1.json`: block named `tb-orientation-safety` with `stuck_time: 90`. **Triggers**: T2.A4.

**AC:** Each fixture exists. Each, when run through real validator, produces exactly the expected error code.

**Stream D overall AC:** 1 valid + 8 bad fixtures, each isolated in its own directory, each tested against the real validator (this is verified in Phase 3).

---

## Phase 3 — Tests (sequential, depends on Stream D + Stream A)

### T3.1 — Test file: validator integration

**Agent**: Auditor
**Skill**: topshelf-content-pack-authoring
**Deps**: T2.D2 (all fixtures), T2.A1–T2.A6 (all rules)
**File**: `packages/content-authoring/src/cli/validate-packs.test.ts` (new)

**Sub-tasks:**

- Import `validateContentPackArtifacts` from `./validate-packs.js` (NOT a re-implementation).
- For valid fixture: assert returns empty array.
- For each bad fixture: assert returns at least one issue with the expected error code.
- Test passes when all 9 assertions hold.

**AC:**

- File compiles.
- `pnpm --filter @topshelf/content-authoring test` runs this file.
- All 9 cases pass.

### T3.2 — Test: full Uncle Julio's pack

**Agent**: Auditor
**Skill**: none
**Deps**: T2.C7
**File**: `packages/content-authoring/src/cli/validate-packs.test.ts` (append to T3.1's file)

**Sub-tasks:**

- New `it('uncle-julios pack v0.1 validates clean', async () => {...})`.
- Call `validateContentPackArtifacts(['content-packs/content_pack_uncle_julios_v1.json'])` (path relative to repo root).
- Assert returns empty array.

**AC:** Real Uncle Julio's pack validates clean against the real validator.

### T3.3 — Test: schema unit tests

**Agent**: Auditor
**Skill**: topshelf-content-pack-authoring
**Deps**: T1.2
**File**: `packages/shared/src/schemas/content.schema.test.ts` (new or extend existing)

**Sub-tasks:**

- For each new schema (contentLinks, deviceConstraints, triggerRule, retention): one accept case, one reject case per major field.
- For triggerRuleSchema discriminated union: one accept per variant, one cross-variant reject.

**AC:** All schema unit tests green.

---

## Phase 4 — Validation gate (sequential, blocks PR)

### T4.1 — Local CLI run

**Agent**: Auditor
**Skill**: none
**Deps**: T3.\*
**Command**: `pnpm validate:content-packs`

**AC:** Exit 0. Stdout: `[validate:packs] OK.`

### T4.2 — Test suite

**Agent**: Auditor
**Command**: `pnpm test`

**AC:** Exit 0. All pre-existing tests still pass. New tests pass.

### T4.3 — Format/lint/typecheck

**Agent**: Auditor
**Commands**: `pnpm format:check && pnpm lint && pnpm typecheck`

**AC:** All three exit 0.

### T4.4 — Build

**Agent**: Auditor
**Command**: `pnpm build`

**AC:** Exit 0.

### T4.5 — Capture output

**Agent**: Auditor
**Sub-tasks:**

- Save full output of T4.1–T4.4 to `.batch-ledger/uj-v0.1-validation.txt`.
- This is the proof-of-passes for the PR description.

**AC:** File exists with all 4 commands' output.

---

## Phase 5 — PR prep

### T5.1 — Changelog entry

**Agent**: Architect
**Skill**: none
**Deps**: T4.5
**File**: `CHANGELOG.md` (or append to existing release notes)

**Sub-tasks:**

- Add entry: schema additions, validator rule additions, pack v0.1.0 publication.
- Note: locale/i18n deferred to v0.2.

### T5.2 — PR description

**Agent**: Architect
**Sub-tasks:**

- Title: `feat(content): Uncle Julio's pack v0.1 — distributed assessment, retention, content links`
- Body covers:
  - Why (high-turnover ops reality, micro-credentialing, distributed gate, recovery-first).
  - What changed (schema, validator, CLI, pack content).
  - Validation results (paste `.batch-ledger/uj-v0.1-validation.txt`).
  - Out of scope: Spanish/i18n (v0.2).
  - Out of scope: real ECDSA signing (existing pipeline concern, not pack concern).
  - Authorized-source items still pending: list every `sourceDataStatus: demo` and `requires-client-source` field that needs Uncle Julio's / Sun Holdings input before re-classification to `authorized`.

### T5.3 — Self-review pass

**Agent**: Auditor (different sub-agent than T3 if possible)
**Sub-tasks:**

- Re-run validator and tests on a fresh checkout of the branch.
- Read every changed file end-to-end.
- Confirm IP-safety rule actually catches the test fixture (don't take the test result on faith — try a manual edit).

**AC:** No surprises. Branch ready for upstream review.

---

## Parallel execution graph

```
T0.1 ─→ T0.2 ─→ T0.3 ─→ T1.1 ─→ T1.2 ─→ T1.3 ─┐
                                              │
                                              ├─→ Stream A (T2.A1..A6) ─┐
                                              ├─→ Stream B (T2.B1..B4) ─┤
                                              ├─→ Stream C (T2.C1..C7) ─┼─→ T3.1 ─→ T3.2
                                              └─→ Stream D (T2.D1..D2) ─┘    │
                                                                              │
                                                                              ├─→ T3.3
                                                                              │
                                                                              └─→ T4.1 ─→ T4.2 ─→ T4.3 ─→ T4.4 ─→ T4.5 ─→ T5.1 ─→ T5.2 ─→ T5.3
```

**Critical path (longest sequential chain):**
T0.1 → T0.2 → T0.3 → T1.1 → T1.2 → T1.3 → Stream C (longest of the 4) → T3.2 → T4.1 → T4.2 → T4.3 → T4.4 → T4.5 → T5.1 → T5.2 → T5.3

**Hard parallelism point:** Streams A, B, C, D all start the moment T1.3 lands. Each needs a separate working directory or careful coordination on shared files (none of the four streams touch the same file, so plain branch + multiple working trees works).

---

## Things explicitly NOT in this plan (deferred)

- Spanish locale / `translationStatus` field — v0.2.
- Real ECDSA-P256 content signing — existing repo signing pipeline concern.
- Authorized brand content for any `sourceDataStatus: requires-client-source` field — needs Uncle Julio's / Sun Holdings agreement and source.
- `pack_kind` manifest field from the prior plan — not adopted (no use case in v0.1).
- `manifest.registries` style refactor — not adopted (single-file shape stays).
- New badge issuance flow — out of scope; uses existing `roleMappings`.

---

## Single-page checklist (for execution tracking)

```
[ ] T0.1  Repo state baseline                             Architect
[ ] T0.2  Create topshelf-content-pack-authoring skill    Architect + skill-creator
[ ] T0.3  Branch + ledger                                 Architect
[ ] T1.1  Schema extension (a-g)                          Architect
[ ] T1.2  Schema index export                             Architect
[ ] T1.3  Downstream typecheck                            Architect
[ ] T2.A1 Validator: maxResponseChars                     Guard
[ ] T2.A2 Validator: reinforcement                        Guard
[ ] T2.A3 Validator: per-pack orphan                      Guard
[ ] T2.A4 Validator: safety triggers                      Guard
[ ] T2.A5 Validator: IP safety                            Guard
[ ] T2.A6 Validator: source-module consistency            Guard
[ ] T2.B1 CLI: file/directory args                        Refactor
[ ] T2.B2 CLI: validateContentPack wiring                 Refactor
[ ] T2.B3 CLI: filename↔ID match                          Refactor
[ ] T2.B4 CLI: exit codes                                 Refactor
[ ] T2.C1 Pack: top-level metadata                        Refactor
[ ] T2.C2 Pack: contentLinks (8 blocks)                   Refactor
[ ] T2.C3 Pack: deviceConstraints (8 blocks)              Refactor
[ ] T2.C4 Pack: triggerRules (8 blocks)                   Refactor
[ ] T2.C5 Pack: retention (8 blocks)                      Refactor
[ ] T2.C6 Pack: trainerNotes (8 blocks)                   Refactor (Patrick voice)
[ ] T2.C7 Pack: recoveryPlay + realWorldImpact (24 errs)  Refactor (Patrick voice)
[ ] T2.D1 Fixture: valid                                  Auditor
[ ] T2.D2 Fixtures: 8 bad cases                           Auditor
[ ] T3.1  Test: validator integration                     Auditor
[ ] T3.2  Test: real UJ pack                              Auditor
[ ] T3.3  Test: schema units                              Auditor
[ ] T4.1  Validation: CLI run                             Auditor
[ ] T4.2  Validation: tests                               Auditor
[ ] T4.3  Validation: format/lint/typecheck               Auditor
[ ] T4.4  Validation: build                               Auditor
[ ] T4.5  Capture output                                  Auditor
[ ] T5.1  Changelog                                       Architect
[ ] T5.2  PR description                                  Architect
[ ] T5.3  Self-review                                     Auditor (fresh)
```
