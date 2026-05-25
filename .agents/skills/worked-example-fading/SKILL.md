---
name: worked-example-fading
description: Implements the worked-example-first pedagogy for novice learners and fades teaching depth as competence grows. Use when changing how the engine selects an initial teaching mode, adding initial-exposure detection, implementing mode fade after consecutive passes, or wiring per-block mode seeds. Triggers on "expertise reversal", "worked example first", "fade tutorial mode", "novice should start at L4", "initial exposure", "engine picks the wrong starting mode". Do NOT use for trigger detection on errors/stuck — see `trigger-engine-implementation`.
metadata:
  author: topshelf
  version: '0.1.0'
---

# Worked-Example-First Fading

This skill encodes the expertise-reversal correction in the TopShelf pedagogy engine. The default L2_CONTEXTUAL mode is correct for intermediate learners but suboptimal for true novices: cognitive-load research shows novices need full worked examples first, faded to problem-solving as competence grows.

## The principle

> Worked examples beat problem-solving for novices. Problem-solving beats worked examples for the competent. Fade between them as the learner's expertise grows.
> — Cognitive load theory, expertise reversal effect (Sweller, Kalyuga)

In TopShelf terms: a learner with **zero mastery on a concept** should start at **L4_TUTORIAL**, not L2_CONTEXTUAL. After a few clean passes, fade down — L4 → L3 → L2 → L1. The learner can always override.

## Scope and non-scope

In scope:

- [packages/engine/src/pedagogy-engine.ts](packages/engine/src/pedagogy-engine.ts) — `createContext`, mode seeding
- [packages/engine/src/trigger-detector.ts](packages/engine/src/trigger-detector.ts) — new `suggestModeFade` function
- [packages/engine/src/types.ts](packages/engine/src/types.ts) — `initialExposure`, fade-state fields on `TeachingContext`
- [packages/api-server/src/routes/learner.ts](packages/api-server/src/routes/learner.ts) — `getTeachingGuidance` returns `recommendedMode`
- Per-block `mode: learningModeSchema` from [content.schema.ts:281](packages/shared/src/schemas/content.schema.ts#L281)

Out of scope:

- Trigger detection (ERROR_REPEATED, STUCK_DETECTED, HELP_REQUESTED) — see `trigger-engine-implementation`
- Spaced retrieval scheduling — see `spaced-retrieval-scheduler`
- UI surfacing of recommended mode — see `top-shelf-ui` for voice/visual treatment

## The contract

### Novice detection

A learner is in **initial exposure** to a `concept` when:

```
mastery(learner, block.concept) === 0
  AND
no prior session events reference any block with the same concept
```

The engine reads this from `LearnerState.masteryProfile` (already in the schema). When true, `TeachingContext.initialExposure` is set to `true` by the caller.

### Mode seeding precedence

When `PedagogyEngine.createContext()` is called, the seed mode is chosen in this order:

1. **Explicit learner override** (manual mode set via `POST /api/session/mode`) — always wins.
2. **`initialExposure === true`** → `L4_TUTORIAL`. Worked example, full step-by-step.
3. **`block.mode` (per-block learningMode)** — content authors can hint the starting mode for a block.
4. **Account default** — `L2_CONTEXTUAL` is the platform-wide fallback.

This precedence is documented in `PedagogyEngine.createContext` and must be tested.

### Fade policy

After the seed mode, fade is driven by `TriggerDetector.suggestModeFade(currentMode, recentTrials)`:

```
recentTrials: { passed: boolean; helpRequested: boolean }[]  // last N trials within concept
```

Fade rule (Leitner-inspired, single-step):

- **3 consecutive passes, no help requested** → fade down one mode (L4→L3, L3→L2, L2→L1).
- **2 consecutive fails OR any HELP_REQUESTED in window** → no fade. Reset the consecutive-pass counter.
- **L0_SILENT never fades up automatically** — that is a learner choice.
- **L1_MINIMAL does not fade further down** — it is the floor for automatic fade.

Fade happens between blocks, not within a block. A learner who is mid-problem in L4 stays in L4 until that block resolves.

### Recommended mode in API

`learnerApi.getTeachingGuidance(sessionId, opts?)` returns:

```ts
{
  shouldTeach: boolean;
  content?: string;
  mode: TeachingMode;          // mode used for this response
  recommendedMode: TeachingMode;  // engine recommendation for next block, may differ
  filtered: boolean;
  filterReason?: string;
}
```

The client uses `recommendedMode` as a non-binding seed for the next block. Existing learner overrides persist across blocks until explicitly cleared.

## What to read before coding

1. [packages/engine/src/types.ts](packages/engine/src/types.ts) — current shape of `TeachingContext`, `TeachingMode`, `TeachingResponse`.
2. [packages/engine/src/pedagogy-engine.ts](packages/engine/src/pedagogy-engine.ts) — `processTeachingRequest`, `createContext`. The pipeline is intentionally linear.
3. [packages/engine/src/trigger-detector.ts](packages/engine/src/trigger-detector.ts) — existing `suggestModeElevation` is the up-fade counterpart. Mirror its style.
4. [packages/engine/src/engine.test.ts](packages/engine/src/engine.test.ts) — existing test patterns. Add fade tests alongside.
5. [docs/2-teaching-modes/README.md](docs/2-teaching-modes/README.md) — product narrative for the L0-L4 ladder.

## Acceptance criteria

- A learner with `mastery(concept) === 0` and no override begins in `L4_TUTORIAL`. Tested.
- A learner who passes 3 consecutive blocks at L4 without help → next-block recommendation is L3. Tested.
- HELP_REQUESTED within the fade window resets the counter. Tested.
- Explicit learner mode override always beats both initial-exposure and fade. Tested.
- `recommendedMode` is exposed via `learnerApi.getTeachingGuidance`. Smoke-tested in API integration test.
- Per-block `mode` is honored when no override and no initial-exposure trigger fires. Tested.

## Guardrails

- **Never auto-elevate past L4.** Existing `suggestModeElevation` already caps at L4; `suggestModeFade` must never raise mode.
- **Never override an explicit learner choice.** If `LearnerState.modeOverride` is set, the engine returns it untouched.
- **Never fade during an active problem.** Fade decisions are computed between blocks.
- **Do not surface `initialExposure` or fade-counter internals in user-facing UI.** Voice rules: no "L0..L4", no "fade", no "expertise reversal." See `top-shelf-ui`.
- **No new runtime dependencies in `@topshelf/engine`.** Pure functions only.
- **Hard-coded thresholds (3 passes, 2 fails) live in `trigger-detector.ts` as named constants.** Treat them like the existing `ERROR_REPEAT_THRESHOLD` — change only with a decision memo.

## Test plan checklist

- [ ] `createContext` honors override > initial-exposure > block.mode > default precedence
- [ ] `suggestModeFade` returns same mode when fewer than 3 trials
- [ ] `suggestModeFade` fades one step on 3-pass-no-help
- [ ] `suggestModeFade` does not fade when any help was requested
- [ ] `suggestModeFade` does not fade below L1
- [ ] `getTeachingGuidance` payload includes `recommendedMode`
- [ ] Existing tests still pass (no regression on `suggestModeElevation`)
