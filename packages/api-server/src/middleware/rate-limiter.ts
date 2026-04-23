/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { createMiddleware } from 'hono/factory';
import { getLogger } from '@topshelf/observability';
import { getRedisClient } from '../lib/redis-client.js';

/**
 * Rate limiting middleware backed by Redis INCR + PEXPIRE.
 *
 * Falls back to allowing the request through if Redis is unavailable.
 */
export function rateLimiter(
  maxRequests: number,
  windowMs: number
): ReturnType<typeof createMiddleware> {
  return createMiddleware(async (c, next) => {
    // Skip rate limiting for health checks
    if (c.req.path === '/health' || c.req.path === '/ready') {
      return next();
    }

    // Get client identifier (prefer user ID if authenticated, fallback to IP)
    const userId = c.get('userId');
    const forwarded = c.req.header('X-Forwarded-For')?.split(',')[0]?.trim();
    const realIp = c.req.header('X-Real-IP');
    const ip = forwarded ?? realIp ?? 'unknown';

    const identifier = ((userId as string | undefined) ?? '') !== '' ? userId : `ip:${ip}`;
    const key = `ratelimit:${identifier}`;

    let count = 0;
    let ttlMs = windowMs;

    try {
      const redis = getRedisClient();
      count = await redis.incr(key);

      if (count === 1) {
        // First request in window — set expiry
        await redis.pexpire(key, windowMs);
        ttlMs = windowMs;
      } else {
        const remaining = await redis.pttl(key);
        ttlMs = remaining > 0 ? remaining : windowMs;
      }
    } catch (err) {
      // Redis unavailable — fail open (allow request) and log warning
      getLogger().warn({ err }, 'Redis unavailable for rate limiting; allowing request through');
      return next();
    }

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - count);
    const resetSeconds = Math.ceil(ttlMs / 1000);

    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', resetSeconds.toString());

    // Check if rate limited
    if (count > maxRequests) {
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
