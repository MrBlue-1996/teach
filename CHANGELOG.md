# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.1.3] — 2026-05-26

### Added

#### Web App

- **PWA shell** (`apps/web/`): Service worker, web app manifest, and offline fallback page — app is now installable on Chromebook-class devices and handles network loss gracefully.
- **P3.1 client-side trigger UI** (`apps/web/src/app/learn/`): Trigger detection is now wired into the learn surface; stuck-time and repeated-error triggers surface in-session affordances without requiring a page reload.
- **Decay affordance + retention queue** fully wired end-to-end: `DecayStatusPanel` now reads live `retentionQueue` data returned by the API (retention scheduling shipped in v0.1.2 is now fully connected to the frontend).

#### Infrastructure / Config

- **Hybrid-only env mode**: New `HYBRID_ONLY` flag and `DATABASE_URL` config fallback allow the server to run against Supabase-only, local Postgres, or a hybrid setup without code changes.
- **Demo-to-pilot project controls** (`#40`): UJ Pack gates, governance files, and repo controls that gate progression from demo to pilot deployment.

#### Docs / Agents

- **Agent scope guides**: Specialized agent `.md` files added under `.github/agents/` to document each agent's domain boundaries.

### Changed

- **Auth flow stabilized**: Supabase-first DB config is now the default; onboarding auth redirect fixed (`Fix onboarding auth flow`).
- **Kitchen golden path selector**: UJ challenge link selector corrected so the golden-path E2E test reliably targets the right element.
- **Next.js bumped** 15.5.15 → 15.5.18 (`#36`).
- **Dependency updates** (patch/minor): hono, supabase, next-themes, react, turbo.
- **Code structure refactor**: Internal module organisation improved for readability and maintainability — no behaviour changes.

### Fixed

- **44 pre-existing lint warnings resolved** across the monorepo (`fix: resolve all 44 pre-existing lint warnings`).

---

## [0.1.2] — 2026-05-10

### Added

#### Engine

- **Mode elevation** (`packages/engine/src/pedagogy-engine.ts`): `processTeachingRequest` now calls `suggestModeElevation` to promote the current teaching mode based on detected triggers (streak, correctness, dwell-time). The SILENT (L0) invariant is preserved — SILENT always returns `shouldTeach: false` regardless of triggers. Elevated mode is returned in the response for downstream callers.
- 3 new engine unit tests covering elevation behavior and SILENT invariant.

#### API Server

- **Retention scheduling** (`packages/api-server/src/routes/learner.ts`): On `completed` events with correctness ≥ 0.7, a retention record is appended to `learnerState.retentionHistory`. The `GET /learner/progress/:contentPackId` endpoint now returns a `retentionQueue` field listing content blocks due for review within the next 14 days, ordered by urgency.
- New helpers: `buildRetentionRecord`, `computeRetentionQueue`, `appendRetentionRecord`.
- Retention queue field and record persistence covered by 4 new test assertions.

#### Web App

- **Phone Emulator** (`apps/web/src/app/kitchen/preview/page.tsx`): Dev tool page renamed from "Phone Preview" to "Phone Emulator" throughout UI and navigation.
- **Decay affordance panel** (`apps/web/src/app/kitchen/mastery/page.tsx`): New `DecayStatusPanel` section reads `retentionQueue` from the API and renders color-coded urgency badges (healthy / watch / urgent).
- **`mastery-decay` utility** (`apps/web/src/lib/mastery-decay.ts`): Deterministic `computeDecayStatus(queue)` and `formatDueLabel(daysUntilDue)` functions — no `Date.now()` in pure paths for deterministic test coverage.
- 5 new deterministic unit tests in `apps/web/src/lib/mastery-decay.test.ts`.
- CSS classes for decay panel states added to `apps/web/src/app/kitchen/kitchen.css`.

#### Content Packs

- **6 Uncle Julio's kitchen challenge packs hardened** (Phase 2): `uj-fajita-rush`, `uj-enchilada-rush`, `uj-grill-setup`, `uj-allergy-order`, `labor-prep`, `temp-check` — all packs verified for recipe step coverage, critical control point (CCP) annotations, and schema compliance against `content_pack_schema_v2`.

#### Testing

- Kitchen stimulus E2E gate: 6/6 stimulus renderer tests pass (`kitchen-stimuli.spec.ts`).
- Mobile phone E2E gate: 2/2 Pixel-7 emulator tests pass (`kitchen-phone.mobile.spec.ts`) — added emulator route test with device switching and `iframe.src` assertions.

### Changed

- `apps/web/src/lib/api/learner.ts`: Added `RetentionHistoryEntry` and `RetentionQueueEntry` interfaces; `LearnerProgress.progress` extended with optional `retentionQueue` field.

### Deferred to v0.2

- **Phase 3.4 decay integration**: Frontend decay panel renders from static mock queue; live API wiring deferred until retention backend is fully deployed.
- **Phase 3.5 trigger type expansion**: `idle_drop` and `frequency_decline` triggers not yet wired into `TriggerDetector`.
- **Locale / i18n**: All content currently en-US only.
- **PWA manifest / Chromebook installability**: Planned post-release.

---

## [0.1.1] — 2026-04-XX

### Added

- Phase 1: Schema v2 validation, Zod validator rules, CLI `validate:content-packs` command.
- Phase 3.1: Six stimulus renderers (`multiple-choice`, `short-answer`, `scenario`, `order-steps`, `image-label`, `true-false`); `SolveView` wired into kitchen challenge flow.
- Recipes surface: standalone `/kitchen/recipes` page + in-context recipe toggle on challenge view.
- Phone emulator: `/kitchen/preview` dev tool with Pixel-7 frame component.

---

## [0.1.0] — 2026-03-XX

### Added

- Initial monorepo scaffold: `@topshelf/engine`, `@topshelf/api-server`, `@topshelf/web`, `@topshelf/shared`, `@topshelf/database`.
- Pedagogy engine: `PedagogyEngine`, `TriggerDetector`, `ConstraintEngine`, `TeachingMode` enum (L0–L4).
- Kitchen challenge domain: state machine, shadow validator, 6 UJ packs (initial drafts).
- Auth: JWT-based session, register/login/refresh routes.
- Database: Drizzle ORM schema, learner state persistence.
