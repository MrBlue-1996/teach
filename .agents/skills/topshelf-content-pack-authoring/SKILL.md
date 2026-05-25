---
name: topshelf-content-pack-authoring
description: Authoring guide for Top Shelf Teaching content-pack manifests in this repo. Use when creating, updating, or validating `content-packs/content_pack_*.json` files or related schema/validator/CLI code. Triggers on requests like "new content pack", "add teaching block", "update module links", "add challenge stimulus", "fix content-pack validation", and "extend content validator". Do NOT use for kitchen challenge packs in `content-packs/kitchen/*.json`.
metadata:
  author: topshelf
  version: '0.2.0'
---

# Top Shelf Content Pack Authoring

This skill captures current conventions for manifest-based content packs in this repository.

## Scope and non-scope

In scope:

- `content-packs/content_pack_*.json`
- `packages/shared/src/schemas/content.schema.ts`
- `packages/content-authoring/src/validation/content-validator.ts`
- `packages/content-authoring/src/cli/validate-packs.ts`
- validator fixtures and tests under `packages/tests/src/unit/`

Out of scope:

- `content-packs/kitchen/*.json` (kitchen challenge configs)
- signing pipeline internals
- unauthorized proprietary claims

## Current canonical shape

Top-level manifest uses `contentPackManifestSchema` and strict camelCase fields.

Key top-level fields:

- `id` (e.g. `pack-uncle-julios-v1`)
- `schemaVersion` (`content-pack.v1`)
- `name`
- `version` (semver)
- `description`
- `updatedAt` (ISO date)
- `teachingBlocks[]`
- `roleMappings`
- `signature` and `signingKeyId`

## Teaching block requirements

A teaching block keeps the established base fields and may include:

- `stimulus` (typed challenge stimulus)
- `deviceConstraints` (`maxResponseChars` must satisfy schema bounds)
- `moduleLinks`
- `retention`
- `trainerNotes`

Important: In this repo state, the canonical linkage field is `moduleLinks` (not `contentLinks`).

`moduleLinks` should include:

- `fundamentalsTaught[]`
- `downtimeDecisions[]`
- `chaosEvents[]`
- `externalAssessmentId` (optional)
- `ticketFlows[]`
- `triggerRules[]`

## Stimulus authoring contract

Use one discriminator-based `stimulus` per block when a scenario references visible context.

Supported `stimulus.kind` values:

- `ticket`
- `station_state`
- `huddle_notes`
- `menu_board`
- `step_bank`
- `plain_text`
- `recipe`
- `image`

Authoring guideline:

- If prompt references ticket, board, station state, huddle notes, ordered steps, recipe cards, or a visual/photo artifact, attach a matching `stimulus`.
- For `image`, use a manifest key such as `EQ1-equipment/grill` in `imageRef`, never a raw public URL or inline image data.
- `image.altText` is required and must describe the image in at least 4 non-whitespace characters.
- Reserve no-stimulus blocks for capstone-style manager observation or pure conceptual prompts.

## Validator expectations

Current validator suite enforces semantic rules in addition to schema shape, including:

- text-over-device-cap checks
- fundamentals reinforcement checks
- orphan module-link checks for targeted packs
- safety trigger checks
- proprietary claim checks
- required stimulus checks (pack-specific and heuristic)
- image stimulus manifest reference checks
- release-mode blocks on demo/non-authorized image assets

When changing authored fields, update fixtures and tests in the same PR.

## Workflow

1. Edit schema first if introducing any new manifest field.
2. Update pack JSON with strict schema compliance.
3. Run content-pack validation:
   - `pnpm validate:content-packs`
4. Run tests:
   - `pnpm test`
5. Run repo validation gate before finalizing:
   - `pnpm validate`

## Guardrails

- Keep IDs and references deterministic and prefix-valid.
- Do not claim official/proprietary brand status without authorized source metadata.
- Keep examples practical and kitchen-realistic in tone.
- Keep content and validator updates in sync to avoid fixture drift.
