# UJ Pack Production Tracker

Single-file Node CLI for tracking the UJ Pack production roadmap. Reads
`tasks.yaml`, runs automated gate checks where possible, prints a
human-readable dashboard or markdown for PR descriptions.

## Why this exists

The roadmap has 61 tasks across 6 phases plus cross-cutting work. Without
a central status surface, you'll lose track. With one, you stay honest
about what's done vs. what you've told yourself is done.

## Install

Drop this folder into the `peteywee/teach` repo at `tools/uj-tracker/`,
or anywhere you like. Zero dependencies — uses only Node built-ins
(`node:fs`, `node:child_process`, etc.). Requires Node 20+.

Optionally add a script to your repo root `package.json`:

```json
{
  "scripts": {
    "track": "node tools/uj-tracker/bin/uj-tracker.mjs",
    "track:status": "node tools/uj-tracker/bin/uj-tracker.mjs status",
    "track:next": "node tools/uj-tracker/bin/uj-tracker.mjs next",
    "track:check": "node tools/uj-tracker/bin/uj-tracker.mjs check"
  }
}
```

Then `pnpm track:status` etc.

## Daily flow

When you sit down to work:

```
pnpm track:next              # what should I be doing right now
pnpm track set P0.1.1 in-progress
# ... do the work ...
pnpm track set P0.1.1 review
# ... real-device test, PR review ...
pnpm track set P0.1.1 done
```

Friday or end of weekend:

```
pnpm track:status --md > .batch-ledger/week-N-status.md
git add .batch-ledger && git commit -m "weekly: status snapshot"
```

Once a project start date is committed in `tasks.yaml`:

```
pnpm track sanity            # are we still on the bet?
```

## Commands

### `status [--md]`

Print full dashboard. Plain text by default, `--md` for markdown
suitable for pasting into a PR description, README, or Slack.

```
pnpm track:status
pnpm track:status --md > /tmp/snapshot.md
```

### `check [filter]`

Run automated gate checks. Each task has zero or more gates of type
`manual`, `file_exists`, `git_branch`, `github_pr`, or `command`. The
checker runs the non-manual ones and reports pass/fail.

```
pnpm track:check                # everything
pnpm track:check P0             # phase 0 only
pnpm track:check X1             # one cross-cutting task
```

Exit code is 1 if any gate failed, 0 otherwise. Wire it into CI later
to enforce that gates stay green once met.

### `set <id> <status>`

Mark a task. Six valid statuses:

- `pending` — not started (default)
- `in-progress` — agent assigned, work begun
- `blocked` — waiting on something (set `blocked_on` in YAML manually)
- `review` — work done, waiting on your test/review
- `done` — gates met, you've signed off
- `deferred` — explicitly punted to v0.2 or later

```
pnpm track set P0.1.1 in-progress
pnpm track set P0.1.1 done
pnpm track set P3.3.3 deferred
```

The `set` command edits `tasks.yaml` in place, preserving comments and
formatting (only the affected `status:` line changes).

### `next`

Show what to work on right now. Lists cross-cutting open items, then
descends into the first phase whose dependencies are met and shows
batches with their open tasks. Stops at the first open phase so you
don't drown in tasks from phases you can't start yet.

```
pnpm track:next
```

### `sanity`

Check the week-4 sanity gate. Reads `sanity_gate.start_date` from
`tasks.yaml` (set this when you commit to the bet). If `weeks elapsed

> = 4` and Phase 0 + Phase 1 are not both done, the tracker flags it
> loudly and reminds you of the three escape routes (cut scope, hire help,
> pause).

```
pnpm track:sanity
```

Intended to run weekly. If your `tasks.yaml` doesn't have a start date,
this is a no-op message.

## Editing tasks.yaml directly

You can edit by hand. The file is the source of truth. Common edits:

- **Set a start date for the sanity gate:**
  ```yaml
  sanity_gate:
    start_date: 2026-05-15
  ```
- **Mark a task blocked with reason:**
  ```yaml
  - id: P1.2.1
    status: blocked
    blocked_on: 'Firebase project not yet created'
  ```
- **Add a new task:** copy an existing task block, give it a new id,
  set status `pending`. Re-run `pnpm track:status` to see it.
- **Add a new check type:** edit `bin/uj-tracker.mjs`, add a case to
  `runGate()`. Stay thin — manual is fine for most things.

## What this is not

- Not a Jira replacement. Single-user, single-file. Good for solo
  founders, bad for teams >2.
- Not a real Gantt chart. Phases sequence, batches parallelize, but
  there are no Gantt bars or critical-path math. The ordering is
  baked into the YAML.
- Not a real CI gate. Use `check` in your CI if you want, but be aware
  it depends on your local repo state being a real checkout of the
  app you're tracking. Don't run it from a stale fork.

## Status icons

```
●  done
◔  review (work done, waiting on your test)
◐  in-progress
◯  pending
⊘  blocked
·  deferred
```

## File layout

```
uj-tracker/
├── README.md             ← you are here
├── tasks.yaml            ← source of truth
└── bin/
    └── uj-tracker.mjs    ← single Node CLI
```

That's it. Two files, one script, zero dependencies. Runs on any Node
20+ system.
