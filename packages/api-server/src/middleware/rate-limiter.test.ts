/**
 * TopShelf API Server - Rate Limiter Middleware Test Suite
 *
 * Tests for rate limiting behavior including headers, limit enforcement,
 * and health check bypass.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { rateLimiter } from './rate-limiter.js';

// ---------------------------------------------------------------------------
// Redis mock — in-memory store that resets between tests via beforeEach
// ---------------------------------------------------------------------------

const mockStore = new Map<string, { value: number; expiresAt: number }>();

vi.mock('../lib/redis-client.js', () => {
  const mockRedis = {
    incr: vi.fn((key: string) => {
      const now = Date.now();
      const entry = mockStore.get(key);
      if (!entry || entry.expiresAt < now) {
        mockStore.set(key, { value: 1, expiresAt: now + 60_000 });
        return 1;
      }
      entry.value++;
      return entry.value;
    }),
    pexpire: vi.fn((key: string, ms: number) => {
      const entry = mockStore.get(key);
      if (entry) {
        entry.expiresAt = Date.now() + ms;
      }
      return 1;
    }),
    pttl: vi.fn((key: string) => {
      const entry = mockStore.get(key);
      if (!entry) return -2;
      return Math.max(0, entry.expiresAt - Date.now());
    }),
  };

  return {
    getRedisClient: (): typeof mockRedis => mockRedis,
    closeRedisClient: vi.fn<() => Promise<void>>(),
  };
});

describe('Rate Limiter Middleware', () => {
  let app: Hono;

  beforeEach((): void => {
    mockStore.clear();
    app = new Hono();
  });

  it('should set rate limit headers on responses', async () => {
    app.use('*', rateLimiter(100, 60000));
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test');

    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('100');
    expect(res.headers.get('X-RateLimit-Remaining')).toBeDefined();
    expect(res.headers.get('X-RateLimit-Reset')).toBeDefined();
  });

  it('should decrement remaining count on each request', async () => {
    app.use('*', rateLimiter(5, 60000));
    app.get('/test', (c) => c.json({ ok: true }));

    const res1 = await app.request('/test');
    const remaining1 = parseInt(res1.headers.get('X-RateLimit-Remaining') ?? '0');

    const res2 = await app.request('/test');
    const remaining2 = parseInt(res2.headers.get('X-RateLimit-Remaining') ?? '0');

    expect(remaining2).toBeLessThan(remaining1);
  });

  it('should return 429 when rate limit is exceeded', async () => {
    app.use('*', rateLimiter(2, 60000));
    app.get('/test', (c) => c.json({ ok: true }));

    // First two requests should succeed
    await app.request('/test');
    await app.request('/test');

    // Third request should be rate limited
    const res = await app.request('/test');
    expect(res.status).toBe(429);

    const body = await res.json();
    expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(body.retryAfter).toBeDefined();
    expect(res.headers.get('Retry-After')).toBeDefined();
  });

  it('should bypass rate limiting for health check endpoint', async () => {
    app.use('*', rateLimiter(1, 60000));
    app.get('/health', (c) => c.json({ status: 'healthy' }));

    // Should not be rate limited even after limit is exceeded
    const res1 = await app.request('/health');
    const res2 = await app.request('/health');
    const res3 = await app.request('/health');

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res3.status).toBe(200);
  });

  it('should bypass rate limiting for readiness endpoint', async () => {
    app.use('*', rateLimiter(1, 60000));
    app.get('/ready', (c) => c.json({ ready: true }));

    const res1 = await app.request('/ready');
    const res2 = await app.request('/ready');

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
  });

  it('should show 0 remaining when at limit', async () => {
    app.use('*', rateLimiter(2, 60000));
    app.get('/test', (c) => c.json({ ok: true }));

    await app.request('/test');
    const res = await app.request('/test');

    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
  });
});
