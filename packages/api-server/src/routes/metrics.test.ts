/**
 * TopShelf API Server - Metrics Route Test Suite
 *
 * Tests for GET /metrics: returns 200 with Prometheus text format.
 * Uses Hono's app.request() for HTTP-level testing without a running server.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createMetricsRoutes } from './metrics.js';
import { errorHandler } from '../middleware/error-handler.js';

// =============================================================================
// MOCKS
// =============================================================================

vi.mock('@topshelf/observability', () => ({
  metrics: {
    export: vi.fn(
      () =>
        '# HELP topshelf_http_requests_total Total HTTP requests\n' +
        '# TYPE topshelf_http_requests_total counter\n'
    ),
  },
}));

vi.mock('@topshelf/config', () => ({
  getConfig: (): Record<string, unknown> => ({
    environment: 'test',
  }),
}));

// =============================================================================
// TESTS
// =============================================================================

describe('Metrics Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.onError(errorHandler);
    app.route('/metrics', createMetricsRoutes());
  });

  // ---------------------------------------------------------------------------
  // GET /metrics
  // ---------------------------------------------------------------------------

  describe('GET /metrics', () => {
    it('should return 200', async () => {
      const res = await app.request('/metrics');
      expect(res.status).toBe(200);
    });

    it('should return Prometheus text content-type', async () => {
      const res = await app.request('/metrics');
      const contentType = res.headers.get('content-type') ?? '';
      expect(contentType).toContain('text/plain');
      expect(contentType).toContain('version=0.0.4');
    });

    it('should return metrics body with HELP and TYPE lines', async () => {
      const res = await app.request('/metrics');
      const body = await res.text();
      expect(body).toContain('# HELP');
      expect(body).toContain('# TYPE');
    });

    it('should not require authentication', async () => {
      // No auth middleware applied — request should succeed without a token
      const res = await app.request('/metrics');
      expect(res.status).toBe(200);
    });
  });
});
