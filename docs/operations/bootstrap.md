# Top Shelf Bootstrap

## Purpose

This bootstrap is the terminal-first operational entrypoint for validating the current `teach` repository without introducing a second control plane.

It is designed to do five things well:

1. batch the main repository checks in one pass
2. continue past non-fatal failures so the full picture is visible
3. assign every failing checkpoint a clear code and severity
4. write machine-readable and human-readable reports
5. display the Top Shelf success banner only after successful completion and final verification

## Why this exists

The repository already has real root scripts for formatting, linting, typechecking, testing, building, and optional content/policy validation. The missing piece was orchestration with checkpointing, severity, reports, and success gating.

This bootstrap is intentionally teach-native. It does not import or wrap external governance code from another repository.

## Checkpoint model

Every checkpoint emits:

- a checkpoint id
- a severity level
- an error or result code
- a message
- a duration
- optional stdout/stderr tails when relevant

### Severity levels

#### PASS

The checkpoint completed successfully.

#### INFO

Informational result. Does not affect success.

#### SKIP

The checkpoint was intentionally skipped. Usually used for optional scripts or verification blocked by an earlier result.

#### WARN

Non-blocking problem. The bootstrap continues and may still succeed if no blocking failures occur.

#### ERROR

Blocking failure. The bootstrap continues so later checkpoints can still run, but the final success banner is suppressed.

#### FATAL

Immediate stop. Used only for conditions that make the rest of the run untrustworthy, such as invalid repo root, unreadable package.json, unsupported Node version, missing pnpm, or failed install with no usable dependency state.

## Exit codes

- `0` — success
- `10` — fatal failure encountered
- `20` — one or more blocking errors encountered
- `30` — final verification failed
- `40` — bootstrap internal crash

## Result and failure codes

### Fatal codes

- `TSS-BS-F001` — invalid repo root
- `TSS-BS-F002` — package.json invalid or unreadable
- `TSS-BS-F003` — unsupported Node version
- `TSS-BS-F004` — pnpm missing from PATH
- `TSS-BS-F005` — dependency install failed and no usable `node_modules` state exists

### Error codes

- `TSS-BS-E101` — dependency install failed but process continued because an existing dependency state was present
- `TSS-BS-E102` — formatting check failed
- `TSS-BS-E103` — lint failed
- `TSS-BS-E104` — typecheck failed
- `TSS-BS-E105` — tests failed
- `TSS-BS-E106` — build failed
- `TSS-BS-E107` — a required script is missing
- `TSS-BS-E108` — artifact verification failed

### Warning and informational codes

- `TSS-BS-W201` — pnpm version differs from the repo pin
- `TSS-BS-W202` — optional validation checkpoint failed
- `TSS-BS-I301` — optional script not defined and was skipped

## Current checkpoint order

1. validate repo root
2. validate Node version
3. validate pnpm availability and version
4. install dependencies
5. check formatting
6. run lint
7. run typecheck
8. run tests
9. run build
10. validate content packs
11. validate policies
12. verify build artifacts

## Success rule

The Top Shelf success banner is displayed only when:

- no fatal checkpoints occurred
- no blocking error checkpoints occurred
- final artifact verification passed

Warnings and skips are allowed, but they are still reported in the summary.

## Reports

The bootstrap writes reports into:

.bootstrap/latest.json
.bootstrap/latest.txt

If the bootstrap crashes internally, it also writes:

.bootstrap/crash.txt

## Usage

Run from the repository root:

pnpm bootstrap

CI mode:

pnpm bootstrap:ci

Direct execution:

node scripts/bootstrap.mjs
