/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { Hono } from 'hono';
import { metrics } from '@topshelf/observability';

// Prometheus exposition format content-type
const PROMETHEUS_CONTENT_TYPE = 'text/plain; version=0.0.4; charset=utf-8';

// =============================================================================
// ROUTES
// =============================================================================

export function createMetricsRoutes(): Hono {
  const router = new Hono();

  // ---------------------------------------------------------------------------
  // GET /metrics - Prometheus-format metrics exposition
  // ---------------------------------------------------------------------------
  router.get('/', (c): Response => {
    const body = metrics.export();
    return c.text(body, 200, { 'Content-Type': PROMETHEUS_CONTENT_TYPE });
  });

  return router;
}
