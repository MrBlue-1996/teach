/**
 * TopShelf Service LLC - Error Handler Middleware
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { getConfig } from '@topshelf/config';

// =============================================================================
// CUSTOM ERROR CLASSES
// =============================================================================

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super('AUTHENTICATION_ERROR', message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super('AUTHORIZATION_ERROR', message, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
    super('NOT_FOUND', message, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
    this.name = 'ConflictError';
  }
}

// =============================================================================
// ERROR HANDLER
// =============================================================================

export const errorHandler: ErrorHandler = (err, c) => {
  const config = getConfig();
  const requestId = c.get('requestId') || 'unknown';
  const isDev = config.environment === 'development';

  // Log error (with stack in development)
  console.error(`[${requestId}] Error:`, isDev ? err : err.message);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const issues = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    return c.json(
      {
        error: 'Validation Error',
        message: 'Request validation failed',
        code: 'VALIDATION_ERROR',
        requestId,
        details: { issues },
      },
      400
    );
  }

  // Handle HTTP exceptions from Hono
  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message,
        message: err.message,
        code: 'HTTP_ERROR',
        requestId,
      },
      err.status
    );
  }

  // Handle custom app errors
  if (err instanceof AppError) {
    return c.json(
      {
        error: err.name,
        message: err.message,
        code: err.code,
        requestId,
        ...(err.details && isDev ? { details: err.details } : {}),
      },
      err.statusCode as ContentfulStatusCode
    );
  }

  // Handle unknown errors — never expose internal details in API responses
  return c.json(
    {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred. Please try again later.',
      code: 'INTERNAL_ERROR',
      requestId,
    },
    500
  );
};

// =============================================================================
// ERROR FACTORY HELPERS
// =============================================================================

export function badRequest(message: string, details?: Record<string, unknown>) {
  return new ValidationError(message, details);
}

export function unauthorized(message?: string) {
  return new AuthenticationError(message);
}

export function forbidden(message?: string) {
  return new AuthorizationError(message);
}

export function notFound(resource: string, id?: string) {
  return new NotFoundError(resource, id);
}

export function conflict(message: string) {
  return new ConflictError(message);
}

export function serverError(message: string, details?: Record<string, unknown>) {
  return new AppError('INTERNAL_ERROR', message, 500, details);
}
