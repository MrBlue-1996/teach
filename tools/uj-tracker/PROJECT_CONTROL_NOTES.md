# UJ Tracker Project Control Notes

## Purpose

This file explains how the UJ Pack tracker relates to the new project-control documents.

## Source of Truth

`tools/uj-tracker/tasks.yaml` remains the execution source of truth for UJ Pack production status.

## Supporting Control Files

- `governance/legal/uj-pack-authorization-boundary.md`
- `governance/repo/uj-pack-demo-to-pilot-gates.md`
- `docs/decisions/ADR-0001-uj-pack-demo-to-pilot-placement.md`

## Rules

1. Tracker status must not be contradicted by docs.
2. Blocked work must have a clear blocker.
3. Review work must have a manual gate or reviewer.
4. Demo scope and pilot scope must remain separate.
5. Authorization-sensitive claims must be controlled through governance docs.
6. Real employee data must not be used unless privacy approval exists.

## Local Status Command

Use:

```bash
pnpm run track:status:md
```

## Validation Commands

Use:

```bash
pnpm run format:check
pnpm run typecheck
pnpm run validate:content-packs
```

## Placement Rule

Do not move tracker controls into `projects/`. The `projects/` directory is for student lab projects, not UJ Pack execution governance.
