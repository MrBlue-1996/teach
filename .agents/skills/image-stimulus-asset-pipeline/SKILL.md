---
name: image-stimulus-asset-pipeline
description: Adds the `image` stimulus kind to the discriminated union and the asset-manifest pipeline that catalogs imagery under apps/web/public/kitchen. Use when adding image-based challenges, authoring an image manifest, replacing placeholders with licensed assets, or validating pack image references. Triggers on "image stimulus", "recipe image", "equipment photo", "identify hazard in image", "swap placeholder image", "image manifest". Do NOT use to add the `recipe` stimulus (a separate kind) — see the recipe-stimulus integration task.
metadata:
  author: topshelf
  version: '0.1.0'
---

# Image Stimulus & Asset Pipeline

This skill closes the image gap. Equipment, station, tool, and recipe imagery exists as `.placeholder` webp files under [apps/web/public/kitchen/](../../../apps/web/public/kitchen/) but no stimulus kind references them. Adding `kind: 'image'` to the discriminated union and a manifest unlocks "identify this", "what's wrong here?", and "spot the hazard" prompts.

## Scope and non-scope

In scope:

- New `ImageStimulus` interface, Zod schema, renderer component
- Wiring into `StimulusRenderer` exhaustive switch
- `apps/web/public/kitchen/manifest.json` — asset catalog with `path`, `altText`, `sourceDataStatus`, optional `licenseRef`
- Content-pack validator rule: `imageRef` must resolve against the manifest
- Demo-status SVG placeholders for v0.1.x ship (real licensed images later)

Out of scope:

- The `recipe` stimulus (separate kind, separate skill)
- Image upload UI (admin tooling, future)
- CDN/transform pipeline (future — for v0.1.x serve from `/public/kitchen/`)

## The contract

### `ImageStimulus` shape

```ts
interface ImageStimulus {
  readonly kind: 'image';
  readonly imageRef: string; // e.g. "EQ1-equipment/grill"
  readonly altText: string; // REQUIRED — accessibility
  readonly caption?: string;
  readonly focusRegions?: readonly {
    readonly label: string;
    readonly xPct: number; // 0..100
    readonly yPct: number;
    readonly widthPct: number;
    readonly heightPct: number;
  }[];
}
```

- `imageRef` is a **path key** (no extension), resolved by the manifest. The manifest controls extension and exact URL. This lets us swap webp → avif → SVG without touching content packs.
- `altText` is **required**. Reject in the validator if absent or shorter than 4 chars.
- `focusRegions` are optional overlays — useful for "identify the hazard" prompts where labels point to specific spots on the image.

### Asset manifest

`apps/web/public/kitchen/manifest.json`:

```json
{
  "schemaVersion": "1.0.0",
  "entries": {
    "EQ1-equipment/grill": {
      "path": "/kitchen/EQ1-equipment/grill.webp",
      "altText": "Commercial flat-top grill at service temperature",
      "sourceDataStatus": "demo",
      "licenseRef": null,
      "tags": ["equipment", "grill"]
    },
    "RC4-recipes/recipe-hollandaise-v1": {
      "path": "/kitchen/RC4-recipes/recipe-hollandaise-v1.webp",
      "altText": "Hollandaise sauce in a double boiler, whisk in motion",
      "sourceDataStatus": "demo",
      "licenseRef": null,
      "tags": ["recipe", "brunch"]
    }
  }
}
```

`sourceDataStatus` mirrors the content-pack schema enum: `demo | authorized | requires-client-source | deprecated`.

A release pack (`integrity.releaseMode === 'release'`) must use only `authorized` images. The validator enforces this.

### Demo SVG placeholders

For v0.1.x ship without licensed assets, every entry in the manifest gets a TopShelf-branded demo SVG until real images arrive:

- Solid charcoal background (`#181A1F`)
- Centered subject label in Montserrat ("Grill", "Hollandaise", etc.)
- "Demo" watermark in the corner
- Same aspect ratio as the eventual real image (16:9 for equipment, 4:3 for recipes)

Demo SVGs live at `apps/web/public/kitchen/_demo/<imageRef>.svg`. The manifest entry points at the SVG path; sourceDataStatus stays `demo`.

When real images arrive (B-IMG-01 unblock), swap the `path` and flip `sourceDataStatus` to `authorized`. No content-pack changes needed.

### Renderer behavior

`ImageStimulus.tsx`:

- Uses Next.js `<Image>` with `priority` for above-fold rendering.
- Aspect ratio comes from the manifest (or a default 16:9).
- Focus regions render as `<div>` overlays positioned with percent CSS; their labels appear on hover/tap with adequate contrast.
- Always wraps in `<section role="region" aria-label="Image stimulus">`.
- Demo-status images show a small "Demo" badge in the corner (chip styling per `top-shelf-ui`).

## What to read before coding

1. [stimulus-renderer-integration/SKILL.md](../stimulus-renderer-integration/SKILL.md) — how the discriminated union closes, how to add a new kind.
2. [apps/web/src/components/kitchen/stimuli/types.ts](../../../apps/web/src/components/kitchen/stimuli/types.ts) — existing types.
3. [packages/shared/src/schemas/content.schema.ts](../../../packages/shared/src/schemas/content.schema.ts) — `challengeStimulusSchema` discriminated union.
4. [apps/web/public/kitchen/](../../../apps/web/public/kitchen/) — current placeholder files.

## Adding the kind — exact steps

1. Add `ImageStimulus` interface to `apps/web/src/components/kitchen/stimuli/types.ts`. Add it to the `ChallengeStimulus` union.
2. Add `imageStimulusSchema` (Zod, `.strict()`) to `packages/shared/src/schemas/content.schema.ts`. Add it to the `challengeStimulusSchema` discriminated union.
3. Create `apps/web/src/components/kitchen/stimuli/ImageStimulus.tsx`. Implements the renderer per the contract above.
4. Update `apps/web/src/components/kitchen/stimuli/StimulusRenderer.tsx` — add `case 'image': return <ImageStimulus stimulus={stimulus} />;`.
5. Update `parseStimulus` type guard in [learn/[courseId]/page.tsx](<../../../apps/web/src/app/(app)/learn/[courseId]/page.tsx>) to handle the `image` case.
6. Create `apps/web/public/kitchen/manifest.json` with entries for every existing placeholder.
7. Create demo SVGs under `apps/web/public/kitchen/_demo/`.
8. Add a `loadKitchenManifest()` helper in `apps/web/src/lib/kitchen-packs.ts` (or similar) so the renderer can resolve `imageRef` → URL.
9. Add content-pack validator rules in `packages/content-authoring/src/validation/content-validator.ts`:
   - Every `imageRef` in any pack must exist in the manifest.
   - Release packs cannot reference `demo` or `requires-client-source` entries.
10. Tests:
    - Per-kind renderer test in `stimulus-renderers.test.tsx`.
    - Exhaustive-switch test still passes (compile-time `never` check covers it).
    - Validator test: missing manifest entry → error; release + demo image → error.

## Acceptance criteria

- `ChallengeStimulus` union closed at 8 kinds (was 6, +recipe +image once both land).
- Manifest validates against its own schema (add a Zod schema for the manifest itself).
- Demo SVGs render with TopShelf branding and "Demo" watermark.
- A learn page with an `image` stimulus on the block renders the image above the prompt.
- `pnpm --filter @topshelf/web typecheck && pnpm --filter @topshelf/web test` passes.
- Validator catches packs that reference missing manifest entries.
- Validator blocks release packs that point at `demo`-status assets.

## Guardrails

- **Never inline base64 images in stimulus JSON.** Always go through the manifest.
- **`altText` is non-negotiable.** Reject blocks without it.
- **Do not render free-form HTML from `caption` or `label`.** Treat as text.
- **Do not skip the manifest indirection** even if it feels like overkill — it is what lets us swap licensed images in without touching content packs.
- **Focus regions are visual only, not interactive.** Click handlers belong in a future "image-quiz" stimulus, not here.
- **Demo SVGs must not depict real branded content** (real menu items with TM-able names, real restaurant interiors). Use generic icon-style depictions.

## Test plan checklist

- [ ] `ImageStimulus` renders required alt text into the `<img>` tag
- [ ] Focus regions render at correct percent positions
- [ ] Demo-status images show the "Demo" badge
- [ ] Manifest validation passes for the seeded entries
- [ ] Validator errors on missing manifest entry referenced by a pack
- [ ] Validator errors on release pack + demo-status image
- [ ] Exhaustive-switch typecheck still closed
