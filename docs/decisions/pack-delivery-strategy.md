# Pack Delivery Strategy Decision

## Status

Accepted for v0.1.x.

## Decision

Use static bundled pack delivery for v0.1.x.

Do not build dynamic remote pack delivery yet.

## Why

The current kitchen challenge packs are statically registered in the web app. That is acceptable for the current phase because the product needs a reliable demo path more than runtime content distribution.

Dynamic delivery introduces versioning, signing, cache invalidation, tenant assignment, offline storage, and rollback complexity. Those concerns matter later, but not before the PWA walking skeleton.

## Current Model

Kitchen ChallengeConfig packs are bundled into the app by static imports.

Teaching ContentPackManifest packs are separate from kitchen challenge packs.

Important distinction:

ContentPackManifest = teaching content pack format
ChallengeConfig = kitchen challenge format

Do not mix these formats.

## v0.1.x Rules

1. Kitchen challenge packs remain static imports.
2. Adding a kitchen pack requires code change and redeploy.
3. Pack validation must run before merge.
4. Pack IDs and slugs must remain stable.
5. The UJ demo path prioritizes reliability over runtime configurability.

## Future Dynamic Delivery

Dynamic delivery is deferred until:

1. PWA installability works.
2. Auth/data model is proven.
3. Tenant isolation is tested.
4. Pack signing and versioning are documented.
5. Offline cache strategy is defined.
6. Admin or authoring workflow exists.

## Validation Commands

Before a pack change merges, run:

pnpm run validate:content-packs
pnpm run package:uncle-julios
pnpm validate
pnpm run test:e2e

## Constraints

- Do not add remote pack loading during P1.1.
- Do not mix teaching and kitchen schemas.
- Do not allow unvalidated JSON into runtime.
- Do not let pack slugs drift from UI links.
- Do not build an admin authoring surface until the static demo path is stable.

## Follow-up Tasks

1. Add registry consistency tests if missing.
2. Ensure every displayed kitchen card maps to a real pack.
3. Document how to add a kitchen pack.
4. Document how to add a teaching pack.
5. Add pack version field checks if not already enforced.

## Acceptance Criteria

- Static bundle strategy is documented.
- Dynamic delivery is explicitly deferred.
- Teaching and kitchen formats are clearly separated.
- Validation commands are documented.

## Success Benchmarks

- New developer can explain the pack model in under 3 minutes.
- Pack changes fail fast in validation.
- Kitchen demo does not depend on network-loaded content.
- PWA work is not blocked by pack delivery complexity.

## Definition of Done

This decision is done when merged to main. P1.1 may proceed using static bundled packs.
