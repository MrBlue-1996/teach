/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import Redis from 'ioredis';
import { getConfig } from '@topshelf/config';
import { getLogger } from '@topshelf/observability';

let client: Redis | null = null;

/**
 * Returns the singleton Redis client, creating it on first call.
 */
export function getRedisClient(): Redis {
  if (!client) {
    const { redis } = getConfig();
    const logger = getLogger();

    client = new Redis({
      host: redis.host,
      port: redis.port,
      db: redis.db,
      keyPrefix: redis.keyPrefix,
      ...(redis.password !== undefined && redis.password !== ''
        ? { password: redis.password }
        : {}),
      ...(redis.tls ? { tls: {} } : {}),
      // Don't retry forever — surface errors quickly so callers can fall back
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    client.on('error', (err: Error) => {
      logger.warn({ err }, 'Redis connection error');
    });
  }

  return client;
}

/**
 * Closes the Redis connection — call during graceful shutdown.
 */
export async function closeRedisClient(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
