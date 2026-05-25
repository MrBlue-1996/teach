# Agent Decisions

Blackboard-local index of architecture and operating decisions. Canonical long-form decisions live in `docs/decisions/**`; this file exists so `.github/instructions/agent-comms.instructions.md` has the expected state surface.

Last updated: 2026-05-25

## Accepted

- **P0.2 baseline decisions exist**: feature work can proceed against the recorded hosting, auth/data, PWA, and pack-delivery decisions.
- **Hosting**: Vercel first for `apps/web`; API, database, and Redis remain separate services. See `docs/decisions/hosting-decision.md`.
- **Auth/data**: custom JWT plus Drizzle/Postgres plus existing Supabase browser client. Tenant isolation remains a hard gate. See `docs/decisions/auth-data-decision.md`.
- **PWA scope**: minimal installable app shell and safe offline fallback only; no offline writes or private API caching. See `docs/decisions/pwa-strategy.md`.
- **Pack delivery**: kitchen packs stay static-bundled for v0.1.x. Dynamic registry is deferred. See `docs/decisions/pack-delivery-strategy.md`.
- **UJ/Sun authorization**: pending. Do not use real cooks/managers, live store data, proprietary source material, or public approval claims until approval or alternate scope is recorded. See `docs/decisions/sun-holdings-auth-decision.md`.

## Needs Decision

- Whether local `.agents/skills/**` should be locked in `skills-lock.json`.
- Whether retention history JSON is sufficient for v0.1.x or a dedicated indexed `retention_records` table is required.
- Whether missing-stimulus heuristic findings should be warnings or errors across all validator paths.
- Whether archived UJ v0.1 authoring protocols should be restored into the current content-pack authoring skill.
