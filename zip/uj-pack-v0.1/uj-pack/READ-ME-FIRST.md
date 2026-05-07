# Uncle Julio's Pack v0.1 — Apply Instructions

**Branch first:** `git checkout -b feat/uj-pack-v0.1-rebuild` from a clean main.
**Verify clean tree:** `git status` should be empty before you start.

This ZIP does NOT overwrite your repo wholesale. It contains:

- **New files** — drop-in safe (test fixtures, new test files, SKILL.md)
- **Addition files** — TypeScript/JSON snippets you splice into existing files between marked sections

If a file path in this ZIP exists in your repo, do not blind-copy. Read the file and follow its splice markers.

---

## Apply order

Each step is a checkpoint. Do not proceed if validation fails.

### 1. Schema additions

Open `packages/shared/src/schemas/content.schema.ts` in your repo.

Splice the contents of `packages/shared/src/schemas/content.schema.additions.ts` (this ZIP) into your file. Each block is wrapped between `// === BEGIN UJ-PACK-V0.1 ===` and `// === END UJ-PACK-V0.1 ===` markers. Insert them where the surrounding code makes sense:

- Atomic schemas (sourceDataStatusSchema, retentionSchema, trainerNotesSchema, recoveryPlaySchema, realWorldImpactSchema, contentLinksSchema, deviceConstraintsSchema, triggerRuleSchema) → near the top, after your existing atomic schemas, before teachingBlockSchema.
- commonErrorSchema extension → wherever your commonErrorSchema lives. Add the two `.optional()` fields.
- teachingBlockSchema extension → add the five new optional fields to your existing teachingBlockSchema definition.

Then update `packages/shared/src/schemas/index.ts` per `index.ts.additions.md` (this ZIP).

**Checkpoint:** `pnpm --filter @topshelf/shared typecheck && pnpm --filter @topshelf/shared build` — both pass.
**Then:** `pnpm typecheck` from repo root — confirms no downstream breaks (everything's optional, should be clean).

### 2. Validator additions

Open `packages/content-authoring/src/validation/content-validator.ts`.

Splice in the six new rules from `packages/content-authoring/src/validation/content-validator.additions.ts` (this ZIP). They go inside your existing `validateContentConsistency` function (or equivalent) where you accumulate errors. The additions assume an `errors: ValidationIssue[]` array is in scope; adjust the variable name if yours differs.

**Checkpoint:** `pnpm --filter @topshelf/content-authoring typecheck && pnpm --filter @topshelf/content-authoring build`.

### 3. CLI changes

Open `packages/content-authoring/src/cli/validate-packs.ts`.

Apply the four changes from `packages/content-authoring/src/cli/validate-packs.changes.md` (this ZIP):

- T2.B1: Accept argv args
- T2.B2: Wire up validateContentPack
- T2.B3: Filename↔ID match function
- T2.B4: Exit code discipline + named export `validateContentPackArtifacts`

**Checkpoint:** `pnpm validate:content-packs` against your existing pack — should still report OK on whatever was passing before.

### 4. Test fixtures

Drop the entire `packages/content-authoring/src/fixtures/content-packs/` tree from this ZIP into the matching path in your repo. All fixture files are new — no merge needed.

### 5. Test files

Drop these new test files into your repo at the paths shown:

- `packages/content-authoring/src/cli/validate-packs.test.ts`
- `packages/shared/src/schemas/content.schema.test.ts`

If your repo already has a `content.schema.test.ts` with content, append the contents of this one's `describe(...)` blocks instead of replacing.

**Checkpoint:** `pnpm test` from repo root — every existing test still passes, and the 9 new fixture-based assertions pass.

### 6. Pack content

Open `content-packs/content_pack_uncle_julios_v1.json` in your repo.

For each `tb-uj-*` block, open the matching file in `pack-additions/` (this ZIP) and merge its fields into the existing block. The additions files include only new fields — do not delete any existing fields.

Top-level metadata changes (`version`, `description`, `updatedAt`) are in `pack-additions/_metadata.json`.

**Checkpoint:** `pnpm validate:content-packs` against your modified pack — should print `[validate:packs] OK.`

### 7. Final gate

```
pnpm validate:content-packs
pnpm test
pnpm format:check && pnpm lint && pnpm typecheck
pnpm build
```

All four must exit 0. Capture output to `.batch-ledger/uj-v0.1-validation.txt` for the PR body.

---

## Bonus: skill file

`skill/topshelf-content-pack-authoring/SKILL.md` is for `/mnt/skills/user/topshelf-content-pack-authoring/` (or wherever your Claude skills directory lives). It's not part of the repo — drop it into your skills tree separately. Future Sun Holdings packs (Burger King, Popeyes, Applebee's) will inherit the same structure when this skill is loaded.

---

## What's NOT in this build (deferred to v0.2)

- Spanish (`locale`, `translationStatus`) — needs co-authoring, not theater
- Externalized required-ID list for the per-pack orphan check — currently hardcoded in the validator (forces PR review for changes)
- ECDSA real signing — existing pipeline concern
- Authorized brand content — needs Uncle Julio's / Sun Holdings agreement
