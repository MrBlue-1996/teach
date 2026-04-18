/**
 * TopShelf API Server - Auth Routes Test Suite
 *
 * Tests for authentication routes: register, login, logout, refresh token.
 * Uses Hono's app.request() for HTTP-level testing without a running server.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createAuthRoutes } from './auth.js';
import { errorHandler } from '../middleware/error-handler.js';

// =============================================================================
// MOCKS
// =============================================================================

const mockDb = {
  query: {
    users: {
      findFirst: vi.fn(),
    },
    authSessions: {
      findFirst: vi.fn(),
    },
    passwordResetTokens: {
      findFirst: vi.fn(),
    },
    emailVerificationTokens: {
      findFirst: vi.fn(),
    },
  },
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue(
      Object.assign(
        Promise.resolve([{ id: 'user-new-1', email: 'newuser@example.com', role: 'learner' }]),
        {
          returning: vi
            .fn()
            .mockResolvedValue([
              { id: 'user-new-1', email: 'newuser@example.com', role: 'learner' },
            ]),
        }
      )
    ),
  }),
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }),
  transaction: vi.fn().mockImplementation((cb: (tx: unknown) => Promise<unknown>) => cb(mockDb)),
};

vi.mock('@topshelf/database', () => ({
  getDatabase: () => mockDb,
  users: {
    id: 'id',
    email: 'email',
    deletedAt: 'deletedAt',
    isActive: 'isActive',
    firstName: 'firstName',
    lastName: 'lastName',
    timezone: 'timezone',
    displayName: 'displayName',
    updatedAt: 'updatedAt',
  },
  authSessions: { userId: 'userId', token: 'token', revokedAt: 'revokedAt' },
  passwordResetTokens: { userId: 'userId', tokenHash: 'tokenHash', usedAt: 'usedAt', id: 'id' },
  emailVerificationTokens: {
    userId: 'userId',
    tokenHash: 'tokenHash',
    usedAt: 'usedAt',
    id: 'id',
    expiresAt: 'expiresAt',
  },
  eq: (...args: unknown[]) => args,
  and: (...args: unknown[]) => args,
  isNull: (field: unknown) => field,
}));

vi.mock('@topshelf/email', () => ({
  EmailService: vi.fn().mockImplementation(() => ({
    sendTemplate: vi.fn().mockResolvedValue({ success: true }),
    send: vi.fn().mockResolvedValue({ success: true }),
  })),
  EMAIL_TEMPLATES: {
    PASSWORD_RESET: 'password-reset',
    VERIFY_EMAIL: 'verify-email',
    WELCOME: 'welcome',
  },
}));

vi.mock('@topshelf/auth', () => ({
  hashPassword: vi.fn().mockResolvedValue('$2b$04$hashedpassword'),
  verifyPassword: vi.fn().mockResolvedValue(true),
  validatePasswordStrength: vi.fn().mockReturnValue({ valid: true, errors: [] }),
  generateTokens: vi.fn().mockResolvedValue({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 86400,
    tokenType: 'Bearer',
  }),
  generateSessionId: vi.fn().mockReturnValue('mock-session-id'),
  verifyRefreshToken: vi.fn().mockResolvedValue({
    userId: 'user-1',
    sessionId: 'session-1',
  }),
  generateSecureToken: vi.fn().mockReturnValue('mock-secure-token'),
}));

vi.mock('@topshelf/config', () => ({
  getConfig: () => ({
    environment: 'development',
  }),
}));

// =============================================================================
// TEST SETUP
// =============================================================================

describe('Auth Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.onError(errorHandler);
    app.route('/auth', createAuthRoutes());

    // Reset default mock returns
    mockDb.query.users.findFirst.mockResolvedValue(null);
    const returningMock = vi
      .fn()
      .mockResolvedValue([{ id: 'user-new-1', email: 'newuser@example.com', role: 'learner' }]);
    const valuesResult = Object.assign(
      Promise.resolve([{ id: 'user-new-1', email: 'newuser@example.com', role: 'learner' }]),
      { returning: returningMock }
    );
    mockDb.insert.mockReturnValue({ values: vi.fn().mockReturnValue(valuesResult) });
  });

  // ---------------------------------------------------------------------------
  // POST /auth/register
  // ---------------------------------------------------------------------------

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const { validatePasswordStrength } = await import('@topshelf/auth');
      (validatePasswordStrength as ReturnType<typeof vi.fn>).mockReturnValue({
        valid: true,
        errors: [],
      });
      mockDb.query.users.findFirst.mockResolvedValue(null); // User doesn't exist

      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'SecureP@ss1',
          firstName: 'John',
          lastName: 'Doe',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.message).toBe('Account created successfully');
      expect(body.user.email).toBe('newuser@example.com');
      expect(body.accessToken).toBe('mock-access-token');
      expect(body.refreshToken).toBe('mock-refresh-token');
      expect(body.tokenType).toBe('Bearer');
    });

    it('should reject registration with invalid email', async () => {
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'not-valid-email',
          password: 'SecureP@ss1',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject registration with short password', async () => {
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'short',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject registration when password strength check fails', async () => {
      const { validatePasswordStrength } = await import('@topshelf/auth');
      (validatePasswordStrength as ReturnType<typeof vi.fn>).mockReturnValue({
        valid: false,
        errors: ['Password must contain uppercase'],
      });
      mockDb.query.users.findFirst.mockResolvedValue(null);

      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'weakpassword1!',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject registration when email already exists', async () => {
      const { validatePasswordStrength } = await import('@topshelf/auth');
      (validatePasswordStrength as ReturnType<typeof vi.fn>).mockReturnValue({
        valid: true,
        errors: [],
      });
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com',
      });

      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'SecureP@ss1',
        }),
      });

      expect(res.status).toBe(409);
    });

    it('should reject registration with missing body', async () => {
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /auth/login
  // ---------------------------------------------------------------------------

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const { verifyPassword } = await import('@topshelf/auth');
      (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      mockDb.query.users.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: '$2b$04$hashedpassword',
        firstName: 'John',
        lastName: 'Doe',
        role: 'learner',
        organizationId: null,
      });

      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'SecureP@ss1',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe('Login successful');
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
    });

    it('should reject login with invalid email format', async () => {
      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'password',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject login with empty password', async () => {
      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: '',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject login when user not found', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null);

      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'SecureP@ss1',
        }),
      });

      expect(res.status).toBe(401);
    });

    it('should reject login with wrong password', async () => {
      const { verifyPassword } = await import('@topshelf/auth');
      (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      mockDb.query.users.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: '$2b$04$hashedpassword',
        role: 'learner',
      });

      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'WrongPassword1!',
        }),
      });

      expect(res.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /auth/logout
  // ---------------------------------------------------------------------------

  describe('POST /auth/logout', () => {
    it('should return success on logout with auth header', async () => {
      const res = await app.request('/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe('Logged out successfully');
    });

    it('should return success on logout without auth header', async () => {
      const res = await app.request('/auth/logout', {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe('Logged out');
    });
  });

  // ---------------------------------------------------------------------------
  // POST /auth/refresh
  // ---------------------------------------------------------------------------

  describe('POST /auth/refresh', () => {
    it('should refresh tokens with a valid refresh token', async () => {
      const { verifyRefreshToken } = await import('@topshelf/auth');
      (verifyRefreshToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 'user-1',
        sessionId: 'session-1',
      });

      mockDb.query.authSessions.findFirst.mockResolvedValue({
        userId: 'user-1',
        token: 'session-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        user: {
          id: 'user-1',
          email: 'user@example.com',
          role: 'learner',
          organizationId: null,
        },
      });

      const res = await app.request('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'valid-refresh-token' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe('Token refreshed successfully');
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
    });

    it('should reject refresh with invalid token', async () => {
      const { verifyRefreshToken } = await import('@topshelf/auth');
      (verifyRefreshToken as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Invalid refresh token')
      );

      const res = await app.request('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'invalid-token' }),
      });

      expect(res.status).toBe(401);
    });

    it('should reject refresh with empty refresh token', async () => {
      const res = await app.request('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: '' }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject refresh when session not found', async () => {
      const { verifyRefreshToken } = await import('@topshelf/auth');
      (verifyRefreshToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 'user-1',
        sessionId: 'session-1',
      });
      mockDb.query.authSessions.findFirst.mockResolvedValue(null);

      const res = await app.request('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'valid-but-no-session' }),
      });

      expect(res.status).toBe(401);
    });

    it('should reject refresh when session has expired', async () => {
      const { verifyRefreshToken } = await import('@topshelf/auth');
      (verifyRefreshToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 'user-1',
        sessionId: 'session-1',
      });
      mockDb.query.authSessions.findFirst.mockResolvedValue({
        userId: 'user-1',
        token: 'session-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000), // Already expired
        user: {
          id: 'user-1',
          email: 'user@example.com',
          role: 'learner',
        },
      });

      const res = await app.request('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'valid-but-expired-session' }),
      });

      expect(res.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /auth/forgot-password
  // ---------------------------------------------------------------------------

  describe('POST /auth/forgot-password', () => {
    it('should return success message regardless of user existence', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null);

      const res = await app.request('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@example.com' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toContain('If an account exists');
    });

    it('should return same message when user does exist', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
      });

      const res = await app.request('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@example.com' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toContain('If an account exists');
    });

    it('should reject invalid email format', async () => {
      const res = await app.request('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email' }),
      });

      expect(res.status).toBe(400);
    });
  });
});
