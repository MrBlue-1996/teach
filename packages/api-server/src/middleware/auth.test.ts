/**
 * TopShelf API Server - Auth Middleware Test Suite
 *
 * Tests for authentication and authorization middleware.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware, requireRole, requireOwnership, optionalAuth } from './auth.js';
import { errorHandler } from './error-handler.js';

// Mock the @topshelf/auth module
vi.mock('@topshelf/auth', () => ({
  verifyToken: vi.fn(),
}));

// Mock the @topshelf/config module
vi.mock('@topshelf/config', () => ({
  getConfig: vi.fn(() => ({
    environment: 'test',
  })),
}));

// Mock the @topshelf/database module
const mockFindFirstUser = vi.fn();
vi.mock('@topshelf/database', () => ({
  getDatabase: (): unknown => ({
    query: {
      users: { findFirst: mockFindFirstUser },
    },
  }),
  users: { id: 'id', emailVerified: 'emailVerified' },
  eq: (...args: unknown[]): unknown[] => args,
}));

// Import the mocked function
import { verifyToken } from '@topshelf/auth';

// Mock token payload
const mockTokenPayload = {
  sub: 'user-123',
  email: 'test@example.com',
  role: 'learner',
  organizationId: 'org-456',
  sessionId: 'session-789',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
};

describe('Auth Middleware', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.onError(errorHandler);
    vi.clearAllMocks();
    mockFindFirstUser.mockResolvedValue({ emailVerified: true });
  });

  describe('authMiddleware', () => {
    it('should reject requests without Authorization header', async () => {
      app.use('*', authMiddleware());
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test');

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toContain('Authorization header required');
    });

    it('should reject requests with invalid authorization format', async () => {
      app.use('*', authMiddleware());
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test', {
        headers: { Authorization: 'InvalidFormat' },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toContain('Invalid authorization format');
    });

    it('should reject requests with Basic auth instead of Bearer', async () => {
      app.use('*', authMiddleware());
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test', {
        headers: { Authorization: 'Basic dXNlcjpwYXNz' },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toContain('Invalid authorization format');
    });

    it('should reject requests with Bearer but no token', async () => {
      app.use('*', authMiddleware());
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer' },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toContain('Invalid authorization format');
    });

    it('should accept valid Bearer token and set context variables', async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockTokenPayload);

      app.use('*', authMiddleware());
      app.get('/test', (c) =>
        c.json({
          userId: c.get('userId'),
          userRole: c.get('userRole'),
          tokenPayload: c.get('tokenPayload'),
        })
      );

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer valid-token-123' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.userId).toBe('user-123');
      expect(body.userRole).toBe('learner');
      expect(body.tokenPayload.email).toBe('test@example.com');
    });

    it('should reject expired tokens', async () => {
      vi.mocked(verifyToken).mockRejectedValue(new Error('Token has expired'));

      app.use('*', authMiddleware());
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer expired-token' },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toContain('Token has expired');
    });

    it('should reject invalid tokens', async () => {
      vi.mocked(verifyToken).mockRejectedValue(new Error('Invalid token'));

      app.use('*', authMiddleware());
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer invalid-token' },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toContain('Invalid token');
    });

    it('should handle non-Error exceptions gracefully', async () => {
      vi.mocked(verifyToken).mockRejectedValue('Something went wrong');

      app.use('*', authMiddleware());
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer bad-token' },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toContain('Invalid or expired token');
    });

    it('should be case-insensitive for Bearer scheme', async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockTokenPayload);

      app.use('*', authMiddleware());
      app.get('/test', (c) => c.json({ userId: c.get('userId') }));

      const res = await app.request('/test', {
        headers: { Authorization: 'bearer valid-token' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.userId).toBe('user-123');
    });
  });

  describe('authMiddleware with requireEmailVerified', () => {
    beforeEach(() => {
      vi.mocked(verifyToken).mockResolvedValue(mockTokenPayload);
    });

    it('should allow verified user through', async () => {
      mockFindFirstUser.mockResolvedValue({ emailVerified: true });

      app.use('*', authMiddleware({ requireEmailVerified: true }));
      app.get('/test', (c) => c.json({ userId: c.get('userId') }));

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.userId).toBe('user-123');
    });

    it('should return 403 for unverified user', async () => {
      mockFindFirstUser.mockResolvedValue({ emailVerified: false });

      app.use('*', authMiddleware({ requireEmailVerified: true }));
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toContain('Email verification required');
    });

    it('should return 403 when user is not found in database', async () => {
      mockFindFirstUser.mockResolvedValue(null);

      app.use('*', authMiddleware({ requireEmailVerified: true }));
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toContain('Email verification required');
    });

    it('should not query database when requireEmailVerified is not set', async () => {
      app.use('*', authMiddleware());
      app.get('/test', (c) => c.json({ ok: true }));

      await app.request('/test', {
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(mockFindFirstUser).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      vi.mocked(verifyToken).mockResolvedValue(mockTokenPayload);
    });

    it('should allow access for users with matching role', async () => {
      app.use('*', authMiddleware());
      app.use('*', requireRole('learner'));
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
    });

    it('should allow access when user has one of multiple allowed roles', async () => {
      app.use('*', authMiddleware());
      app.use('*', requireRole('instructor', 'learner', 'admin'));
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
    });

    it('should deny access for users without matching role', async () => {
      app.use('*', authMiddleware());
      app.use('*', requireRole('admin', 'instructor'));
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toContain('requires one of the following roles');
    });

    it('should return 401 when authentication is missing', async () => {
      // Create a fresh app without auth middleware but with error handler
      const roleApp = new Hono();
      roleApp.onError(errorHandler);
      roleApp.use('*', requireRole('admin'));
      roleApp.get('/test', (c) => c.json({ ok: true }));

      const res = await roleApp.request('/test');

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toContain('Authentication required');
    });
  });

  describe('requireOwnership', () => {
    beforeEach(() => {
      vi.mocked(verifyToken).mockResolvedValue(mockTokenPayload);
    });

    it('should allow access when user owns the resource', async () => {
      app.use('*', authMiddleware());
      app.get('/users/:id', requireOwnership('id'), (c) => c.json({ ok: true }));

      const res = await app.request('/users/user-123', {
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
    });

    it('should deny access when user does not own the resource', async () => {
      app.use('*', authMiddleware());
      app.get('/users/:id', requireOwnership('id'), (c) => c.json({ ok: true }));

      const res = await app.request('/users/other-user-456', {
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toContain('can only access your own resources');
    });

    it('should allow admin users to access any resource', async () => {
      vi.mocked(verifyToken).mockResolvedValue({
        ...mockTokenPayload,
        role: 'system_admin',
      });

      app.use('*', authMiddleware());
      app.get('/users/:id', requireOwnership('id'), (c) => c.json({ ok: true }));

      const res = await app.request('/users/other-user-456', {
        headers: { Authorization: 'Bearer admin-token' },
      });

      expect(res.status).toBe(200);
    });

    it('should allow district admin to access any resource', async () => {
      vi.mocked(verifyToken).mockResolvedValue({
        ...mockTokenPayload,
        role: 'district_admin',
      });

      app.use('*', authMiddleware());
      app.get('/users/:id', requireOwnership('id'), (c) => c.json({ ok: true }));

      const res = await app.request('/users/other-user-456', {
        headers: { Authorization: 'Bearer admin-token' },
      });

      expect(res.status).toBe(200);
    });

    it('should use custom param name', async () => {
      app.use('*', authMiddleware());
      app.get('/profiles/:userId', requireOwnership('userId'), (c) => c.json({ ok: true }));

      const res = await app.request('/profiles/user-123', {
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
    });

    it('should allow custom allowed roles', async () => {
      vi.mocked(verifyToken).mockResolvedValue({
        ...mockTokenPayload,
        role: 'school_admin',
      });

      app.use('*', authMiddleware());
      app.get('/users/:id', requireOwnership('id', ['school_admin', 'instructor']), (c) =>
        c.json({ ok: true })
      );

      const res = await app.request('/users/other-user-456', {
        headers: { Authorization: 'Bearer admin-token' },
      });

      expect(res.status).toBe(200);
    });
  });

  describe('optionalAuth', () => {
    it('should proceed without auth header and not set context variables', async () => {
      app.use('*', optionalAuth());
      app.get('/test', (c) =>
        c.json({
          hasUserId: c.get('userId') !== undefined,
          hasUserRole: c.get('userRole') !== undefined,
        })
      );

      const res = await app.request('/test');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.hasUserId).toBe(false);
      expect(body.hasUserRole).toBe(false);
    });

    it('should set context variables when valid token provided', async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockTokenPayload);

      app.use('*', optionalAuth());
      app.get('/test', (c) =>
        c.json({
          userId: c.get('userId'),
          userRole: c.get('userRole'),
        })
      );

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.userId).toBe('user-123');
      expect(body.userRole).toBe('learner');
    });

    it('should ignore invalid tokens silently', async () => {
      vi.mocked(verifyToken).mockRejectedValue(new Error('Invalid token'));

      app.use('*', optionalAuth());
      app.get('/test', (c) =>
        c.json({
          hasUserId: c.get('userId') !== undefined,
        })
      );

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer invalid-token' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.hasUserId).toBe(false);
    });

    it('should ignore malformed Authorization header', async () => {
      app.use('*', optionalAuth());
      app.get('/test', (c) =>
        c.json({
          hasUserId: c.get('userId') !== undefined,
        })
      );

      const res = await app.request('/test', {
        headers: { Authorization: 'NotBearer token' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.hasUserId).toBe(false);
    });

    it('should ignore empty token', async () => {
      app.use('*', optionalAuth());
      app.get('/test', (c) =>
        c.json({
          hasUserId: c.get('userId') !== undefined,
        })
      );

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer ' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.hasUserId).toBe(false);
    });
  });
});
