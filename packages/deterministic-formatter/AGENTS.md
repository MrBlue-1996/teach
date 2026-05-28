# AGENTS.md

Last updated: 2026-05-28

This file provides guidance to AI coding agents (OpenAI Codex and compatible) when working with code in this directory.

## Package: `@topshelf/deterministic-formatter`

Ensures that teaching content renders identically in offline and online contexts. Used in the `content-authoring` validation pipeline and in `packages/tests` parity tests. Promoted from `packages/_future/` — it is an active package.

```bash
pnpm test
pnpm build    # tsup → dist/
pnpm typecheck
```

## Two Modules

### `CanonicalFormatter`

Produces a canonical in-memory representation of a `TeachingBlock` and a content hash for parity detection.

```ts
const formatter = new CanonicalFormatter(config?)  // config optional, defaults apply
const output: FormattedOutput = formatter.formatBlock(block)
const hash: string = createContentHash(output.canonicalSolution) // hashes any normalized string input
const result = checkParity(online, offline) // { matched, divergences }
```

`FormattedOutput` normalizes whitespace, code block delimiters, and hint ordering so that hash comparisons are stable regardless of whitespace differences.

### `ParityValidator`

Validates a batch of LLM-formatted outputs against the canonical formatter.

```ts
const validator = new ParityValidator(config?)
const result = validator.validateBlock(teachingBlock, llmOutput)
const batch = validator.validateBatch(blocks, llmOutputs)
// result: { passed, divergenceCount, divergences: ParityDivergence[] }

const runner = new ParityTestRunner(config?)
runner.runTest(teachingBlock, llmOutput)
runner.getAggregateResults()
```

`ParityDivergence` includes the block ID, the field that diverged, and both values — use this for debugging content drift.

## When to Use

- **Publishing a content pack** — run `ParityValidator.validateBatch` before signing to catch online/offline drift
- **CI parity tests** — `packages/tests/src/parity/formatter-parity.test.ts` uses `CanonicalFormatter` and `ParityTestRunner` directly
- **Content authoring pipeline** — `ContentPackValidator` in `packages/content-authoring` calls this automatically during validation

## Configuration

`DEFAULT_FORMATTER_CONFIG` is exported and documents all options. Override only what differs — pass a partial config; the formatter merges with defaults.
