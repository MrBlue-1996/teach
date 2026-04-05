/**
 * TopShelf Service LLC - Request ID Middleware
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { createMiddleware } from 'hono/factory';
import { randomUUID } from 'crypto';

/**
 * Adds a unique request ID to each request for tracing
 */
export function requestId() {
  return createMiddleware(async (c, next) => {
    const existingId = c.req.header('X-Request-ID');
    const requestId = existingId || randomUUID();

    c.set('requestId', requestId);
    c.header('X-Request-ID', requestId);

    await next();
  });
}
