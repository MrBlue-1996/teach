# Scripts

This directory contains repository automation entry points.

## Areas

- `bootstrap.mjs` bootstraps the workspace.
- `workflow-lint.mjs` lints `.github/workflows/` with `actionlint`, using Docker as a fallback when the binary is not installed locally.
- `migration/` contains migration scripts.
- `release/` contains release automation.

## Indexing Notes

- Start here for setup and automation before looking at CI workflows.

## Commands

- `node scripts/workflow-lint.mjs` runs workflow linting without changing root `package.json`.
