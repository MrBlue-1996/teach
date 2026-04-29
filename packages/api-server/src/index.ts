/**
 * TopShelf Service LLC - API Server
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';
import { compress } from 'hono/compress';

import { loadConfig, getConfig } from '@topshelf/config';
import { connectDatabase, disconnectDatabase, checkDatabaseHealth } from '@topshelf/database';
import { getLogger } from '@topshelf/observability';
import { closeRedisClient } from './lib/redis-client.js';

// Import routes
import { createAuthRoutes } from './routes/auth.js';
import { createLearnerRoutes } from './routes/learner.js';
import { createContentRoutes } from './routes/content.js';
import { createSessionRoutes } from './routes/session.js';
import { createPolicyRoutes } from './routes/policy.js';
import { createBadgeRoutes } from './routes/badge.js';
import { createAdminRoutes } from './routes/admin.js';
import { createBillingRoutes } from './routes/billing.js';
import { createMetricsRoutes } from './routes/metrics.js';
import { createInstructorRoutes } from './routes/instructor.js';

// Import middleware
import { rateLimiter } from './middleware/rate-limiter.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestId } from './middleware/request-id.js';
import { authMiddleware } from './middleware/auth.js';

// =============================================================================
// APPLICATION FACTORY
// =============================================================================

export function createApp(): Hono {
  const config = getConfig();
  const app = new Hono();

  // ==========================================================================
  // GLOBAL MIDDLEWARE
  // ==========================================================================

  // Request ID for tracing
  app.use('*', requestId());

  // Security headers
  app.use('*', secureHeaders());

  // Response compression
  app.use('*', compress());

  // Request timing
  app.use('*', timing());

  // CORS
  if (config.api.corsEnabled) {
    app.use(
      '*',
      cors({
        origin: config.auth.allowedOrigins,
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
        exposeHeaders: ['X-Request-ID', 'X-Response-Time'],
        maxAge: 86400,
        credentials: true,
      })
    );
  }

  // Request logging (in development)
  if (config.environment !== 'production') {
    app.use('*', logger());
  }

  // Rate limiting
  if (config.environment !== 'development') {
    app.use('*', rateLimiter(config.api.rateLimitMax, config.api.rateLimitWindowMs));
  }

  // Global error handler
  app.onError(errorHandler);

  // ==========================================================================
  // HEALTH ENDPOINTS
  // ==========================================================================

  app.get('/health', async (c) => {
    const dbHealth = await checkDatabaseHealth();
    const isHealthy = dbHealth.healthy;

    return c.json(
      {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        version: config.version,
        environment: config.environment,
        checks: {
          database: dbHealth,
        },
      },
      isHealthy ? 200 : 503
    );
  });

  app.get('/ready', async (c) => {
    const dbHealth = await checkDatabaseHealth();

    if (!dbHealth.healthy) {
      return c.json({ ready: false, reason: 'Database not ready' }, 503);
    }

    return c.json({ ready: true });
  });

  // ==========================================================================
  // API ROUTES
  // ==========================================================================

  const api = new Hono();

  // Public routes (no auth required)
  api.route('/auth', createAuthRoutes());
  // Billing webhook is public (verified by Stripe signature); non-webhook routes
  // apply their own authMiddleware() per route inside createBillingRoutes()
  api.route('/billing', createBillingRoutes());

  // Metrics (public, no auth — for Prometheus scraping)
  api.route('/metrics', createMetricsRoutes());

  // Protected routes (auth required)
  const protectedApi = new Hono();
  protectedApi.use('*', authMiddleware({ requireEmailVerified: true }));

  protectedApi.route('/learner', createLearnerRoutes());
  protectedApi.route('/content', createContentRoutes());
  protectedApi.route('/session', createSessionRoutes());
  protectedApi.route('/policy', createPolicyRoutes());
  protectedApi.route('/badge', createBadgeRoutes());
  protectedApi.route('/admin', createAdminRoutes());
  protectedApi.route('/instructor', createInstructorRoutes());

  api.route('/', protectedApi);

  // Mount API under base path
  app.route(config.api.basePath, api);

  // ==========================================================================
  // 404 HANDLER
  // ==========================================================================

  app.notFound((c) => {
    return c.json(
      {
        error: 'Not Found',
        message: `Route ${c.req.method} ${c.req.path} not found`,
        code: 'ROUTE_NOT_FOUND',
      },
      404
    );
  });

  return app;
}

// =============================================================================
// SERVER STARTUP
// =============================================================================

async function startServer(): Promise<void> {
  const config = loadConfig();
  const log = getLogger();

  log.info('TopShelf Teaching Platform - API Server starting');
  log.info('Loading configuration...');
  log.info({ environment: config.environment, version: config.version }, 'Configuration loaded');

  // Connect to database
  log.info('Connecting to database...');
  try {
    await connectDatabase();
    log.info('Database connected successfully');
  } catch (error) {
    log.error({ err: error }, 'Failed to connect to database');
    process.exit(1);
  }

  // Create application
  log.info('Initializing application...');
  const app = createApp();

  // Start server
  const { host, port } = config.api;
  log.info({ host, port }, 'Starting server...');

  const server = serve({
    fetch: app.fetch,
    hostname: host,
    port: port,
  });

  log.info({ url: `http://${host}:${port}`, basePath: config.api.basePath }, 'Server running');

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    log.info({ signal }, 'Received signal, shutting down gracefully...');

    server.close();
    await closeRedisClient();
    await disconnectDatabase();

    log.info('Server shut down complete');
    process.exit(0);
  };

  process.on('SIGTERM', (): void => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', (): void => {
    void shutdown('SIGINT');
  });
}

// Run if executed directly
startServer().catch((err: unknown) => {
  try {
    loadConfig();
    const log = getLogger();
    log.error({ err }, 'Server startup failed');
  } catch {
    console.error('Server startup failed', err);
  }
  process.exit(1);
});
