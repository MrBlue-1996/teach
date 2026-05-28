# Agent Queue

Shared queue for `.github/agents/*` multi-agent work. The coordinator owns ordering; specialist agents append board updates when tasks complete.

Last updated: 2026-05-26

## Active Batch

Internal demo readiness is active.

- [x] Dashboard retention UX: extracted `ReviewNowCard`, added render coverage, added `learnerApi.getRetentionQueue()` client test.
- [x] Worked-example start mode: session start now uses `PedagogyEngine.createContext` seed precedence and API tests cover novice L4 plus fade behavior.
- [x] PWA/mobile evidence: production build/start, Lighthouse mobile audit, service-worker cache smoke, viewport smoke, and phone e2e recorded.
- [x] Stimulus/content contract cleanup: skill docs reflect eight stimulus kinds and recursive backfill behavior; missing-stimulus policy implemented as internal warnings/release errors.
- [x] Final quality gate: targeted package checks, workflow lint, `git diff --check`, and `pnpm validate` passed; commit remains in progress.

## Ready Next

- [ ] Complete real-device PWA install/offline validation when a deployed HTTPS URL or tunnel exists.
- [ ] Decide whether JSON retention history is sufficient for v0.1.x or migrate to an indexed `retention_records` table.
- [ ] Route dashboard review CTA directly to `dueTaskIds[0]` after task-to-pack routing exists.
- [ ] Add centralized mode-aware teaching panel for L0-L4 surfaces.
- [ ] Decide whether local `.agents/skills/**` should be represented in `skills-lock.json`.

## Blocked

- [ ] Real-device PWA install prompt validation: blocked on deployed HTTPS URL or tunnel.
- [ ] UJ v0.1.2 content merge: blocked on authorized/local source artifact or branch.
- [ ] External UJ/Sun pilot work: blocked on authorization and consent gates.
