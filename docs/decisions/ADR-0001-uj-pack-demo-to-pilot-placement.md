# ADR-0001: UJ Pack Demo-to-Pilot Project Placement

## Status

Accepted.

## Date

2026-05-25

## Context

The UJ Pack project needs project-control documents, legal and brand boundaries, pilot gates, and execution notes.

The repository already separates responsibility across `apps/`, `packages/`, `implementations/`, `docs/`, `content/`, `content-packs/`, `governance/`, `scripts/`, `tests/`, `pilot/`, and `infrastructure/`.

The `projects/` directory is reserved for student hands-on lab projects, not internal project-management controls.

## Decision

Place UJ Pack project controls according to responsibility:

- Legal and brand authorization boundaries go under `governance/legal/`.
- Repo-level demo-to-pilot gates go under `governance/repo/`.
- Pilot checklists and trial controls go under `pilot/uj-pack/`.
- Decision records go under `docs/decisions/`.
- Tracker notes stay adjacent to `tools/uj-tracker/tasks.yaml`.
- GitHub issue templates go under `.github/ISSUE_TEMPLATE/`.

Do not place generated DOCX, XLSX, ZIP, or project packet folders at repo root.

## Consequences

Positive:

- Keeps the repo clean.
- Respects existing workspace topology.
- Separates legal, pilot, docs, and tracker responsibilities.
- Avoids confusing `projects/` with internal management controls.
- Makes future CI and review gates easier to enforce.

Negative:

- The project-control packet is split across multiple folders.
- Reviewers must use the ADR and tracker notes to understand the full control layer.

## Enforcement

Before committing UJ Pack controls, run:

```bash
git status --short
pnpm run format:check
pnpm run typecheck
pnpm run validate:content-packs
```

Commit only intentional Markdown and issue-template files.
