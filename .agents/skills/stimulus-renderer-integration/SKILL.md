---
name: stimulus-renderer-integration
description: Wires the six challenge-stimulus renderers into surfaces that present teaching blocks or kitchen challenges. Use when adding a stimulus to a new surface, updating the discriminator router, adding exhaustive-switch tests, or extending the stimulus union. Triggers on requests like "wire stimulus into learn page", "render stimulus on block detail", "add a new stimulus kind", "test discriminator router", "stimulus does not appear in challenge surface". Do NOT use for authoring stimuli inside content-pack JSON — use `topshelf-content-pack-authoring` for that.
metadata:
  author: topshelf
  version: '0.1.0'
---

# Stimulus Renderer Integration

This skill is about integration — placing the already-built `StimulusRenderer` correctly on each surface and keeping the discriminated union closed.

## Scope and non-scope

In scope:

- `apps/web/src/components/kitchen/stimuli/**`
- Any page or component that displays a `ChallengeStimulus`
- Tests that lock the exhaustive switch and per-kind rendering

Out of scope:

- Authoring stimulus _content_ in content-pack JSON — see `topshelf-content-pack-authoring`
- The Zod schema in `packages/shared/src/schemas/content.schema.ts` (changes there must be coordinated with this skill)

## The contract

The discriminated union is defined in [packages/shared/src/schemas/content.schema.ts](packages/shared/src/schemas/content.schema.ts) via `challengeStimulusSchema`. Six kinds, each `.strict()`:

| `kind`          | Renderer component     | Required fields                  |
| --------------- | ---------------------- | -------------------------------- |
| `ticket`        | `TicketStimulus`       | `table`, `items[≥1]`             |
| `station_state` | `StationStateStimulus` | `observations[≥1]`               |
| `huddle_notes`  | `HuddleNotesStimulus`  | `notes[≥1]` (`label` + `detail`) |
| `menu_board`    | `MenuBoardStimulus`    | none required                    |
| `step_bank`     | `StepBankStimulus`     | `steps[≥2]`                      |
| `plain_text`    | `PlainTextStimulus`    | `lines[≥1]`                      |

The router is [apps/web/src/components/kitchen/stimuli/StimulusRenderer.tsx](apps/web/src/components/kitchen/stimuli/StimulusRenderer.tsx). The switch covers all six and returns `null` for `default`. Keep the `default` arm — TypeScript exhaustiveness should make it unreachable, but it is the safety net.

## Surfaces that must render stimuli

| Surface                                                              | Status                 |
| -------------------------------------------------------------------- | ---------------------- |
| `apps/web/src/app/kitchen/challenges/[slug]/page.tsx`                | wired                  |
| `apps/web/src/app/(app)/learn/[courseId]/page.tsx` (teaching blocks) | **not wired — P2.2.2** |
| Manager / instructor review surfaces (read-only block preview)       | not wired (future)     |

When wiring a new surface:

1. Read `teachingBlock.stimulus` (it is optional — many blocks have none).
2. Render `<StimulusRenderer stimulus={stimulus} />` **above** the prompt text. The contract from the schema doc: "Structured stimulus rendered above prompt text."
3. Wrap in a `<section aria-label="Challenge stimulus">` if the renderer itself does not already provide one. The existing renderers do — verify with the file before adding redundant wrappers.
4. Do not branch on `kind` in the surface page. The router is the only place that does that.

## Adding a new stimulus kind

If product asks for a 7th kind:

1. Add the Zod variant to `challengeStimulusSchema` in `packages/shared/src/schemas/content.schema.ts`. Use `.strict()`.
2. Mirror the TS type in `packages/shared/src/types/`.
3. Add the renderer file under `apps/web/src/components/kitchen/stimuli/`.
4. Add the `case` to the router switch in `StimulusRenderer.tsx`. The exhaustive-switch test below will fail at typecheck if you miss this — that is the desired behavior.
5. Add the renderer's prop type to `types.ts`.
6. Add a per-kind render test and update the exhaustive-switch test.
7. Update content-pack validator rules in `packages/content-authoring/src/validation/content-validator.ts` if the new kind has prompt-keyword heuristics.

## Exhaustive-switch test pattern

The router test should rely on TypeScript's `never`:

```ts
function assertNever(x: never): never {
  throw new Error(`Unexpected stimulus kind: ${String(x)}`);
}
```

If a new variant is added without a `case`, the `default` arm will fail to compile when typed as `assertNever(stimulus)`. This is the cheapest way to keep the switch closed without runtime fixtures.

The pragmatic test set per renderer should cover:

- Required fields render visibly (text content asserted).
- Optional fields, when omitted, do not produce dangling labels or aria-empty regions.
- Empty / boundary arrays at the schema minimum render without throwing.

## Workflow

1. Read this skill plus `top-shelf-ui` for visual rules.
2. Read the existing renderer for the kind you are wiring — they are the visual contract.
3. Wire `StimulusRenderer` above the prompt on the target surface.
4. Add per-kind render tests if missing.
5. Run `pnpm --filter @topshelf/web typecheck && pnpm --filter @topshelf/web test`.
6. Append a board update naming the surface wired and any blocks now solvable end-to-end that previously were not.

## Guardrails

- Never branch on `stimulus.kind` outside the router.
- Never render free-form HTML from stimulus fields. Treat all content as text.
- Never widen the union with an "unknown" fallback variant — keep it closed.
- Stimulus props are `readonly` from the schema. Do not mutate.
