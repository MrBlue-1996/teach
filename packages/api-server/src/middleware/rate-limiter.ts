/**
 * TopShelf Service LLC - Rate Limiter Middleware
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { createMiddleware } from 'hono/factory';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

/**
 * Rate limiting middleware
 */
export function rateLimiter(maxRequests: number, windowMs: number) {
  return createMiddleware(async (c, next) => {
    // Skip rate limiting for health checks
    if (c.req.path === '/health' || c.req.path === '/ready') {
      return next();
    }

    // Get client identifier (prefer user ID if authenticated, fallback to IP)
    const userId = c.get('userId');
    const ip =
      c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
      c.req.header('X-Real-IP') ||
      'unknown';

    const identifier = userId || `ip:${ip}`;
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(identifier);

    if (!entry || entry.resetAt < now) {
      entry = {
        count: 0,
        resetAt: now + windowMs,
      };
    }

    entry.count++;
    rateLimitStore.set(identifier, entry);

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);

    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', resetSeconds.toString());

    // Check if rate limited
    if (entry.count > maxRequests) {
      c.header('Retry-After', resetSeconds.toString());

      return c.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: resetSeconds,
        },
        429
      );
    }

    await next();
  });
}
