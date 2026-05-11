/*
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 *
 * Minimal PWA service worker for v0.1.x.
 *
 * Scope:
 * - cache safe app-shell/static assets
 * - provide offline fallback for navigation
 * - avoid caching auth tokens, API responses, protected mutations, or tenant-private data
 */

const VERSION = 'pwa-shell-v1';
const APP_SHELL_CACHE = `topshelf-app-shell-${VERSION}`;
const STATIC_CACHE = `topshelf-static-${VERSION}`;

const PRECACHE_URLS = ['/', '/kitchen', '/offline', '/manifest.json'];

const ALLOWED_NAVIGATION_PREFIXES = ['/', '/kitchen', '/kitchen/', '/offline'];

const PRIVATE_OR_DYNAMIC_PREFIXES = [
  '/api/',
  '/auth/',
  '/dashboard',
  '/profile',
  '/settings',
  '/notifications',
  '/admin',
  '/manager',
  '/instructor',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith('topshelf-') && key !== APP_SHELL_CACHE && key !== STATIC_CACHE
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (isPrivateOrDynamic(url.pathname)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request, url));
    return;
  }

  if (isStaticAsset(request, url)) {
    event.respondWith(handleStaticAsset(request));
  }
});

function isPrivateOrDynamic(pathname) {
  return PRIVATE_OR_DYNAMIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  );
}

function isAllowedNavigation(pathname) {
  if (pathname === '/') {
    return true;
  }

  return ALLOWED_NAVIGATION_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  );
}

function isStaticAsset(request, url) {
  if (url.pathname.startsWith('/_next/static/')) {
    return true;
  }

  if (url.pathname.startsWith('/icons/')) {
    return true;
  }

  return ['image', 'font', 'style', 'script', 'worker'].includes(request.destination);
}

async function handleNavigation(request, url) {
  const cache = await caches.open(APP_SHELL_CACHE);

  try {
    const response = await fetch(request);

    if (response.ok && isAllowedNavigation(url.pathname)) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    const offline = await cache.match('/offline');

    if (offline) {
      return offline;
    }

    return new Response('Offline', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }
}

async function handleStaticAsset(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  const cache = await caches.open(STATIC_CACHE);
  const response = await fetch(request);

  if (response.ok) {
    await cache.put(request, response.clone());
  }

  return response;
}
