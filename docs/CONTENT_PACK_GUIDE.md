# Content Pack Guide

This guide reflects the current manifest contract and validator behavior in the repo.

## File Convention

Author shipped manifests as top-level files under `content-packs/`.

- Filename format: `content_pack_<slug>.json`
- Pack ID format: `pack-<slug>`
- Example: `content-packs/content_pack_linux_v1.json` must declare `"id": "pack-linux-v1"`

Nested JSON files under `content-packs/kitchen/`, `content-packs/resource-packs/`, and `template_content_pack.json` are not treated as shipped manifests by the validator.

## Required Root Fields

Every manifest must include these fields:

- `id`
- `name`
- `version`
- `description`
- `tags`
- `roleMappings`
- `difficulty`
- `minDeviceProfile`
- `teachingBlocks`
- `author`
- `createdAt`
- `updatedAt`
- `signature`
- `signingKeyId`
- `schemaVersion`

Common optional fields include `slug`, `title`, `domain`, `certificationTarget`, `chromebookCompatible`, `targetDeviceProfile`, `status`, and `metadata`.

## Required Teaching Block Fields

Every teaching block must include these fields:

- `id`
- `concept`
- `mode`
- `canonicalSolution`
- `explanation`
- `surfaceVariants`
- `timeBudgetSeconds`
- `difficulty`
- `prerequisites`
- `successCriteria`
- `hints`
- `commonErrors`

Current pack `mode` values are `L0`, `L1`, `L2`, `L3`, and `L4`.

Each block must also provide at least two `surfaceVariants`.

## Structured Pack Fields

Structured packs may additionally use:

- `locale`
- `translationStatus`
- `assetCatalog`
- `integrity`
- block-level `title`
- block-level `objective`
- block-level `deviceConstraints`
- block-level `moduleLinks`

When `assetCatalog` is present, the validator also enforces these rules:

- `locale` is required.
- Every block must include `title`, `objective`, `deviceConstraints`, and `moduleLinks`.
- `moduleLinks.externalAssessmentId` must be present unless a block includes an inline assessment surface.
- Every referenced asset ID must exist in the matching `assetCatalog` section.
- Every asset in the catalog must be referenced by at least one block.
- `integrity.releaseMode: "release"` requires `integrity.checksum`.
- Claims of official Uncle Julio's source material require at least one authorized asset with a source reference.

## Minimal Manifest Example

```json
{
  "id": "pack-my-course-v1",
  "name": "My Course",
  "version": "1.0.0",
  "description": "A compact example content pack.",
  "tags": ["required", "example"],
  "roleMappings": ["badge-example-role-v1"],
  "difficulty": "beginner",
  "minDeviceProfile": {
    "ramMb": 512,
    "networkKbps": 128,
    "requiresWebGL": false,
    "requiresWebGPU": false,
    "requiresWasm": false
  },
  "teachingBlocks": [
    {
      "id": "tb-example-001",
      "concept": "Example Concept",
      "mode": "L0",
      "canonicalSolution": "echo 'example'",
      "explanation": "Explain why the example works.",
      "surfaceVariants": [
        {
          "id": "variant-a",
          "description": "Direct prompt",
          "data": {
            "prompt": "Run the example."
          }
        },
        {
          "id": "variant-b",
          "description": "Rephrased prompt",
          "data": {
            "prompt": "Solve the same task with different wording."
          }
        }
      ],
      "timeBudgetSeconds": 120,
      "difficulty": "beginner",
      "prerequisites": [],
      "successCriteria": {
        "minCorrectnessScore": 0.7,
        "maxTimeSeconds": 240,
        "maxRetries": 2,
        "requiresExplanation": false
      },
      "hints": ["Start from the prompt.", "Use the canonical solution as the baseline."],
      "commonErrors": []
    }
  ],
  "author": "Top Shelf Teaching",
  "createdAt": "2026-05-06T00:00:00.000Z",
  "updatedAt": "2026-05-06T00:00:00.000Z",
  "signature": "sig-v1-example",
  "signingKeyId": "key-example-001",
  "schemaVersion": "1.0.0"
}
```

## Validation

Run the authoritative validator from the repo root:

```bash
pnpm validate:content-packs
```

Or run the package-local command directly:

```bash
pnpm --filter @topshelf/content-authoring run validate:packs
```

The validator only treats top-level `content_pack_*.json` files as shipped manifests. Other JSON files under `content-packs/` are skipped on purpose.

## Packaging

The Uncle Julio's manifest is currently a demo-mode artifact.

```bash
pnpm checksum:uncle-julios
pnpm package:uncle-julios
```

Both commands write outputs under `dist/content-packs/uncle-julios/`.

Demo-mode behavior:

- The manifest stays at `integrity.releaseMode: "demo"`.
- The manifest checksum remains `null`.
- Packaging writes the computed checksum beside the manifest and into release metadata, but does not backfill the manifest itself.
- A release-mode pack would need an explicit manifest checksum before it should be treated as a release artifact.

## What No Longer Applies

These older patterns are not part of the current contract:

- `question`
- `correctAnswer`
- `badges`
- legacy mode names such as `L1_RECALL`, `L2_EXPLAIN`, and `L3_APPLY`
- `node packages/content-authoring/validate.js`
