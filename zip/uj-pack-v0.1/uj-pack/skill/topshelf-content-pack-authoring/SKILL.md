---
name: topshelf-content-pack-authoring
description: Authoring guide for Top Shelf Service content packs targeting the peteywee/teach repo (Fresh Schedules / restaurant brand training). Use this skill any time you're creating, extending, or validating a `content-packs/content_pack_*.json` file in that repo, or modifying the underlying schema, validator, or CLI in `packages/shared/src/schemas/content.schema.ts`, `packages/content-authoring/src/validation/content-validator.ts`, or `packages/content-authoring/src/cli/validate-packs.ts`. Triggers on phrases like "new content pack," "Uncle Julio's pack," "Sun Holdings pack," "add a teaching block," "extend the validator," "Fresh Schedules training content," or any request authoring brand-specific BoH training material under the Top Shelf umbrella. Does NOT trigger for kitchen-challenge JSONs (`content-packs/kitchen/*.json`) — those use a separate `resourcePack/kitchen-challenge` schema.
---

# Top Shelf Content Pack Authoring (v0.1)

This skill encodes the patterns established by the Uncle Julio's pack v0.1 rebuild. Future Sun Holdings packs (Burger King, Popeyes, Applebee's) and any other brand-specific packs in the `peteywee/teach` repo should follow these conventions to prevent drift.

## Repo orientation

- **Pack file**: single JSON at `content-packs/content_pack_<brand>_v1.json`
- **Schema**: `packages/shared/src/schemas/content.schema.ts` — Zod, camelCase, `.strict()`
- **Validator**: `packages/content-authoring/src/validation/content-validator.ts` — semantic rules beyond schema shape
- **CLI**: `packages/content-authoring/src/cli/validate-packs.ts` — entrypoint `pnpm validate:content-packs`
- **Fixtures**: `packages/content-authoring/src/fixtures/content-packs/` — one valid + per-failure-mode bad
- **Tests**: `packages/content-authoring/src/cli/validate-packs.test.ts` and `packages/shared/src/schemas/content.schema.test.ts`

Filename → ID convention: `content_pack_uncle_julios_v1.json` ↔ `pack-uncle-julios-v1`. The validator enforces this.

## Manifest field reference (camelCase, `.strict()`)

Top-level fields on `contentPackManifestSchema`:
- `id` (string, required) — `pack-<brand>-v<n>` format
- `schemaVersion` (string, required) — `content-pack.v1`
- `name` (string, required) — human-readable
- `version` (string, required) — semver, no `-demo` suffix (use `sourceDataStatus: demo` on assets instead)
- `description` (string, required) — short pack summary, no proprietary claims unauthorized
- `updatedAt` (string, required) — ISO date
- `teachingBlocks` (array, required) — see below
- `roleMappings` (existing field, untouched by v0.1)
- `signature`, `signingKeyId` (existing fields, signing-pipeline concerns, untouched by v0.1)

**Do NOT add `locale` or `translationStatus`** until v0.2 with a real co-authored Spanish variant.

## TeachingBlock — base shape + v0.1 extensions

Existing required fields: `id` (`tb-<brand>-<concept>`), `title`, `mode`, `concept`, `canonicalSolution`, `explanation`, `hints[]`, `commonErrors[]`, `surfaceVariants[]`, `assessment[]`, `prerequisites[]`.

New optional v0.1 fields (every block should have all five for full validator coverage):

### `contentLinks`
```json
{
  "sourceModuleId": "MD6-<concept>",
  "fundamentalsTaught": ["FT5-..."],
  "fundamentalsReinforced": ["FT5-..."],
  "downtimeDecisions": ["DT8-..."],
  "chaosEvents": ["CE9-..."],
  "externalAssessmentId": "AS7-..." | null,
  "ticketFlows": ["RC4-..."]
}
```

ID prefixes are enforced by regex in the schema. `MD6` (modules), `FT5` (fundamentals), `DT8` (downtime decisions), `CE9` (chaos events), `AS7` (assessments), `RC4` (recipes/ticket flows).

### `deviceConstraints`
```json
{ "maxResponseChars": 2000 }
```
Use 2000 as the default. The validator rule `TEXT_OVER_DEVICE_CAP` checks `explanation.length` and every `hints[i].length` against this cap. 200–50000 is the schema range.

### `triggerRules` (discriminated union, by `type`)

Five variants:
- `{ type: "stuck_time", thresholdSeconds: 15..600 }`
- `{ type: "repeated_errors", threshold: 1..10 }`
- `{ type: "help_requested", enabled: boolean }`
- `{ type: "idle_drop", thresholdDays: 1..60 }`
- `{ type: "frequency_decline", baselineDays: 7..90, declineRatio: 0.1..0.9 }`

**Tier the thresholds by block:**
- **Safety-critical** (`tb-<brand>-orientation-safety`, `tb-<brand>-tools-color-barriers`, anything with `safety`/`safe-handling` in concept): `stuck_time` ≤ 45s, `repeated_errors` threshold === 1. The validator enforces this.
- **Operational** (station-setup, line-readiness, ticket-flow, downtime, cleaning): `stuck_time` 60–90s, `repeated_errors` threshold 2.
- **Assessment gate**: empty `triggerRules: []` — the manager IS the trigger.

### `retention`
```json
{ "reassessAfterDays": 30, "decayHalfLifeDays": 21 }
```
Sanitation + safety blocks: 30/21 (decay fast on a busy line). Procedural blocks (station setup, line readiness): 60/45. Daily-reinforced blocks (ticket flow): 45/30. Habit blocks (downtime): 90/60. Capstone gate: 180/120.

### `trainerNotes`
String, 1–4000 chars. Voice-of-experience, NOT duplicated explanation. Format that works: answer 3 prompts per block — what good looks like / when to demo instead / what kills the habit. Authored by someone with line experience; do not write these from generic training-doc voice.

## CommonError extensions

Optional `recoveryPlay` and `realWorldImpact` on individual common-error entries.

- `recoveryPlay` (1–400 chars) — imperative, mid-service-applicable. "Stop. Swap board. Wash. Continue ticket count." Voice should be how a real cook talks to another cook in the moment, not a help-desk bullet point.
- `realWorldImpact` (1–400 chars) — factual consequence. Dollars when verifiable. Plate quality / guest impact / safety risk when not. **Never** fabricate brand-specific dollar claims like "Uncle Julio's loses $X" without `sourceDataStatus: authorized` — the validator rule `UNAUTHORIZED_PROPRIETARY_CLAIM` will fire.

For each block, add these to the 3 highest-impact common errors. 24 total per pack (3 × 8 blocks).

## Surface variant `data` field conventions

Inside each `surfaceVariant.data`:
- `sourceModuleId` (string) — must match `block.contentLinks.sourceModuleId` if both present (validator enforces)
- `sourceDataStatus` (enum) — `demo` | `authorized` | `requires-client-source` | `deprecated`. `authorized` requires populated `sourceDataNotes`.
- `stationRelevance` (string array) — `ST3-...` IDs
- `roleTarget` (string array) — `new_cook` | `trainer` | `manager` | `admin_demo`
- `inputType` (enum) — `short_answer` | `ordered_steps` | `checklist` | `manager_observation` | `manager_signoff`
- `expectedResponse` (string or array)

## Mode enum

`mode` on a teaching block is one of: `L0`, `L1`, `L2`, `L3`, `L4`. **Never** `L0_SILENT`, `L2_GUIDE`, `L3_EXPLAIN` — those are engine-internal teaching mode constants, NOT pack content.

## Source data status rules

`demo` is the default for any unverified content. `authorized` means there's a real source agreement and `sourceDataNotes` documents it. `requires-client-source` flags content that's pending brand input. `deprecated` is for content kept for migration but not used.

## IP safety

Regex `/official\s+uncle\s+julio'?s/i` (or equivalent for other brands) is checked against every string field in the pack: `description`, `concept`, `canonicalSolution`, `explanation`, `hints[]`, `commonErrors[*].description/remediation/recoveryPlay/realWorldImpact`. If matched anywhere AND the surrounding `sourceDataStatus !== "authorized"`, the validator fires `UNAUTHORIZED_PROPRIETARY_CLAIM`. Do not write text claiming an "official" connection to a brand without a real authorization in place.

When extending this rule for new brands, add the brand pattern to the regex list in the validator.

## Fundamentals reinforcement rule

Every `FT5-*` ID that appears in `fundamentalsTaught` of any block MUST appear in `fundamentalsReinforced` of at least 2 OTHER blocks. The validator enforces this via `INSUFFICIENT_REINFORCEMENT`.

When designing a new pack: for each fundamental, pick exactly one block to teach it primary, then make sure ≥ 2 other blocks reinforce it. The Uncle Julio's pack has 3 fundamentals across 8 blocks — every fundamental is reinforced in 4–6 other blocks.

## Per-pack orphan check

For brand-specific packs, the validator checks that every required ID is referenced at least once across `teachingBlocks[*].contentLinks`. The required-ID list is currently hardcoded in `content-validator.ts` per pack id (e.g., `pack-uncle-julios-v1`). When adding a new brand pack, add a new required-ID list inside `validateOrphanLinks` (or equivalent function name).

This will be externalized to the manifest in v0.2. For v0.1, the hardcode is intentional — it forces PR review when the required-ID list changes.

## Authoring workflow

1. **Branch**: `git checkout -b feat/<brand>-pack-v<n>-<change>`
2. **Schema check first**: if you need a new schema field, extend `content.schema.ts` BEFORE writing it into the pack JSON. The manifest is `.strict()` and will reject unknown fields.
3. **Author the pack**: 8 teaching blocks is the established shape (orientation-safety, tools-color-barriers, station-setup, line-readiness, ticket-flow-basics, downtime-decisions, cleaning-reset, assessment-gate). Other brands may diverge but should justify the divergence.
4. **Validate**: `pnpm validate:content-packs`
5. **Test**: `pnpm test`
6. **Gate**: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm build`
7. **Capture**: save validation output to `.batch-ledger/<pack>-validation.txt` for the PR body
8. **PR**: title `feat(content): <Brand> pack v<n>`. Body covers: why, what changed (schema/validator/CLI/pack), validation results, deferred items.

## Things this skill does NOT cover

- ECDSA real signing — separate signing pipeline concern
- Authorized brand content for any field — needs real source agreement, not authoring guidance
- Spanish/i18n — deferred to v0.2 per the Uncle Julio's plan
- Kitchen-challenge JSONs (`content-packs/kitchen/*.json`) — different schema (`resourcePack/kitchen-challenge`), different authoring patterns, out of scope here

## Reference: Uncle Julio's pack as canonical example

The Uncle Julio's pack v0.1 (`content-packs/content_pack_uncle_julios_v1.json`) is the reference implementation. When in doubt, mirror its shape:
- 8 teaching blocks in the established sequence
- All five v0.1 extension fields populated on every block
- 3 highest-impact `commonErrors` per block carry `recoveryPlay` + `realWorldImpact`
- `trainerNotes` are 1500–2000 chars per block, real kitchen voice
- Trigger thresholds tier as documented above
- IP safety: nothing claims `official Uncle Julio's` anywhere; `sourceDataStatus: demo` throughout
