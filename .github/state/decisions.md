# Decisions Log

Record architectural decisions and cross-agent agreements here so all agents stay aligned.

<!-- Format:
## Decision: <title>
**Date**: <date>
**By**: <agent or user>
**Decision**: <what was decided>
**Reason**: <why>
**Affects**: <which agents/packages>
-->

## Decision: Mode taxonomy kept dual

**Date**: 2026-04-13
**By**: user + engine-engineer
**Decision**: DB `learningModeEnum` (L1_RECALL..L5_EXPERT) tracks learner competency. Engine `TeachingMode` (L0_SILENT..L4_TUTORIAL) tracks intervention depth. Both are kept.
**Reason**: Orthogonal concerns — learner ability vs teaching behavior.
**Affects**: db-engineer, api-engineer, engine-engineer, frontend-engineer

## Decision: Canonical app is web UI

**Date**: 2026-04-13
**By**: user
**Decision**: The web UI is the canonical application surface for behavior, UX, and integration expectations.
**Reason**: Other agents and implementations need a single source of truth for product behavior, so the web app should be treated as the reference point for alignment.
**Affects**: all agents
