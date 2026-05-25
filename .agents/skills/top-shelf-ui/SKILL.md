---
name: top-shelf-ui
description: UI authoring guide for the Top Shelf Teaching Next.js web app. Use when building or modifying React pages, components, or styles in `apps/web/src/**`. Covers brand tokens, typography, touch targets, accessibility, icon usage, voice/tone, and mobile-first patterns. Triggers on requests like "build login UI", "add manager screen", "style this page", "make this mobile-first", "fix touch targets", "render a teaching block", "add stimulus to challenge surface", "build kitchen home", "add accessibility pass". Do NOT use for API/server, engine, or database work.
metadata:
  author: topshelf
  version: '0.1.0'
---

# Top Shelf UI

This skill captures the operating rules for all UI work in `apps/web`.

## Scope and non-scope

In scope:

- `apps/web/src/app/**`
- `apps/web/src/components/**`
- `apps/web/src/hooks/**`
- `apps/web/src/stores/**` (Zustand client-only state)
- Tailwind class authoring against the semantic token layer

Out of scope:

- `packages/api-server/**`, `packages/engine/**`, `packages/database/**`
- Brand token definitions themselves (live under `governance/standards/brand/`)
- Server-fetched data caching (use `useState`/`useEffect`, not Zustand)

## Required reading before UI work

1. `governance/standards/brand/tokens/design-tokens.md`
2. `governance/standards/brand/voice/voice-and-tone.md`
3. `governance/standards/brand/doctrine/brand-doctrine.md`
4. `apps/web/CLAUDE.md`
5. The existing components in `apps/web/src/components/ui/`

## Non-negotiable rules

- **Tokens, not raw hex.** Use `bg-card`, `text-foreground`, `bg-primary`, etc. Never inline `#22C55E`.
- **Fonts**: Montserrat for headings via `font-heading`, Inter for body via `font-sans`, Menlo for code via `font-mono`. Both heading and body fonts are already wired in `layout.tsx` via `--font-montserrat` and `--font-inter`.
- **Icons**: `lucide-react` only. No SVG packs, no inline SVG, no emoji.
- **Touch targets**: every interactive element ≥ 44×44 px. For icon buttons, use `h-11 w-11` minimum or wrap in a padded button.
- **Viewport**: design mobile-first at 320 px. Verify in dev tools at 320 / 375 / 768 / 1024 before claiming done.
- **Dark-first**: primary surfaces are TS Charcoal (`bg-card`) on TS Black (`bg-background`). Light mode must still render but is not the default.
- **`use client` discipline**: only when the component touches `useState`, `useEffect`, `useAuthStore`, browser-only APIs, or event handlers. Default to server components.
- **Voice**: direct, calm, competent. No hype, no exclamation marks except on correct-answer feedback, no emoji in copy. Never expose internal terms ("teaching mode", "trigger", "engine") in user-facing UI.

## Patterns that already exist — reuse first

| Need                  | Component / path                                                 |
| --------------------- | ---------------------------------------------------------------- |
| Button                | `components/ui/button.tsx`                                       |
| Card surface          | `components/ui/card.tsx` (`bg-card` charcoal)                    |
| Form input            | `components/ui/input.tsx`                                        |
| Stat tile             | `components/ui/stat-card.tsx`                                    |
| Page header           | `components/ui/page-header.tsx`                                  |
| Empty state           | `components/ui/empty-state.tsx`                                  |
| Phone frame mockup    | `components/ui/PhoneFrame.tsx`                                   |
| Toaster               | `components/ui/toaster.tsx`                                      |
| Progress bar          | `components/ui/progress.tsx`                                     |
| Kitchen stimuli (six) | `components/kitchen/stimuli/*.tsx` + `StimulusRenderer.tsx`      |
| Kitchen domain        | `components/kitchen/{DirtyHandTimer,MasteryRing,RecipeCard,...}` |

If a need has a pre-existing component, extend it. Do not fork.

## Auth + data access

- Read auth state with `useAuthStore`. Do not read tokens from `localStorage` directly.
- Make API calls through `apps/web/src/lib/api/<domain>.ts`. The client at `lib/api/client.ts` already injects the bearer token. Do not set `Authorization` headers in pages.
- Route protection happens at the `(app)/` group layout. New protected pages go inside `(app)/`. Public pages go in `(legal)/` or `auth/`.

## Mobile-first authoring checklist

Before declaring a UI task done:

1. Render at 320 px wide — no horizontal scroll, no clipped text, no overflowing buttons.
2. Render at 768 px and at the Chromebook reference (1366 × 768) — confirm primary actions stay above the fold on first paint.
3. Tab through every interactive element — focus ring visible (`ring-primary`), order matches visual order.
4. Inspect every `<button>` and `<a>` rendered as a button — hitbox ≥ 44 × 44 (use the browser inspector "Show rulers" or `getBoundingClientRect`).
5. Run a screen-reader sweep on at least the primary path (VoiceOver iOS / TalkBack Android / NVDA / VoiceOver Mac). Headings in order, labels on every input, no decorative icons announced as content.
6. Confirm copy follows the voice rules — short, verb-first buttons, no hype, no jargon leak.

## Teaching mode color contract

When teaching-mode UI signals are needed:

| State       | Token           | Icon            |
| ----------- | --------------- | --------------- |
| Correct     | `--success`     | `CheckCircle2`  |
| Wrong       | `--destructive` | `X`             |
| Hint        | `--warning`     | `Lightbulb`     |
| Explanation | `--primary` /20 | `MessageSquare` |

User-facing UI must not label these as L0..L4 or by trigger name. Show the affordance, not the internal taxonomy.

## Workflow

1. Read this skill, brand tokens, and voice.
2. Read `.github/state/board.md` and `.github/state/decisions.md` for in-flight contract changes.
3. Find an existing component to extend before creating a new one.
4. Build at mobile-first 320 px breakpoint, then layer up.
5. Run the mobile-first checklist above.
6. Run `pnpm --filter @topshelf/web typecheck && pnpm --filter @topshelf/web test`.
7. Append a board update with files changed and any API contract dependency.

## Guardrails

- Never weaken TypeScript strictness or add `any` to ship a page.
- Never store server-fetched data in Zustand. Stores are for session-level client state only.
- Never introduce a second UI library or icon pack.
- Never check in screenshots or fixtures that contain real user data.
- Never expose internal IDs (sessionId, userId) in user-facing copy.
