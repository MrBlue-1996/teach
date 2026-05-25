---
name: pwa-validation
description: Validates the Top Shelf Teaching web app as an installable, offline-tolerant PWA on real and emulated mobile devices. Use when verifying manifest correctness, service worker behavior, app-shell caching, offline fallback, or running Lighthouse mobile audits for PWA installability. Triggers on requests like "check PWA installable", "Lighthouse mobile audit", "service worker not registering", "offline page broken", "manifest validation", "P1.1 phone test", "P5.4 Lighthouse CI". Do NOT use for general UI bug hunting unrelated to install/offline behavior.
metadata:
  author: topshelf
  version: '0.1.0'
---

# PWA Validation

This skill covers the verification side of the PWA story. Authoring lives in `top-shelf-ui` and the service worker file itself; this skill is what you run before declaring a PWA-touching task done.

## Scope and non-scope

In scope:

- `apps/web/public/manifest.json`
- `apps/web/public/sw.js`
- `apps/web/public/icons/**`
- `apps/web/src/app/layout.tsx` (manifest link, theme color, viewport meta)
- `apps/web/src/app/offline/page.tsx`
- Lighthouse mobile audits, install-banner checks, axe-core PWA-adjacent checks

Out of scope:

- General page UI authoring (`top-shelf-ui`)
- API caching strategies that are not part of the SW (`api-engineer`)
- Background sync / push notifications (deferred per `decisions.md`: "Full offline writes/sync are deferred")

## Decision reminders from `decisions.md`

- P1.1 PWA scope is: installability, app shell caching, icons, manifest, safe offline fallback. **Full offline writes and sync are deferred.**
- Pack delivery remains static bundle in v0.1.x. Do not introduce dynamic pack caching strategies in the SW.

## Manifest checklist

Open `apps/web/public/manifest.json` and verify:

- [ ] `name`, `short_name`, `description` present and on-brand.
- [ ] `start_url` set to a route that is reachable when launched from the home screen (currently `/kitchen`).
- [ ] `scope` set to `/`.
- [ ] `display: "standalone"` with `display_override` providing a fallback chain.
- [ ] `background_color` and `theme_color` match `#050507` (TS Black).
- [ ] Four icon entries: 192 and 512 in both `any` and `maskable` purposes.
- [ ] Every referenced icon file actually exists under `apps/web/public/icons/`.
- [ ] `categories` is plausible (`education`, `productivity`, `business`).
- [ ] No trailing-comma JSON errors — `JSON.parse` succeeds.

Validation:

```bash
node -e "JSON.parse(require('fs').readFileSync('apps/web/public/manifest.json','utf8'))"
```

## Service worker checklist

`apps/web/public/sw.js` is the source. Confirm:

- [ ] Versioned cache name (e.g. `topshelf-shell-vN`) — bump on every shell change.
- [ ] `install` precaches the app shell: at minimum `/`, `/offline`, and any icon assets needed for the install banner.
- [ ] `activate` cleans up old versioned caches.
- [ ] `fetch` handler:
  - [ ] Bypasses non-GET requests.
  - [ ] Bypasses API requests (`/api/**`).
  - [ ] **Does not cache responses for authenticated or per-user routes** (the `(app)` group). Caching private content is an isolation bug, not a perf win.
  - [ ] Falls through to `/offline` for navigation requests that fail.
- [ ] No `self.skipWaiting()` in `activate` without an explicit reason recorded.

## Layout / head checklist

`apps/web/src/app/layout.tsx`:

- [ ] `<link rel="manifest" href="/manifest.json" />`.
- [ ] `<meta name="theme-color" content="#050507" />`.
- [ ] Viewport meta `width=device-width, initial-scale=1`. No `user-scalable=no`.
- [ ] SW registration runs client-side, after hydration, gated by `'serviceWorker' in navigator`.

## Offline fallback

`apps/web/src/app/offline/page.tsx`:

- [ ] Renders without network (no client fetches, no `useEffect` data calls).
- [ ] Uses only inline content and assets that the SW precached.
- [ ] Voice rules: short, calm, factual. Provide one clear next step.

## Lighthouse mobile audit

Run on a production build, not dev:

```bash
pnpm --filter @topshelf/web build
pnpm --filter @topshelf/web start &
npx lighthouse http://localhost:3001 \
  --form-factor=mobile \
  --preset=desktop=false \
  --only-categories=performance,accessibility,best-practices,pwa \
  --chrome-flags="--headless"
```

Targets:

- PWA: **installable** (no failures in the installable group).
- Performance: ≥ 90.
- Accessibility: 100.
- Best Practices: 100.

If the run flags a missing icon size, a non-HTTPS service-worker scope error, or a `start_url` that returns non-200, fix before declaring done.

## Real-phone install check

For `P1.1.1` and `P1.1.2` gates, the marker of done is the real device:

1. Deploy to a reachable URL (or use `ngrok` against the prod build).
2. Open in Chrome on Android or Safari on iOS.
3. Confirm the install affordance appears (banner / "Add to Home Screen").
4. Install. Launch from the home icon.
5. Confirm the app opens in standalone (no browser chrome).
6. Toggle airplane mode. Reload. Confirm the offline page renders and previously cached shell does not blank-screen.

Capture: screenshot + the URL + the device model. Append to the board entry.

## Workflow

1. Read this skill plus `decisions.md`.
2. Run the manifest, SW, and layout checklists statically.
3. Build production and run Lighthouse mobile.
4. Run the real-phone install check on at least one Android device.
5. Append a board update with Lighthouse score table, manifest delta if any, and the device used.

## Guardrails

- Never cache authenticated routes or API responses in the SW.
- Never `skipWaiting` without an upgrade story for in-flight users.
- Never ship a manifest that references icons that do not exist on disk.
- Never declare PWA done from emulator alone — real device is the gate.
