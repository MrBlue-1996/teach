---
name: spaced-retrieval-scheduler
description: Implements the server-side spaced-retrieval queue that surfaces learner blocks due for review. Use when wiring the retention scheduler, adding the due-queue endpoint, advancing intervals on pass/fail, or building the "Review now" client surface. Triggers on "spaced repetition", "retention queue", "Leitner intervals", "due for review", "mastery decay scheduler", "review now card". Do NOT use for the engine's mode-fade logic — see `worked-example-fading`.
metadata:
  author: topshelf
  version: '0.1.0'
---

# Spaced Retrieval Scheduler

This skill wires spaced retrieval into TopShelf. The decay model already exists in [apps/web/src/lib/mastery-decay.ts](apps/web/src/lib/mastery-decay.ts) and computes a `DecayAffordance` from a queue summary. The gap: nothing actually populates `dueTaskIds`. This skill closes that gap.

## The principle

> Spaced retrieval is the most replicated learning enhancement in cognitive science. For procedural skills (which TopShelf domains are), the effect size is larger than for declarative knowledge.

In TopShelf terms: every passed block enters a retention schedule. When the scheduled `nextReassessAt` arrives, the block surfaces as a "due review" challenge. Pass → interval doubles; fail → interval resets to 1 day.

## Scope and non-scope

In scope:

- New server-side service: `packages/api-server/src/lib/retention-scheduler.ts`
- New endpoint: `GET /api/learner/retention/queue`
- Hook into `recordEvent` to advance/reset intervals
- DB schema additions on `retention_records` (verify before adding)
- Client `dashboard/page.tsx` "Review now" affordance using existing `computeDecayAffordance`
- Tests for interval math and queue ordering

Out of scope:

- Existing decay-affordance math in `mastery-decay.ts` — do not change its semantics
- Mode/fade logic — see `worked-example-fading`
- Interleaving (which blocks come next in a session) — see `trigger-engine-implementation` and the future interleaving skill

## The contract

### Interval ladder (Leitner-style)

```
Stage 0: 1 day  (first reassessment after initial pass)
Stage 1: 3 days
Stage 2: 7 days
Stage 3: 14 days
Stage 4: 30 days
Stage 5: 60 days
Stage 6+: 120 days (capped)
```

State transitions:

- **Pass at a stage** → advance to next stage, set `nextReassessAt = now + intervalDays(stage)`.
- **Fail at any stage** → reset to stage 0, set `nextReassessAt = now + 1 day`.
- **Help requested during a pass** → still counts as pass, but do not advance the stage. Stay put. Set `nextReassessAt = now + intervalDays(currentStage)`.

These constants live in `retention-scheduler.ts` as named values. Never hardcode magic numbers elsewhere.

### Endpoint shape

`GET /api/learner/retention/queue` returns:

```ts
{
  dueTaskIds: string[];        // block IDs whose nextReassessAt <= now, oldest-first
  dueCount: number;
  nextDueAt: string | null;    // ISO timestamp of next future due item, or null if none
}
```

Matches `RetentionQueueSummary` in [mastery-decay.ts:7-11](apps/web/src/lib/mastery-decay.ts#L7-L11) exactly. Do not invent a new shape.

`dueTaskIds` is bounded — cap at 50 to avoid runaway queues. If a learner has >50 due, that is a separate signal worth surfacing (UI shows "many overdue" status).

### Recording outcomes

`POST /api/learner/sessions/:id/events` already exists. The scheduler hooks in when the event indicates block completion:

```ts
// inside event handler:
if (event.type === 'block_completed') {
  await RetentionScheduler.recordOutcome({
    learnerId,
    blockId: event.blockId,
    passed: event.passed,
    helpRequested: event.helpRequested,
    completedAt: event.completedAt,
  });
}
```

`recordOutcome` does the stage advance/reset and writes the updated `retention_records` row.

### Decay half-life

The existing `mastery-decay.ts` uses `decayHalfLifeDays` (default 21). The scheduler records this on each `retention_record` row so different content domains can have different half-lives (food-safety vs prep-technique vs menu-knowledge).

Per-block `decayHalfLifeDays` can be set on the teaching block via content pack metadata. If absent, fall back to the platform default. Half-life is stored on the row so changes to defaults do not retroactively affect existing learners.

## What to read before coding

1. [apps/web/src/lib/mastery-decay.ts](apps/web/src/lib/mastery-decay.ts) — `RetentionQueueSummary`, `RetentionHistoryEntry`, `DecayAffordance`. Conform to these shapes.
2. [packages/database/src/schema/index.ts](packages/database/src/schema/index.ts) — current `retention_records` table. May need additions (`stage`, `intervalDays`).
3. [packages/api-server/src/routes/learner.ts](packages/api-server/src/routes/learner.ts) — pattern for adding endpoints + middleware order.
4. [docs/4-pedagogy/README.md](docs/4-pedagogy/README.md) — narrative.

## Schema changes (db-engineer scope)

The `retention_records` table likely needs:

- `stage: integer NOT NULL DEFAULT 0`
- `interval_days: integer NOT NULL DEFAULT 1`
- `consecutive_passes: integer NOT NULL DEFAULT 0`
- `decay_half_life_days: integer NOT NULL DEFAULT 21`
- `next_reassess_at: timestamptz NOT NULL`
- Index: `(learner_id, next_reassess_at)` for fast due-queue queries

Coordinate via a blocker if anything is already named differently.

## Client surface

The dashboard adds a card driven by `computeDecayAffordance`:

- `status: 'healthy'` → small "All caught up" tile, no CTA.
- `status: 'watch'` → orange tile, "1-2 items to review" with a CTA to start the first due block.
- `status: 'urgent'` → red tile, "Several items overdue", same CTA.

Voice rules: do not say "spaced repetition" or "Leitner." Use "Review" or "Refresh" framing. See `top-shelf-ui`.

Entry point: clicking the card opens the first `dueTaskIds[0]` block in normal challenge mode. Engine handles teaching mode selection (review at lower mode is fine; mastery already exists).

## Acceptance criteria

- `GET /api/learner/retention/queue` returns exactly the documented shape.
- Pass advances stage, sets next interval correctly per the ladder. Tested.
- Fail resets stage to 0, sets next interval to 1 day. Tested.
- Help-requested-on-pass does not advance stage. Tested.
- Decay half-life is read from the row, not from a global constant at query time. Tested.
- Dashboard "Review now" card renders for `watch` and `urgent` states; hidden for `healthy`. Tested.
- All existing tests pass (no regressions in learner API).

## Guardrails

- **Never re-implement decay math.** Use `computeDecayAffordance` on the client.
- **Never schedule a review for a block the learner has not yet passed.** Initial exposure goes through the normal teaching flow first.
- **Never put more than 50 items in `dueTaskIds`.** If learner has more, signal "overflow" without dumping the full list.
- **Do not surface stage/interval/Leitner internals in UI.** Voice: "review", not "stage 3 reassessment."
- **All scheduler functions must be pure or DB-bounded.** No external API calls, no LLM calls. The scheduler is deterministic.
- **The interval ladder lives in code, not config.** Changing it is a decision-memo event because it affects every learner's retention curve.

## Test plan checklist

- [ ] Stage advance on pass: 0→1, 1→2, ... 5→6, 6→6 (capped)
- [ ] Stage reset on fail at any stage
- [ ] Help-requested pass keeps stage unchanged
- [ ] `nextReassessAt` is computed from `completedAt + intervalDays(stage)`, not from `now`
- [ ] Queue endpoint returns oldest-first by `nextReassessAt`
- [ ] Queue cap at 50 items
- [ ] Dashboard renders correct affordance for `healthy`, `watch`, `urgent`
- [ ] Existing `mastery-decay.test.ts` still passes
