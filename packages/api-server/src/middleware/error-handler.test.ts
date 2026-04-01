/**
 * TopShelf API Server - Error Handler Middleware Test Suite
 *
 * Tests for error classes, error handler, and error factory helpers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  errorHandler,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  serverError,
} from './error-handler.js';

// Mock @topshelf/config
vi.mock('@topshelf/config', () => ({
  getConfig: () => ({
    environment: 'development',
  }),
}));

// =============================================================================
// ERROR CLASSES
// =============================================================================

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an error with code, message, and status', () => {
      const err = new AppError('TEST_ERROR', 'Test message', 400);
      expect(err.code).toBe('TEST_ERROR');
      expect(err.message).toBe('Test message');
      expect(err.statusCode).toBe(400);
      expect(err.name).toBe('AppError');
    });

    it('should default to 500 status code', () => {
      const err = new AppError('ERROR', 'msg');
      expect(err.statusCode).toBe(500);
    });

    it('should include optional details', () => {
      const err = new AppError('ERROR', 'msg', 400, { field: 'email' });
      expect(err.details).toEqual({ field: 'email' });
    });
  });

  describe('ValidationError', () => {
    it('should have 400 status and correct code', () => {
      const err = new ValidationError('Invalid input');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.name).toBe('ValidationError');
    });
  });

  describe('AuthenticationError', () => {
    it('should have 401 status with default message', () => {
      const err = new AuthenticationError();
      expect(err.statusCode).toBe(401);
      expect(err.message).toBe('Authentication required');
    });

    it('should accept custom message', () => {
      const err = new AuthenticationError('Token expired');
      expect(err.message).toBe('Token expired');
    });
  });

  describe('AuthorizationError', () => {
    it('should have 403 status with default message', () => {
      const err = new AuthorizationError();
      expect(err.statusCode).toBe(403);
      expect(err.message).toBe('Insufficient permissions');
    });
  });

  describe('NotFoundError', () => {
    it('should have 404 status', () => {
      const err = new NotFoundError('User');
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('User not found');
    });

    it('should include ID in message when provided', () => {
      const err = new NotFoundError('Content pack', 'pack-123');
      expect(err.message).toBe("Content pack with ID 'pack-123' not found");
    });
  });

  describe('ConflictError', () => {
    it('should have 409 status', () => {
      const err = new ConflictError('Email already exists');
      expect(err.statusCode).toBe(409);
      expect(err.message).toBe('Email already exists');
    });
  });
});

// =============================================================================
// ERROR FACTORY HELPERS
// =============================================================================

describe('Error Factory Helpers', () => {
  it('badRequest should create ValidationError', () => {
    const err = badRequest('Bad input');
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.statusCode).toBe(400);
  });

  it('unauthorized should create AuthenticationError', () => {
    const err = unauthorized('No token');
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.statusCode).toBe(401);
  });

  it('forbidden should create AuthorizationError', () => {
    const err = forbidden();
    expect(err).toBeInstanceOf(AuthorizationError);
    expect(err.statusCode).toBe(403);
  });

  it('notFound should create NotFoundError', () => {
    const err = notFound('User', 'u-123');
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.statusCode).toBe(404);
  });

  it('conflict should create ConflictError', () => {
    const err = conflict('Already exists');
    expect(err).toBeInstanceOf(ConflictError);
    expect(err.statusCode).toBe(409);
  });

  it('serverError should create AppError with 500', () => {
    const err = serverError('Something broke');
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(500);
  });
});

// =============================================================================
// ERROR HANDLER MIDDLEWARE (via Hono app)
// =============================================================================

describe('errorHandler middleware', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.onError(errorHandler);

    // Set requestId for all routes
    app.use('*', async (c, next) => {
      c.set('requestId' as any, 'req-test-123');
      await next();
    });
  });

  it('should handle AppError and return correct status', async () => {
    app.get('/test', () => {
      throw new NotFoundError('Resource', 'id-1');
    });

    const res = await app.request('/test');
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
    expect(body.requestId).toBe('req-test-123');
  });

  it('should handle ValidationError', async () => {
    app.get('/test', () => {
      throw new ValidationError('Invalid data', { field: 'email' });
    });

    const res = await app.request('/test');
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('should handle unknown errors with 500 status', async () => {
    app.get('/test', () => {
      throw new Error('Unexpected error');
    });

    const res = await app.request('/test');
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.code).toBe('INTERNAL_ERROR');
  });

  it('should include error message for unknown errors', async () => {
    app.get('/test', () => {
      throw new Error('Dev error with details');
    });

    const res = await app.request('/test');
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.code).toBe('INTERNAL_ERROR');
    // The message should be present (either detailed in dev or generic in prod)
    expect(body.message).toBeDefined();
    expect(typeof body.message).toBe('string');
  });
});
