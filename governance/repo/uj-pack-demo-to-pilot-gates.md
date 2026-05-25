# UJ Pack Demo-to-Pilot Gates

## Purpose

This document defines the repo-level gates that must pass before the UJ Pack moves from demo to pilot.

## Gate 1: Repository Health

Required commands:

```bash
pnpm run format:check
pnpm run typecheck
pnpm run validate:content-packs
pnpm run track:status:md
```

Pass condition:

- All required commands exit with code 0.
- `git status --short` shows only intentional project-control files before commit.

## Gate 2: Tracker Alignment

The tracker in `tools/uj-tracker/tasks.yaml` remains the project execution source of truth.

Pass condition:

- Tracker status agrees with docs.
- Blocked items have a `blocked_on` reason.
- Review items have a clear reviewer or manual gate.
- Deferred items are not presented as complete.

## Gate 3: Authorization Boundary

Pass condition:

- Brand-use boundary is documented.
- Demo wording does not claim official approval.
- Any real content source is authorized or removed.
- Legal/privacy notes are reviewed before pilot.

## Gate 4: Pilot Scope

Pass condition:

- Pilot checklist exists under `pilot/uj-pack/`.
- Pilot uses synthetic sample data unless written approval allows real data.
- Pilot goal, audience, and no-go rules are documented.
- Pilot success criteria are measurable.

## Gate 5: Public-Claim Control

Pass condition:

- Investor, demo, README, and user-facing docs do not overclaim.
- No language implies Sun Holdings or Uncle Julio's endorsement without written approval.
- Public demo language says "demo concept" or equivalent.

## Gate 6: Technical Readiness

Pass condition:

- App builds.
- Content packs validate.
- TypeScript passes.
- PWA/mobile status is either passed or explicitly scoped as pending.
- Known placeholders are tracked and not hidden.

## Required Review Before Pilot

Before real pilot work, review:

- `governance/legal/uj-pack-authorization-boundary.md`
- `pilot/uj-pack/PILOT_GATE_CHECKLIST.md`
- `tools/uj-tracker/tasks.yaml`
- generated tracker status report

## Definition of Done

UJ Pack is pilot-ready only when all gates above are met and no no-go rule is active.
