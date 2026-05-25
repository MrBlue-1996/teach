---
name: trigger-engine-implementation
description: Implements the client and server pieces of the trigger + mode-elevation + retention pipeline that drives adaptive teaching. Use when wiring stuck-time timers, repeated-error counters, help-requested buttons, mode state machines, retention reassessment, or decay surfaces. Triggers on requests like "wire stuck_time trigger", "help button surfaces hint", "elevate to L2 after repeated errors", "retention re-prompt scheduler", "decay surface affordance", "mode-specific UI", "persist trigger telemetry". Do NOT use for engine internals — those are in `packages/engine/CLAUDE.md`. Do NOT change trigger thresholds without owner sign-off.
metadata:
  author: topshelf
  version: '0.1.0'
---

# Trigger Engine Implementation

This skill is the implementation guide for Phase 3 (Trigger Engine + Retention). The engine itself already exists in `packages/engine`; this skill is about wiring it to the client (UI surfaces) and server (persistence + scheduler) so triggers actually do something visible.

## Scope and non-scope

In scope:

- Client-side trigger instrumentation in `apps/web/src/**` (timers, counters, buttons)
- Mode-specific UI surfaces (L0..L4) keyed off `TeachingMode`
- Server endpoints that ingest trigger telemetry and return teaching guidance
- Retention reassessment scheduler in `packages/api-server` and the resulting "you are seeing this again" surface in the web app
- Tests against trigger fixtures and mode-elevation transitions

Out of scope:

- Adding or changing trigger types or thresholds in `packages/engine/src/trigger-detector.ts` — engine-engineer owns that.
- Kitchen domain progression logic — that uses its own state machine in `packages/engine/src/kitchen/state-machine.ts`.
- Inventing new pedagogy modes — the L0..L4 numeric enum is the contract.

## Anchor contracts (do not drift)

From `packages/engine/CLAUDE.md` and `packages/engine/src/types.ts`:

| Type           | Values                                                                                | Source |
| -------------- | ------------------------------------------------------------------------------------- | ------ |
| `TeachingMode` | `L0_SILENT=0`, `L1_MINIMAL=1`, `L2_CONTEXTUAL=2`, `L3_ACTIVE=3`, `L4_TUTORIAL=4`      | engine |
| `TriggerType`  | `ERROR_REPEATED`, `STUCK_DETECTED`, `HELP_REQUESTED`, `CONCEPT_GAP`, `TIME_THRESHOLD` | engine |

Hard-coded thresholds (engine-owned — do not duplicate or override):

- `ERROR_REPEATED` — `errorsEncountered >= 3`
- `STUCK_DETECTED` — elapsed > 5 min AND problems/min < 0.1
- `TIME_THRESHOLD` — elapsed > 5 min
- `HELP_REQUESTED` / `CONCEPT_GAP` — set by caller on the context

Mode gate:

- `L1_MINIMAL` only fires on `HELP_REQUESTED`
- `L2_CONTEXTUAL` fires on `ERROR_REPEATED`, `STUCK_DETECTED`, or `HELP_REQUESTED`
- `L3_ACTIVE`+ fires on any trigger

The orchestrator is `PedagogyEngine.processTeachingRequest(context, content)`. It does **not** persist — the caller owns state.

The orthogonal taxonomy lives in the DB schema: `learningModeEnum` (`L1_RECALL..L5_EXPERT`) — that is learner competency, not intervention depth. Do not confuse the two. Reference: `.github/state/board.md` "Key Enums" table.

## Client wiring patterns

### `stuck_time` timer (P3.1.1)

- Live on the challenge surface. Start a timer at challenge entry. Pause on tab-hide.
- At the configurable display threshold (suggested 60–90 s for client UX; the engine fires `STUCK_DETECTED` at 5 min — these are different signals), surface a subtle hint affordance ("Need a hint?" button).
- Do **not** auto-pop hints below the 5-minute mark. The engine is the source of truth for when teaching actually escalates.
- Report `time_threshold` and pace telemetry to the session/event endpoint so server-side context is accurate.

### `repeated_errors` counter (P3.1.2)

- Track wrong-answer count per challenge in challenge-store (`apps/web/src/stores/challenge-store.ts`).
- On the second wrong answer, surface the guided-breakdown affordance. The engine fires `ERROR_REPEATED` at 3; this is the client's earlier soft signal.
- Send `errorsEncountered` on every progress event so the engine's next call has accurate context.

### `help_requested` button (P3.1.3)

- Always-visible help affordance on the challenge surface (lucide `Lightbulb` or `HelpCircle`).
- Tap → POST a progress event with type `help_requested` → server calls `PedagogyEngine.processTeachingRequest` with `triggers: ['HELP_REQUESTED']` and returns the explanation.
- Render the explanation in the warning/amber color slot from `top-shelf-ui`.

## Mode-specific UI surfaces (P3.2.2)

The 5 visible states the user can be in:

| Engine mode     | Visible affordance                                     | Voice                            |
| --------------- | ------------------------------------------------------ | -------------------------------- |
| `L0_SILENT`     | Prompt + input only. No hint button, no nudges.        | (no copy)                        |
| `L1_MINIMAL`    | Hint button visible. Tapping reveals one short hint.   | "Think about ..."                |
| `L2_CONTEXTUAL` | Inline contextual hint surfaces after a trigger fires. | "It looks like ... try ..."      |
| `L3_ACTIVE`     | Step-by-step explanation appears alongside the prompt. | "Here is what is happening: ..." |
| `L4_TUTORIAL`   | Full walkthrough with checkpoints.                     | "Step 1 of N: ..."               |

Rules from `top-shelf-ui`:

- Never surface "L2" / "TeachingMode" / "trigger" as user-facing strings.
- Use semantic color tokens — `--warning` for hints, `--primary` for explanations.
- Keep affordances at ≥ 44×44 px touch targets.

Implementation pattern: a single `<ModeAwareTeachingPanel mode={mode} ... />` that switches internal layout. Do not branch on `mode` inside every page.

## Server wiring (P3.3.1)

Reassessment scheduler:

- Decay calculation lives behind `learner_progress_events`. The scheduler reads the last per-block evaluation and re-promotes a block to the next-block queue when the retention interval has elapsed.
- Endpoint: extend the learner content/next endpoint (or add `GET /learner/retention/due`) — coordinate the exact contract with `api-engineer` and document in `.github/state/decisions.md`.
- The client surfaces a "You are seeing this again" affordance — small, non-judgmental, in body text. Voice: "Quick refresher — you saw this on May 5."

`idle_drop` and `frequency_decline` (P3.3.3) are explicitly deferred to v0.2 unless Phase 3 has slack — per `tasks.yaml`.

## Persistence

All trigger telemetry rides through the existing learner session/event endpoints in `packages/api-server/src/routes/learner.ts`. Do not add a parallel telemetry pipe. Contracts:

- `POST /learner/session/:id/event` — accepts trigger-type events (`help_requested`, `stuck`, etc.).
- The engine call happens server-side in the route — the client does not call `PedagogyEngine` directly.
- The route returns the `TeachingResponse` envelope. The frontend reads `data.teachingResponse.mode` and `data.teachingResponse.content` (or whatever the current envelope shape is — verify against `apps/web/src/lib/api/learner.ts` before relying on field names).

## Testing pattern

- Engine-level: fixture-driven, already covered by `packages/engine/src/engine.test.ts`. New transitions should add cases there.
- API-level: assert that posting a sequence of error events triggers a mode elevation in the persisted `learner_states` row and the next teaching response. Add to `packages/api-server/src/routes/learner.test.ts`.
- Web-level: render-test that mode L0 renders no hint button, L1 renders one, L2 surfaces inline hint after a simulated trigger fires.

## Workflow

1. Read this skill, `.github/state/board.md`, `.github/state/decisions.md`, and `packages/engine/CLAUDE.md`.
2. Decide whether the change is client (UI), server (route + persistence), or both — and dispatch accordingly. Client work pulls in `top-shelf-ui`; server work pulls in `api-engineer` conventions.
3. Write the failing test first when changing transitions or telemetry shape.
4. Implement, keeping engine internals untouched.
5. Confirm `pnpm --filter @topshelf/engine test`, then the api-server and web slices.
6. Append a board update naming triggers wired, the mode surfaces touched, and any new event types persisted.

## Guardrails

- Never override engine thresholds at the call site.
- Never expose L0..L4 labels or trigger-type strings to users.
- Never call `PedagogyEngine` directly from `apps/web` — route through the API.
- Never persist trigger telemetry outside the existing learner-event pipe.
- Never silently widen `TriggerType` in shared types — that is an engine contract change.
