# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
