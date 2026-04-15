/**
 * TopShelf Service LLC - Authentication Routes
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateTokens,
  generateSessionId,
  verifyRefreshToken,
  generateSecureToken,
} from '@topshelf/auth';
import { getDatabase, users, authSessions, eq, and, isNull } from '@topshelf/database';
import { badRequest, unauthorized, conflict, serverError } from '../middleware/error-handler.js';
import { authMiddleware } from '../middleware/auth.js';

// =============================================================================
// SCHEMAS
// =============================================================================

const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// =============================================================================
// ROUTES
// =============================================================================

export function createAuthRoutes() {
  const router = new Hono();

  // ---------------------------------------------------------------------------
  // POST /auth/register - Create new user account
  // ---------------------------------------------------------------------------
  router.post('/register', zValidator('json', RegisterSchema), async (c) => {
    const { email, password, firstName, lastName } = c.req.valid('json');
    const db = getDatabase();

    // Validate password strength
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      throw badRequest('Password does not meet requirements', {
        errors: passwordCheck.errors,
      });
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existingUser) {
      throw conflict('An account with this email already exists');
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        displayName:
          firstName && lastName
            ? `${firstName} ${lastName}`
            : (firstName ?? email.split('@')[0] ?? email),
        role: 'learner',
        emailVerified: false,
      })
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
      });

    if (!newUser) {
      throw serverError('Failed to create user record');
    }

    // Generate session and tokens
    const sessionId = generateSessionId();

    await db.insert(authSessions).values({
      userId: newUser.id,
      token: sessionId,
      userAgent: c.req.header('User-Agent') ?? null,
      ipAddress:
        (c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || c.req.header('X-Real-IP')) ??
        null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    const tokens = await generateTokens({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      sessionId,
    });

    return c.json(
      {
        message: 'Account created successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
        },
        ...tokens,
      },
      201
    );
  });

  // ---------------------------------------------------------------------------
  // POST /auth/login - Authenticate user
  // ---------------------------------------------------------------------------
  router.post('/login', zValidator('json', LoginSchema), async (c) => {
    const { email, password } = c.req.valid('json');
    const db = getDatabase();

    // Find user
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.email, email.toLowerCase()),
        isNull(users.deletedAt),
        eq(users.isActive, true)
      ),
    });

    if (!user || !user.passwordHash) {
      throw unauthorized('Invalid email or password');
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      throw unauthorized('Invalid email or password');
    }

    // Update last login
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    // Create session
    const sessionId = generateSessionId();

    await db.insert(authSessions).values({
      userId: user.id,
      token: sessionId,
      userAgent: c.req.header('User-Agent') ?? null,
      ipAddress:
        (c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || c.req.header('X-Real-IP')) ??
        null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Generate tokens
    const tokens = await generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      ...(user.organizationId != null ? { organizationId: user.organizationId } : {}),
      sessionId,
    });

    return c.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      ...tokens,
    });
  });

  // ---------------------------------------------------------------------------
  // POST /auth/refresh - Refresh access token
  // ---------------------------------------------------------------------------
  router.post('/refresh', zValidator('json', RefreshSchema), async (c) => {
    const { refreshToken } = c.req.valid('json');
    const db = getDatabase();

    // Verify refresh token
    let tokenData;
    try {
      tokenData = await verifyRefreshToken(refreshToken);
    } catch {
      throw unauthorized('Invalid or expired refresh token');
    }

    // Find session
    const session = await db.query.authSessions.findFirst({
      where: and(
        eq(authSessions.userId, tokenData.userId),
        eq(authSessions.token, tokenData.sessionId),
        isNull(authSessions.revokedAt)
      ),
      with: {
        user: true,
      },
    });

    if (!session || !session.user) {
      throw unauthorized('Session not found or revoked');
    }

    // Check session expiry
    if (session.expiresAt < new Date()) {
      throw unauthorized('Session has expired');
    }

    // Rotate refresh token: revoke old session and create a new one
    await db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(eq(authSessions.id, session.id));

    const newSessionId = generateSessionId();

    await db.insert(authSessions).values({
      userId: session.user.id,
      token: newSessionId,
      userAgent: c.req.header('User-Agent') ?? null,
      ipAddress:
        (c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || c.req.header('X-Real-IP')) ??
        null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Generate new tokens bound to the new session
    const tokens = await generateTokens({
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
      ...(session.user.organizationId != null
        ? { organizationId: session.user.organizationId }
        : {}),
      sessionId: newSessionId,
    });

    return c.json({
      message: 'Token refreshed successfully',
      ...tokens,
    });
  });

  // ---------------------------------------------------------------------------
  // POST /auth/logout - Revoke session
  // ---------------------------------------------------------------------------
  router.post('/logout', async (c) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
      return c.json({ message: 'Logged out' });
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme?.toLowerCase() === 'bearer' && token) {
      try {
        const { verifyToken } = await import('@topshelf/auth');
        const payload = await verifyToken(token);
        const db = getDatabase();

        // Revoke the session so refresh tokens tied to it are invalidated
        await db
          .update(authSessions)
          .set({ revokedAt: new Date() })
          .where(
            and(
              eq(authSessions.userId, payload.sub),
              eq(authSessions.token, payload.sessionId),
              isNull(authSessions.revokedAt)
            )
          );
      } catch {
        // Token may be expired/invalid — still return success to avoid
        // leaking information about token validity
      }
    }

    return c.json({ message: 'Logged out successfully' });
  });

  // ---------------------------------------------------------------------------
  // POST /auth/forgot-password - Request password reset
  // ---------------------------------------------------------------------------
  router.post('/forgot-password', zValidator('json', ForgotPasswordSchema), async (c) => {
    const { email } = c.req.valid('json');
    const db = getDatabase();

    // Find user (don't reveal if user exists)
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (user) {
      // Generate reset token
      const resetToken = generateSecureToken(32);

      // TODO: Store token in database with expiry and send email via email service
      // DO NOT log tokens — even in development this creates a security vulnerability
      void resetToken; // token generated, email sending not yet implemented
    }

    // Always return success to prevent email enumeration
    return c.json({
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  });

  // ---------------------------------------------------------------------------
  // POST /auth/reset-password - Reset password with token
  // ---------------------------------------------------------------------------
  router.post('/reset-password', zValidator('json', ResetPasswordSchema), async (c) => {
    const { password } = c.req.valid('json');

    // Validate password strength
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      throw badRequest('Password does not meet requirements', {
        errors: passwordCheck.errors,
      });
    }

    // In production: Verify token from database, update password, invalidate token
    // For now, return not implemented
    throw badRequest('Password reset not fully implemented');
  });

  // ---------------------------------------------------------------------------
  // GET /auth/me - Get current authenticated user profile
  // ---------------------------------------------------------------------------
  router.get('/me', authMiddleware(), async (c) => {
    const userId = c.get('userId');
    const db = getDatabase();

    const user = await db.query.users.findFirst({
      where: and(eq(users.id, userId), isNull(users.deletedAt), eq(users.isActive, true)),
      columns: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        role: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw unauthorized('User not found');
    }

    return c.json({ user });
  });

  return router;
}

// Re-export for external use
export { zValidator };
