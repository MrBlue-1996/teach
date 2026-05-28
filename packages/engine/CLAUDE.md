# CLAUDE.md

Last updated: 2026-05-26

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package: `@topshelf/engine`

The core teaching decision kernel. Consumed by `api-server` at runtime and by `implementations/mcp-server` in the prototype.

```bash
pnpm test                          # run all tests
pnpm test -- src/engine.test.ts    # single file
pnpm build                         # tsup → dist/
pnpm typecheck
```

## Module Map

```
src/
  index.ts                  # public exports — only import from here downstream
  pedagogy-engine.ts        # PedagogyEngine orchestrator
  trigger-detector.ts       # TriggerDetector (pure functions object)
  constraint-engine.ts      # ConstraintEngine (pure functions object)
  kitchen/
    index.ts                # kitchen domain exports
    state-machine.ts        # ChallengeMachine
    shadow-validator.ts     # ShadowValidator hidden-rule checker
```

## Core API

All three are exported as plain objects, not classes — call methods directly, no instantiation.

### `TriggerDetector`

```ts
TriggerDetector.detectTriggers(context: TeachingContext): TriggerType[]
TriggerDetector.shouldTeach(mode: TeachingMode, triggers: TriggerType[]): boolean
TriggerDetector.suggestModeElevation(current: TeachingMode, triggers: TriggerType[]): TeachingMode
```

Trigger thresholds (hard-coded, not configurable):

- `ERROR_REPEATED` — `errorsEncountered >= 3`
- `STUCK_DETECTED` — elapsed > 5 min AND problems/min < 0.1
- `TIME_THRESHOLD` — elapsed > 5 min (independent of pace)
- `HELP_REQUESTED` / `CONCEPT_GAP` — set by caller on the context

Mode gate: `L1_MINIMAL` only fires on `HELP_REQUESTED`. `L2_CONTEXTUAL` fires on ERROR_REPEATED, STUCK, or HELP. `L3_ACTIVE`+ fires on any trigger.

### `ConstraintEngine`

```ts
ConstraintEngine.inferProfile(deviceInfo?: Record<string, unknown>): DeviceProfile
ConstraintEngine.getConstraints(profile: DeviceProfile): DeviceConstraints
ConstraintEngine.filterSuggestion(content: string, constraints: DeviceConstraints): string
```

`inferProfile` reads `userAgent` from `deviceInfo` — CrOS UA strings map to Chromebook profiles; RAM/CPU hints refine LOW vs STANDARD. Returns `DESKTOP_STANDARD` when unknown.

`filterSuggestion` truncates at `constraints.maxResponseSize` bytes and appends `"[Response truncated for device constraints]"`. Do not strip that sentinel — callers check for it.

### `PedagogyEngine`

```ts
PedagogyEngine.processTeachingRequest(context: TeachingContext, content: string): TeachingResponse
```

Pipeline: detect triggers → `shouldTeach` gate → `filterSuggestion` → prepend mode prefix → return `TeachingResponse`. Does **not** persist anything — callers own state.

`TeachingResponse`:

```ts
{ shouldTeach: boolean; content?: string; mode: TeachingMode; filtered: boolean; filterReason?: string }
```

## Kitchen Domain (`src/kitchen/`)

Separate pedagogical subdomain for restaurant kitchen simulation. Key exports:

- **`ChallengeMachine`** — state machine tracking challenge phases (`BRIEFING → ACTIVE → REVIEW → COMPLETE`). Manages order queue, inventory, timing pressure.
- **`ShadowValidator`** — validates learner step sequences against hidden rules without revealing them upfront. Returns `ShadowValidationResult` with pass/fail + which hidden rules were checked.

The kitchen domain does not use `TriggerDetector` or `ConstraintEngine` directly — it has its own progression logic driven by `MasteryProfile`.

## Key Types

All types are re-exported through `src/index.ts`. Defining new types: put them in `src/types.ts` (or `src/kitchen/types.ts` for kitchen domain) and export through `index.ts`.

`TeachingMode` is a numeric enum (0–4). When persisted to DB it's stored as an integer. Cast with `as TeachingMode` when reading back.

`DeviceProfile` is a string enum. `ConstraintEngine.inferProfile` is the canonical mapping function — don't duplicate UA-sniffing logic elsewhere.
