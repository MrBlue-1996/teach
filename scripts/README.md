# Scripts

This directory contains repository automation entry points.

## Areas

- `bootstrap.mjs` bootstraps the workspace.
- `workflow-lint.mjs` runs `actionlint` against `.github/workflows/*.yml`.
- `migration/` contains migration scripts.
- `release/` contains release automation.

## Indexing Notes

- Start here for setup and automation before looking at CI workflows.

## Commands

- `node scripts/workflow-lint.mjs` runs workflow linting without changing root `package.json`.
