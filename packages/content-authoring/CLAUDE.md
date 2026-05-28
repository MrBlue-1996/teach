# CLAUDE.md

Last updated: 2026-05-28

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package: `@topshelf/content-authoring`

Three-stage content pack pipeline: validate → sign → publish. Used by content authors and CI tooling. Depends on `@topshelf/deterministic-formatter` for parity checks inside the validator.

```bash
pnpm test
pnpm build              # tsup → dist/
pnpm validate:packs     # CLI: validates JSON content-pack artifacts in content-packs/ or content/
pnpm typecheck
```

## Pipeline Stages

### Stage 1: `ContentPackValidator`

```ts
import { ContentPackValidator } from '@topshelf/content-authoring';
const validator = new ContentPackValidator();
const result: ContentPackValidationResult = await validator.validate(pack, llmOutputs?)
// result: { valid: boolean; errors: string[]; warnings: string[] }
```

Runs in order: Zod schema check → business rules → content consistency → signature verification (if signed) → parity check (if `llmOutputs` provided). Parity check uses `ParityValidator` from `@topshelf/deterministic-formatter`.

### Stage 2: `ContentPackSigner`

```ts
import { ContentPackSigner } from '@topshelf/content-authoring';
const signer = new ContentPackSigner({ algorithm: 'ECDSA-P256-SHA256', keyId, privateKey });
const { signature, keyId, signedAt, contentHash } = await signer.sign(pack);
await signer.verify(pack); // throws if invalid

const revocation = new RevocationManager();
await revocation.revoke(keyId, reason);
```

Algorithm options: `ECDSA-P256-SHA256` (default) or `RSA-PSS-SHA256`. `contentHash` is stored on the `contentPacks` DB record alongside `signature` and `signedBy`.

### Stage 3: `AuthoringPipeline`

```ts
import { AuthoringPipeline } from '@topshelf/content-authoring';
const pipeline = new AuthoringPipeline();
await pipeline.submit(draftPack); // → 'draft'
await pipeline.validate(id); // → 'validation' | 'rejected'
await pipeline.runParityTests(id); // → 'parity_testing' | 'rejected'
await pipeline.submitForReview(id); // → 'human_review'
await pipeline.approve(id, actor, notes); // → 'signing'
await pipeline.sign(id); // → 'published'
await pipeline.reject(id, actor, reason); // → 'rejected'
```

State machine transitions are strict — calling `sign()` before `approve()` throws. Each transition records actor + timestamp in the pack's history array.

## `DraftTeachingBlock` Required Fields

```ts
{
  concept: string;           // what learner is being taught
  canonicalSolution: string; // markdown with code blocks
  explanation: string;       // why the solution works
  surfaceVariants: string[]; // alternative phrasings for the same concept
  timeBudgetSeconds: number; // expected time to complete
  difficulty: 1 | 2 | 3 | 4 | 5;
  hints: string[];           // progressive hints, ordered easiest → hardest
}
```

## Validation Rules Cheatsheet

The validator checks the following in order. A failing check produces an entry in `errors[]`; soft issues go into `warnings[]`:

| Rule                              | What is checked                                                   |
| --------------------------------- | ----------------------------------------------------------------- |
| Required fields                   | `packId`, `slug`, `version`, `blocks[]` present and non-empty     |
| Block ID uniqueness               | No two blocks share the same `blockId` within a pack              |
| `targetMode` enum                 | Each block's `targetMode` is one of `L1_RECALL … L5_EXPERT`       |
| Hint ordering                     | `hints[]` must be ordered easiest → hardest (no empty strings)    |
| Difficulty range                  | `difficulty` is an integer in `[1, 5]`                            |
| `timeBudgetSeconds`               | Must be a positive integer (`> 0`)                                |
| Signature integrity               | If `signature` is present, `ContentPackSigner.verify()` must pass |
| Parity (when LLM output provided) | `ParityValidator.validateBatch()` must return no divergences      |

## CLI Usage

```bash
pnpm validate:packs
```

Scans `content-packs/` and `content/` directories for `*.json` files and validates each one. Exits 0 if all packs pass or if no packs are found (empty directories are not an error).

**Passing output:**

```
✓ content-packs/food-safety-v1.json — valid (12 blocks)
✓ content-packs/kitchen-basics-v2.json — valid (8 blocks)
All 2 packs passed validation.
```

**Failing output:**

```
✗ content-packs/broken-pack.json
  ERROR: Duplicate blockId "handwashing-001" at blocks[3] and blocks[7]
  ERROR: blocks[5].difficulty must be 1–5, got 6
  WARNING: blocks[2].hints is empty — learners will have no hints available
1 pack failed validation. Fix errors before signing.
```

Exit code 1 on any error; exit code 0 on warnings only.

## Conventions

- Always import from `@topshelf/content-authoring` (package root).
- Test files are named `*.test.ts` and live in `src/` alongside the module they test.
- All source files must include the copyright header:
  ```ts
  /**
   * TopShelf Service LLC
   * PROPRIETARY AND CONFIDENTIAL
   * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
   */
  ```
- Run `pnpm --filter @topshelf/content-authoring typecheck` after changes.
