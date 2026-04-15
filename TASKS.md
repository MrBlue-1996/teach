# Kitchen Training Platform — Implementation Task List

This is the prescriptive, step-by-step work plan for building the "Solve First, Then Teach" line cook training platform. Tasks are ordered by dependency and are written so a model like Haiku 4.5 can execute each without prior context.

## Conventions

- Monorepo root: `/home/user/teach`
- Web app root: `apps/web/src`
- Engine package: `packages/engine/src`
- All kitchen code lives under `/kitchen` route (web) or `/kitchen` subdir (engine)
- Import engine types via `@topshelf/engine` (already re-exported)
- Import UI utilities via `@/lib/utils` (cn helper) and local CSS classes from `kitchen.css`
- Use Zustand store `useChallengeStore` from `@/stores/challenge-store`
- All files are TypeScript strict mode (`tsconfig.base.json`)
- Git branch: `claude/cook-training-platform-gdAW1`

---

## Phase 1 — Foundation Already Built

Completed (do not redo):

- `packages/engine/src/kitchen/types.ts` — types, enums, RANK_THRESHOLDS
- `packages/engine/src/kitchen/state-machine.ts` — `ChallengeMachine`
- `packages/engine/src/kitchen/shadow-validator.ts` — `ShadowValidator` + 13 builtin rules
- `packages/engine/src/kitchen/index.ts` — re-exports
- `packages/engine/src/index.ts` — patched to export kitchen/*
- `infrastructure/supabase/migrations/001_kitchen_tables.sql`
- `infrastructure/supabase/functions/analyze-attempt/index.ts`
- `apps/web/src/app/kitchen/page.tsx` (dashboard)
- `apps/web/src/app/kitchen/layout.tsx`
- `apps/web/src/app/kitchen/kitchen.css`
- `apps/web/src/stores/challenge-store.ts`

---

## Phase 2 — React Hooks

### Task 2.1 — `use-challenge.ts`

**Path:** `apps/web/src/hooks/use-challenge.ts`

Bridge between `ChallengeMachine` + `ShadowValidator` + Zustand store. Export:

```ts
export function useChallenge(config: ChallengeConfig): {
  phase: ChallengePhase;
  timeRemainingMs: number;
  logEvent: (type: EventType, payload?: Record<string, unknown>) => void;
  completeTicket: (ticketId: string) => void;
  recordHandwash: () => void;
  handsDirty: boolean;
  infractionCount: number;
  ticketsCompleted: number;
  ticketsTotal: number;
  start: () => void;
  endSolve: () => void;
  advance: () => void;    // advances to teach, verify, mastery, completed
  reset: () => void;
};
```

Implementation notes:
- On mount with config, call `store.initChallenge(config)`
- Hold a ref to a new `ChallengeMachine(config)` and `ShadowValidator()`
- `logEvent`: build `ChallengeEvent`, call `machine.recordEvent(ev)`, pass to `validator.evaluate(ev, state)`; for any infractions returned call `store.addInfraction(i)` and `machine.addInfraction(i)`
- Use `setInterval(500ms)` timer; call `machine.tick(now)` and update `store.tick(deltaMs)`; also call `validator.runPeriodicChecks(machine.getState())`
- Clean up interval on unmount

### Task 2.2 — `use-voice-control.ts`

**Path:** `apps/web/src/hooks/use-voice-control.ts`

Wrap Web Speech API `SpeechRecognition`. Export:

```ts
export function useVoiceControl(commands: Record<string, () => void>, enabled = true): {
  isListening: boolean;
  lastTranscript: string;
  start: () => void;
  stop: () => void;
};
```

- Use `window.SpeechRecognition ?? window.webkitSpeechRecognition`
- On recognition result, lowercase final transcript, look up in `commands` map (includes fuzzy match: check if any key substring matches)
- Support commands: "fire", "done", "rush", "wash hands", "help", "skip"
- Guard against SSR (`typeof window === 'undefined'`)

### Task 2.3 — `use-event-logger.ts`

**Path:** `apps/web/src/hooks/use-event-logger.ts`

Lightweight helper that buffers events and POSTs to `/api/kitchen/attempts/{id}/events` every 2s or on page unload. Not required for MVP — can forward to `useChallenge().logEvent` directly. Stub with a no-op network flush for now.

---

## Phase 3 — Reusable Components

All go under `apps/web/src/components/kitchen/`. Use `'use client'` directive.

### Task 3.1 — `RushTimer.tsx`

Props: `{ remainingMs: number; totalMs: number; className?: string }`
- Compute percent = remainingMs/totalMs
- Apply class: `timer-green` (>50%), `timer-amber` (25-50%), `timer-red` (<25%), `timer-critical` (<10%)
- Render as large (48pt) monospace mm:ss display
- Use `kitchen.css` timer classes

### Task 3.2 — `TicketQueue.tsx`

Props: `{ tickets: Ticket[]; activeTicketId?: string; onFire: (id: string) => void; onComplete: (id: string) => void }`
- Render each ticket as `.ticket` card; apply `.rush` / `.vip` / `.completed` classes
- Show table #, time elapsed, items list
- Large tap targets for Fire / Complete buttons

### Task 3.3 — `InventoryBins.tsx`

Props: `{ ingredients: Ingredient[]; onSelect: (ing: Ingredient) => void; onReturn: (ing: Ingredient) => void }`
- Grid of `.inventory-bin` cards
- Show spoiled state via `.spoiled` class
- HTML5 drag-and-drop or pointer-based selection
- Emits `INGREDIENT_SELECTED`, `INGREDIENT_WASTED`, `INGREDIENT_RETURNED` events via `useChallenge().logEvent`

### Task 3.4 — `DirtyHandTimer.tsx`

Props: `{ lastHandwashAt: number; onWashClick: () => void }`
- Compute ms since lastHandwashAt
- 0-15s: `.hands-clean` (green dot), 15-30s: `.hands-warning` (amber), >30s: `.hands-dirty` (red pulse)
- Clicking triggers `onWashClick` (calls `recordHandwash()`)
- Tiny badge floating top-right of play area — it's a hidden mechanic so don't label it loudly

### Task 3.5 — `TempGauge.tsx`

Props: `{ value: number; target: { min: number; max: number }; unit?: 'F' | 'C'; onChange?: (v: number) => void }`
- Vertical gauge using `.temp-gauge` styles; classes: cold (<target.min), safe (in range), danger (in FDA danger 40-140°F), hot (>target.max)
- Optional slider control when `onChange` provided

### Task 3.6 — `StationCanvas.tsx`

Props: `{ slots: StationPosition[]; items: { id: string; label: string; correctSlot?: string }[]; onPlace: (itemId: string, slot: string) => void; locked?: boolean }`
- Grid with `.station-canvas` background
- Slots shown as `.station-slot`; correctness revealed only after reveal (`filled`/`correct`/`incorrect`)
- Accept drag-and-drop via `react-dnd`-free vanilla pointer events

### Task 3.7 — `SafetyAlert.tsx`

Props: `{ open: boolean; headline: string; subtext?: string; onDismiss: () => void }`
- Full-screen overlay `.safety-alert-overlay`
- Only for critical violations (temp_abuse, allergen_cross_contam, raw_cooked_contact)
- Dismiss button is 64x64dp minimum

### Task 3.8 — `ReflectionHUD.tsx`

Props: `{ consequence: ConsequencePayload; events: ChallengeEvent[]; expertRecipe?: ExpertRecipe }`
- Timeline (horizontal scroll) of event markers
- Click marker → shows `CoachingFact` card with dollar-cost overlay
- Headline numbers: wasted $, delay, grade badge
- Used on Consequence screen

### Task 3.9 — `RecipeCard.tsx`

Props: `{ recipe: ExpertRecipe; locked?: boolean; highlightStep?: number }`
- When `locked`, shows only title + blurred steps with lock icon
- When unlocked, expandable steps with "why" rationale text
- Highlight step index with `.ring-amber-400`

### Task 3.10 — `GradeBadge.tsx`

Props: `{ grade: 'A' | 'B' | 'C' | 'D' | 'F'; size?: 'sm' | 'md' | 'lg' }`
- Use `.grade-badge .grade-{a-f}` classes

### Task 3.11 — `MasteryRing.tsx`

Already exists inline in dashboard as `CircularProgress`. Extract to `apps/web/src/components/kitchen/MasteryRing.tsx` so it can be reused on `/kitchen/mastery`.

---

## Phase 4 — Challenge Page

### Task 4.1 — Dynamic route

**Path:** `apps/web/src/app/kitchen/challenges/[slug]/page.tsx`

- Client component
- Loads challenge config from `content-packs/kitchen/{slug}.json` via dynamic import
- Calls `useChallenge(config)`
- Renders phase-specific subview:
  - `setup` → `<ChallengeIntro>` with rules + FIRE button
  - `solve` → `<SolveView>` — depends on `config.type`:
    - `rush_hour` → `<RushHourView>` (TicketQueue + InventoryBins + StationCanvas + RushTimer + DirtyHandTimer)
    - `ghost_recipe` → `<GhostRecipeView>` (scaling sliders, blind plating canvas)
    - `station_setup` → `<StationSetupView>` (StationCanvas only, order-of-operations list)
    - `temp_check` → `<TempCheckView>` (TempGauge grid)
    - `inventory_scramble` → `<InventoryScrambleView>` (date-labeled bins, FIFO drag)
    - `labor_prep` → `<LaborPrepView>` (schedule grid + prep list)
    - `hazard_scan` → `<HazardScanView>` (image hotspots)
    - `mock_impossible` → `<MockImpossibleView>` (ticket with bad allergen data)
  - `consequence` → `<ConsequenceView>` with `<ReflectionHUD>`
  - `teach` → `<TeachView>` with `<RecipeCard locked={false}>` + expert comparison
  - `verify` → identical to `solve` view but uses `setIsVerification(true)`
  - `mastery` → `<MasteryView>` with grade + domain deltas + "Continue" button
  - `completed` → redirect to `/kitchen`
- Each subview file lives under `apps/web/src/app/kitchen/challenges/[slug]/_views/`

### Task 4.2 — Minimum viable subviews

To keep MVP shippable, implement `RushHourView`, `StationSetupView`, `TempCheckView` fully. Stub the other 5 as "Coming Soon" cards that log `CHALLENGE_STUB_VIEWED` and redirect back. This is acceptable per rollout priorities.

---

## Phase 5 — Content Pack Templates

All JSON files go in `content-packs/kitchen/` (create directory). Each validates against the `ChallengeConfig` type.

### Template skeleton

```json
{
  "id": "rush-hour-v1",
  "slug": "rush-hour",
  "type": "rush_hour",
  "title": "Saturday 8pm Rush",
  "description": "Plate 10 tickets in 10 minutes without burning the line.",
  "difficulty": 3,
  "durationMs": 600000,
  "recipe": { ... ExpertRecipe ... },
  "stations": [ ... ],
  "tickets": [ ... ],
  "inventory": [ ... ],
  "shadowRules": ["handwash_neglect", "cross_contamination", "fifo_violation"],
  "masteryDomains": ["speed", "sanitation", "sequencing", "efficiency"],
  "coachingFacts": [ ... ],
  "verifyVariant": { "tickets": 5, "durationMs": 300000 }
}
```

### Task 5.x — Create one file per challenge

- `content-packs/kitchen/rush-hour.json`
- `content-packs/kitchen/ghost-recipe.json` (double a recipe under pressure, tests fractions)
- `content-packs/kitchen/station-setup.json` (mise en place before brunch)
- `content-packs/kitchen/temp-check.json` (label coolers with correct target temps)
- `content-packs/kitchen/inventory-scramble.json` (FIFO sorting against expiry dates)
- `content-packs/kitchen/labor-prep.json` (schedule 4 cooks across 8 tasks)
- `content-packs/kitchen/hazard-scan.json` (click hazards in a photo — OSHA)
- `content-packs/kitchen/mock-impossible.json` (receive allergen-conflicting order)

Each must include at least 3 `coachingFacts` and specify which `masteryDomains` it secretly assesses.

---

## Phase 6 — Mastery Dashboard

**Path:** `apps/web/src/app/kitchen/mastery/page.tsx`

- Client component; fetch user mastery via Supabase: `supabase.from('user_mastery').select('*').eq('user_id', user.id)`
- Render 12 domain rings using `MasteryRing`
- Show current `KitchenRank` badge + points-to-next-rank progress bar
- Cooldown warnings: any domain with score < 50 shown in amber, with "Run Verification" button that deep-links to last failed challenge
- Use mock data fallback if Supabase unavailable

---

## Phase 7 — QR Validation Page

**Path:** `apps/web/src/app/kitchen/qr-validate/page.tsx`

- Request camera permission
- Use `@zxing/browser` (add to package.json: `"@zxing/browser": "^0.1.5"`)
- On successful scan, POST to `/api/kitchen/qr/validate` with `{ code, user_id, location }`
- Show green/red full-screen feedback based on response
- Graceful fallback: manual code entry input

API route stub at `apps/web/src/app/api/kitchen/qr/validate/route.ts` that writes to `qr_validations` table and returns `{ status: 'approved' | 'pending' | 'rejected' }`.

---

## Phase 8 — Voice Control & Permissions

### Task 8.1 — `next.config.js`

Replace the `Permissions-Policy` header to allow mic in the kitchen route only:

```js
{
  key: 'Permissions-Policy',
  value: 'camera=(self), microphone=(self), geolocation=()'
}
```

### Task 8.2 — Hook up in layouts

In `apps/web/src/app/kitchen/layout.tsx`, wrap children in a `<VoiceProvider>` that uses `useVoiceControl` with a shared command registry exposed via context.

---

## Phase 9 — Commit & Push

Sequence of commands:

```bash
git add -A
git commit -m "feat(kitchen): production training platform with shadow assessment"
git push -u origin claude/cook-training-platform-gdAW1
```

If push fails, retry with exponential backoff (2s, 4s, 8s, 16s). Do not create a PR unless asked.

---

## Risk & Scope Cuts

If time is tight, ship in this order (drop from bottom):

1. Engine + DB + Edge Function **(done)**
2. Dashboard + kitchen.css **(done)**
3. useChallenge hook + RushTimer + DirtyHandTimer + SafetyAlert + TicketQueue
4. Dynamic challenge page with `rush_hour` view only
5. One content pack: `rush-hour.json`
6. Mastery page
7. Remaining 7 content packs + views
8. QR validation
9. Voice control

Shadow validation (hidden assessment) must work end-to-end in whichever subset ships; that is the defining feature.
