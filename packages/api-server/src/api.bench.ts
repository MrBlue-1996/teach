/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * API server route benchmarks.
 *
 * Purpose: measure HTTP stack overhead through Hono's in-process
 * app.request() to catch middleware regressions before they hit prod.
 *
 * Scope: pure in-process, no network, no real DB/Redis — all external
 * dependencies are mocked at the module level (same as test files).
 *
 * Run:  pnpm --filter @topshelf/api-server bench
 * CI:   pnpm --filter @topshelf/api-server bench --reporter=json
 */

import { bench, describe, vi } from 'vitest';
import { Hono } from 'hono';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';

// ---------------------------------------------------------------------------
// Module-level mocks — must be declared before any import that triggers them
// ---------------------------------------------------------------------------

vi.mock('@topshelf/observability', () => ({
  getLogger: (): Record<string, ReturnType<typeof vi.fn>> => ({
    info: vi.fn<() => void>(),
    warn: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
    debug: vi.fn<() => void>(),
  }),
  metrics: {
    export: vi.fn<() => string>(
      () => '# HELP topshelf_requests_total\n# TYPE topshelf_requests_total counter\n'
    ),
    increment: vi.fn<() => void>(),
    timing: vi.fn<() => void>(),
  },
}));

vi.mock('@topshelf/config', () => ({
  getConfig: (): Record<string, unknown> => ({
    environment: 'test',
    redis: { host: 'localhost', port: 6379 },
    auth: { jwtSecret: 'bench-secret', sessionSecret: 'bench-session' },
  }),
}));

vi.mock('../lib/redis-client.js', () => {
  const store = new Map<string, string>();
  const mockRedis = {
    incr: (key: string): string => {
      const v = parseInt(store.get(key) ?? '0') + 1;
      store.set(key, String(v));
      return String(v);
    },
    pexpire: vi.fn<() => void>(),
    pttl: (key: string): string => (store.has(key) ? '59000' : '-1'),
  };
  return {
    getRedisClient: (): typeof mockRedis => mockRedis,
    closeRedisClient: vi.fn<() => Promise<void>>(),
  };
});

// ---------------------------------------------------------------------------
// Lazy imports (after mocks are set up)
// ---------------------------------------------------------------------------

import { createMetricsRoutes } from './routes/metrics.js';
import { rateLimiter } from './middleware/rate-limiter.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildApp(): Hono {
  const app = new Hono();
  app.use('*', requestId());
  app.use('*', secureHeaders());
  return app;
}

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

describe('Middleware stack overhead', () => {
  // Baseline: minimal app — just Hono's built-in router, no middleware
  const bareApp = new Hono();
  bareApp.get('/ping', (c) => c.text('ok'));

  bench('bare Hono route — zero middleware', async () => {
    await bareApp.request('/ping');
  });

  // requestId + secureHeaders (always-on production middleware)
  const headersApp = buildApp();
  headersApp.get('/ping', (c) => c.text('ok'));

  bench('requestId + secureHeaders middleware', async () => {
    await headersApp.request('/ping');
  });

  // Rate limiter (Redis-backed, mocked client)
  const rateLimitApp = buildApp();
  rateLimitApp.use('*', rateLimiter(100, 60_000));
  rateLimitApp.get('/ping', (c) => c.text('ok'));

  bench('rateLimiter middleware (mocked Redis)', async () => {
    await rateLimitApp.request('/ping');
  });
});

describe('GET /metrics — Prometheus export', () => {
  const metricsApp = new Hono();
  metricsApp.route('/metrics', createMetricsRoutes());

  bench('GET /metrics (no auth, text export)', async () => {
    await metricsApp.request('/metrics');
  });
});

describe('JSON response serialisation', () => {
  // Measure the cost of c.json() at different payload sizes — a common
  // pattern in every route handler.
  const jsonApp = new Hono();

  const smallPayload = { status: 'ok', ts: 1714000000 };
  const mediumPayload = {
    sessions: Array.from({ length: 20 }, (_, i) => ({
      id: `session-${i}`,
      userId: `user-${i}`,
      status: 'active',
      startedAt: new Date().toISOString(),
    })),
  };
  const largePayload = {
    events: Array.from({ length: 200 }, (_, i) => ({
      id: `event-${i}`,
      type: 'progress',
      data: { blockId: `block-${i}`, score: Math.random(), elapsed: i * 1000 },
    })),
  };

  jsonApp.get('/small', (c) => c.json(smallPayload));
  jsonApp.get('/medium', (c) => c.json(mediumPayload));
  jsonApp.get('/large', (c) => c.json(largePayload));

  bench('c.json() — small payload (2 fields)', async () => {
    await jsonApp.request('/small');
  });

  bench('c.json() — medium payload (20-item array)', async () => {
    await jsonApp.request('/medium');
  });

  bench('c.json() — large payload (200-item array)', async () => {
    await jsonApp.request('/large');
  });
});
