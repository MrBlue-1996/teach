/**
 * TopShelf Service LLC - Authentication Middleware
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { createMiddleware } from 'hono/factory';
import { verifyToken, type TokenPayload } from '@topshelf/auth';
import { getDatabase, users, eq } from '@topshelf/database';
import { AppError, AuthenticationError, AuthorizationError } from './error-handler.js';

// Extend Hono context with user info
declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
    userId: string;
    userRole: string;
    tokenPayload: TokenPayload;
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export function authMiddleware(options?: {
  requireEmailVerified?: boolean;
}): ReturnType<typeof createMiddleware> {
  return createMiddleware(async (c, next): Promise<void> => {
    const authHeader = c.req.header('Authorization');

    if (authHeader === undefined) {
      throw new AuthenticationError('Authorization header required');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme?.toLowerCase() !== 'bearer' || token === undefined || token === '') {
      throw new AuthenticationError('Invalid authorization format. Use: Bearer <token>');
    }

    try {
      const payload = await verifyToken(token);

      // Set user info in context
      c.set('userId', payload.sub);
      c.set('userRole', payload.role);
      c.set('tokenPayload', payload);

      if (options?.requireEmailVerified === true) {
        const db = getDatabase();
        const user = await db.query.users.findFirst({
          where: eq(users.id, payload.sub),
          columns: { emailVerified: true },
        });

        if (user?.emailVerified !== true) {
          throw new AuthorizationError('Email verification required');
        }
      }

      await next();
    } catch (error) {
      // Re-throw app errors (e.g., AuthorizationError from email verification check)
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new AuthenticationError(error.message);
      }
      throw new AuthenticationError('Invalid or expired token');
    }
  });
}

/**
 * Role-based authorization middleware
 */
export function requireRole(...allowedRoles: string[]): ReturnType<typeof createMiddleware> {
  return createMiddleware(async (c, next): Promise<void> => {
    const userRole = c.get('userRole');

    if ((userRole as string | undefined) === undefined || userRole === '') {
      throw new AuthenticationError('Authentication required');
    }

    if (!allowedRoles.includes(userRole)) {
      throw new AuthorizationError(
        `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      );
    }

    await next();
  });
}

/**
 * Resource ownership middleware - ensures user can only access their own resources
 */
export function requireOwnership(
  paramName: string = 'id',
  allowRoles: string[] = ['system_admin', 'district_admin']
): ReturnType<typeof createMiddleware> {
  return createMiddleware(async (c, next): Promise<void> => {
    const userId = c.get('userId');
    const userRole = c.get('userRole');
    const resourceOwnerId = c.req.param(paramName);

    // Admins can access any resource
    if (allowRoles.includes((userRole as string | undefined) ?? '')) {
      await next();
      return;
    }

    // Users can only access their own resources
    if (resourceOwnerId !== userId) {
      throw new AuthorizationError('You can only access your own resources');
    }

    await next();
  });
}

/**
 * Optional authentication - sets user info if token present, but doesn't require it
 */
export function optionalAuth(): ReturnType<typeof createMiddleware> {
  return createMiddleware(async (c, next): Promise<void> => {
    const authHeader = c.req.header('Authorization');

    if (authHeader !== undefined) {
      const [scheme, token] = authHeader.split(' ');

      if (scheme?.toLowerCase() === 'bearer' && token !== undefined && token !== '') {
        try {
          const payload = await verifyToken(token);
          c.set('userId', payload.sub);
          c.set('userRole', payload.role);
          c.set('tokenPayload', payload);
        } catch {
          // Ignore invalid tokens in optional auth
        }
      }
    }

    await next();
  });
}
