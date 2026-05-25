# Agent Queue

Shared queue for `.github/agents/*` multi-agent work. The coordinator owns ordering; specialist agents append board updates when tasks complete.

Last updated: 2026-05-25

## Active Batch

No formal coordinator-owned batch is active.

Current ad hoc batch:

- [x] Audit both agent systems: `.agents/skills/**` and `.github/agents/**`.
- [x] Record progress and gaps in `.agents/progress.md`.
- [x] Restore blackboard support files expected by `agent-comms.instructions.md`.
- [~] Close low-conflict protocol/code gaps from `.agents/progress.md`.

## Ready Next

- [ ] Add route/UI tests for retention queue and dashboard review card.
- [ ] Add CLI tests for `synth-stimulus` dry-run/write/backfill behavior.
- [ ] Run production PWA audit and record real-device results.
- [ ] Decide whether local `.agents/skills/**` should be represented in `skills-lock.json`.

## Blocked

- [ ] UJ v0.1.2 content merge: blocked on authorized/local source artifact or branch.
- [ ] External UJ/Sun pilot work: blocked on authorization and consent gates.
