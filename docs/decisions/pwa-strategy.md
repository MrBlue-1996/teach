# PWA Strategy Decision

## Status

Accepted for P1.1.

## Decision

Implement a minimal, controlled PWA layer first:

- web manifest
- app icons
- offline fallback page
- conservative app-shell caching
- service worker registration guarded for production use

Do not build full offline sync in P1.1.

## Why

The training product must work well on phones, tablets, and Chromebook-style devices. The current repo baseline states that PWA support is not implemented yet.

The next product layer should make the app installable and safe under basic offline conditions. It should not attempt full offline data sync before the auth/data model and tenant isolation are proven.

## P1.1 Scope

Add or verify:

- apps/web/public/manifest.json
- apps/web/public/icons
- apps/web/src/app/offline/page.tsx
- service worker registration
- basic app-shell caching
- offline fallback behavior

## Cache Policy

Allowed in P1.1:

- static app shell
- manifest
- icons
- offline page
- safe static assets

Do not cache by default in P1.1:

- auth tokens
- protected API responses
- learner progress mutations
- manager sign-off actions
- tenant-private data

## Offline Behavior

If the user is offline, the app should load a safe shell or offline page. The UI must not imply that progress was saved when it was not.

Offline writes and conflict resolution are deferred until a separate offline-sync decision exists.

## Real-Device Requirement

PWA work is not complete until tested on a real phone or Chromebook-style device.

Minimum test:

1. Open app URL.
2. Install app.
3. Launch from icon.
4. Open /kitchen.
5. Start a kitchen challenge.
6. Simulate offline.
7. Confirm safe offline behavior.
8. Return online.
9. Confirm app still works.

## Constraints

- Do not cache secrets.
- Do not cache private API data by default.
- Do not implement offline writes yet.
- Do not allow the service worker to hide fresh local development changes.

## Acceptance Criteria

- App has a valid manifest.
- App has icons.
- App has offline fallback.
- App can be installed on supported devices.
- Kitchen E2E remains green.
- pnpm validate passes.
- pnpm run test:e2e passes.
- pnpm --filter @topshelf/web run build passes.

## Success Benchmarks

- Lighthouse installability passes or blockers are documented.
- Installed app opens from home screen.
- Offline behavior is clear and safe.
- Kitchen golden path remains green.

## Definition of Done

This decision is done when merged to main. P1.1 PWA implementation may start after all P0.2 decisions are merged.
