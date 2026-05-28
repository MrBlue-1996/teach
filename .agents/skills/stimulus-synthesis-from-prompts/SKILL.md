---
name: stimulus-synthesis-from-prompts
description: Drafts a structured stimulus (ticket / station_state / recipe / huddle_notes / etc.) from a teaching block's question and canonical solution. Use for the synth-stimulus authoring CLI, the heuristic library that picks a stimulus kind from prompt keywords, and the backfill pass over existing content packs. Triggers on "tickets from question/response sections", "stimulus authoring tool", "backfill missing stimuli", "auto-draft stimulus from prompt", "synthesize ticket". Do NOT use for the actual rendering of stimuli — see `stimulus-renderer-integration`.
metadata:
  author: topshelf
  version: '0.1.0'
---

# Stimulus Synthesis From Prompts

This skill is the authoring-tooling counterpart to `stimulus-renderer-integration`. The renderer side closes the visual contract; this side closes the **content** contract — making sure every teaching block whose prompt references a visible artifact (a ticket, a recipe, a station's state) actually carries the structured stimulus the prompt depends on.

The validator already warns when a block prompt mentions "ticket" or "table T#" without a `ticket` stimulus. This skill adds the **drafting** half: a heuristic synthesizer that turns a question + canonical solution into a starting stimulus the content author can then refine.

## The principle

> A prompt that says "Table 3 ordered 2 fajitas. What temp should the grill be?" without a ticket stimulus is unsolvable as displayed — the learner sees prose, not the artifact a real cook sees. Every block that **describes** an artifact in its prompt should also **show** it.

The synthesizer never replaces author judgement. It produces drafts that authors review, edit, and commit.

## Scope and non-scope

In scope:

- New CLI: `packages/content-authoring/src/cli/synth-stimulus.ts`
- Heuristic library: `packages/content-authoring/src/heuristics/stimulus-synth.ts`
- Backfill pass over `content-packs/kitchen/uj-*.json` and `content-packs/content_pack_*.json` blocks that have no stimulus
- Validator integration — warn (not error) on prompts that reference artifacts without matching stimuli

Out of scope:

- Generating prompts themselves (this is purely artifact synthesis)
- Image stimulus content (`imageRef` resolution lives in `image-stimulus-asset-pipeline`)
- LLM-based generation — these heuristics are pure-function, deterministic
- Live content-editor UI (admin tool, future)

## The contract

### CLI

```bash
pnpm --filter @topshelf/content-authoring synth-stimulus \
  --pack content-packs/kitchen/uj-fajita-rush.json \
  --block tb-rush-1 \
  --dry-run  # prints draft without writing
```

Modes:

- `--dry-run` (default) — prints the drafted stimulus as JSON, no file changes.
- `--write` — writes the draft into the pack JSON. Authors must re-sign the pack after.
- `--backfill <dir>` — recursively traverses the directory for JSON content packs, runs over every block that has no stimulus, prints a summary report (`N blocks drafted, M skipped`), and writes drafts only if `--write` is also passed. Glob input is not currently supported.

### Heuristic mapping

Keyword detection in `block.content` (question) and `block.canonicalSolution` (response) chooses a stimulus kind:

| Prompt keywords                                                      | Drafted stimulus kind                              |
| -------------------------------------------------------------------- | -------------------------------------------------- |
| "table T#", "order #", "ticket", "guest ordered", "server brought"   | `ticket`                                           |
| "recipe", "yield", "ingredients", "prep time", "cook time"           | `recipe`                                           |
| "station", "grill at", "fryer reading", "prep area", "expediter"     | `station_state`                                    |
| "huddle", "pre-shift", "manager said", "shift notes", "86 items"     | `huddle_notes`                                     |
| "menu", "specials", "features", "tonight's", "weekend brunch"        | `menu_board`                                       |
| "steps to", "order of operations", "first do", "then", "sequence"    | `step_bank`                                        |
| Numeric-only data (temps, weights, scale readings)                   | `plain_text` (monospace)                           |
| Image-bound prompt ("identify this", "what is wrong with the photo") | `image`                                            |
| No keyword match                                                     | **skip** (return `null`, log "no heuristic match") |

When two kinds tie, prefer the more specific one (e.g., `ticket` beats `huddle_notes` if "Table 3" appears anywhere).

### Drafting rules per kind

**Ticket draft:**

- Extract `table` from "Table T#" / "table 4" patterns (regex `/table\s+([A-Za-z0-9-]+)/i`).
- Extract `items[]` from "N x ItemName" patterns. Default `quantity: 1` if not specified.
- Leave `guests`, `server`, `time`, `notes` blank unless explicitly stated in prompt.

**Recipe draft:**

- Extract `title` from "Recipe: X" or first capitalized noun phrase.
- Pull `ingredients[]` from any bulleted/numbered list in the question or solution.
- Pull `steps[]` from the canonical solution if it reads as procedural.
- Leave times blank unless prompt says "10 minutes", "1 hour".

**Station state draft:**

- Extract `observations[]` from declarative sentences ("Grill is at 400°F", "Fryer empty", "Prep table clean").
- Set `contextHeader` to the station name if mentioned.

**Step bank draft:**

- Split `canonicalSolution` on numbered list markers or "first/then/next/finally."
- Steps minimum 2 (schema requirement) — skip drafting if fewer extractable.

**Plain text draft:**

- Pull numeric-heavy lines verbatim (temps, weights, times).
- `monospace: true` if the data looks tabular.

### Output format

Every draft is wrapped in a review envelope when written:

```json
{
  "stimulus": { "kind": "ticket", "table": "T3", "items": [{ "quantity": 2, "name": "Fajita" }] },
  "_authorReview": {
    "synthesizedAt": "2026-05-23T14:00:00Z",
    "heuristic": "table-keyword",
    "needsReview": true,
    "confidence": 0.7
  }
}
```

The `_authorReview` block is stripped before pack signing. Authors clear `needsReview: true` once they have reviewed.

## What to read before coding

1. [packages/content-authoring/src/validation/content-validator.ts](packages/content-authoring/src/validation/content-validator.ts) — existing validator patterns; mirror the rule style.
2. [packages/shared/src/schemas/content.schema.ts:172-179](packages/shared/src/schemas/content.schema.ts#L172-L179) — `challengeStimulusSchema` (what we draft into).
3. [content-packs/kitchen/uj-fajita-rush.json](content-packs/kitchen/uj-fajita-rush.json) — exemplary pack already carrying stimuli (study before drafting backfill).
4. [tests/fixtures/content-packs/bad-missing-stimulus.json](tests/fixtures/content-packs/bad-missing-stimulus.json) — the validator's "missing stimulus" failure case.
5. [topshelf-content-pack-authoring/SKILL.md](.agents/skills/topshelf-content-pack-authoring/SKILL.md) — manifest pack workflow, signing, integrity rules.

## Acceptance criteria

- CLI runs against any UJ pack and produces a draft or a "skipped, no heuristic match" log line per block.
- Drafts always pass `challengeStimulusSchema.safeParse()` — they are valid stimuli.
- Backfill over `content-packs/kitchen/uj-*.json` finds the gaps and writes drafts only with `--write`.
- Validator warns on prompts referencing tickets/recipes/stations/menus without matching stimuli.
- Heuristic unit tests cover every kind + the "no match" path.
- Authors can run `--dry-run`, copy the JSON, edit, paste, and the pack still validates.

## Guardrails

- **Drafts are starting points, not finished work.** The CLI must never auto-commit. Authors review and apply.
- **No LLM calls.** Heuristics are pure regex/keyword matching. Deterministic and offline.
- **Do not synthesize over an existing stimulus.** If a block already has one, skip and log.
- **Never relax `_authorReview.needsReview`** programmatically — only an explicit author edit clears it.
- **Pack signing must be re-run after any draft is written.** The CLI logs a reminder.
- **Stimulus schemas are strict.** A draft that fails validation is a bug in the heuristic — fix the heuristic, do not loosen the schema.
- **The validator stays at WARNING for missing-stimulus**, not ERROR. We let authors ship packs without stimuli (some blocks legitimately need none) but make the gap visible.

## Test plan checklist

- [ ] Each kind has a positive synthesis test (input prompt → expected draft)
- [ ] Negative test: ambiguous prompt → returns `null` with reason
- [ ] Backfill skips blocks that already have a stimulus
- [ ] CLI `--dry-run` writes nothing
- [ ] CLI `--write` writes the draft and adds the review envelope
- [ ] Validator warns on "Table 3 ordered..." prompt without a ticket
- [ ] Drafted output validates against `challengeStimulusSchema`
