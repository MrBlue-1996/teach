/**
 * TopShelf API Server - Request ID Middleware Test Suite
 *
 * Tests for request ID generation and header propagation.
 */

import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { requestId } from './request-id.js';

describe('Request ID Middleware', () => {
  it('should generate a request ID when none is provided', async () => {
    const app = new Hono();
    app.use('*', requestId());
    app.get('/test', (c) => c.json({ requestId: c.get('requestId') }));

    const res = await app.request('/test');
    const body = await res.json();

    expect(res.headers.get('X-Request-ID')).toBeDefined();
    expect(body.requestId).toBeDefined();
    expect(typeof body.requestId).toBe('string');
    expect(body.requestId.length).toBeGreaterThan(0);
  });

  it('should use existing X-Request-ID header if provided', async () => {
    const app = new Hono();
    app.use('*', requestId());
    app.get('/test', (c) => c.json({ requestId: c.get('requestId') }));

    const res = await app.request('/test', {
      headers: { 'X-Request-ID': 'custom-id-123' },
    });
    const body = await res.json();

    expect(body.requestId).toBe('custom-id-123');
    expect(res.headers.get('X-Request-ID')).toBe('custom-id-123');
  });

  it('should generate unique IDs for different requests', async () => {
    const app = new Hono();
    app.use('*', requestId());
    app.get('/test', (c) => c.json({ requestId: c.get('requestId') }));

    const res1 = await app.request('/test');
    const res2 = await app.request('/test');

    const body1 = await res1.json();
    const body2 = await res2.json();

    expect(body1.requestId).not.toBe(body2.requestId);
  });
});
