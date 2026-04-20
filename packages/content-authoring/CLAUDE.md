# CLAUDE.md

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

## CLI (`src/cli/validate-packs.ts`)

Scans `content-packs/` and `content/` directories (relative to repo root or package root) for JSON files and validates their shape. Exits 0 if no packs found (not an error — content directories are optional). Run via `pnpm validate:packs`.
