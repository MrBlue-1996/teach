/**
 * TopShelf Service LLC - Authentication Routes
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getConfig } from '@topshelf/config';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateTokens,
  generateSessionId,
  verifyRefreshToken,
  generateSecureToken,
} from '@topshelf/auth';
import {
  getDatabase,
  users,
  authSessions,
  oauthAccounts,
  passwordResetTokens,
  emailVerificationTokens,
  eq,
  and,
  isNull,
} from '@topshelf/database';
import { createHash } from 'crypto';
import { EmailService, EMAIL_TEMPLATES } from '@topshelf/email';
import { badRequest, unauthorized, conflict, serverError } from '../middleware/error-handler.js';
import { authMiddleware } from '../middleware/auth.js';
import { insertAuditLog } from '../lib/audit.js';

// ---------------------------------------------------------------------------
// Email service — lazily initialised (console provider in dev, real in prod)
// ---------------------------------------------------------------------------
let _emailService: EmailService | null = null;
function getEmailService(): EmailService {
  if (!_emailService) {
    const provider = (process.env['EMAIL_PROVIDER'] ?? 'console') as
      | 'console'
      | 'sendgrid'
      | 'smtp';
    _emailService = new EmailService({
      provider,
      from: {
        email: process.env['EMAIL_FROM'] ?? 'noreply@topshelfteaching.com',
        name: 'TopShelf Teaching',
      },
      ...(provider === 'sendgrid' && process.env['SENDGRID_API_KEY'] !== undefined
        ? { sendgrid: { apiKey: process.env['SENDGRID_API_KEY'] } }
        : {}),
    });
  }
  return _emailService;
}

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

const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

const OAuthSchema = z.object({
  provider: z.string().min(1).max(50),
  providerAccountId: z.string().min(1).max(255),
  email: z.string().email(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

// =============================================================================
// ROUTES
// =============================================================================

export function createAuthRoutes(): Hono {
  const router = new Hono();

  // ---------------------------------------------------------------------------
  // POST /auth/register - Create new user account
  // ---------------------------------------------------------------------------
  router.post('/register', zValidator('json', RegisterSchema), async (c) => {
    const { email, password, firstName, lastName } = c.req.valid('json');
    const db = getDatabase();
    const config = getConfig();
    const requireEmailVerification = config.environment === 'production';

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
          firstName !== undefined &&
          firstName.length > 0 &&
          lastName !== undefined &&
          lastName.length > 0
            ? `${firstName} ${lastName}`
            : (firstName ?? email.split('@')[0] ?? email),
        role: 'learner',
        emailVerified: !requireEmailVerification,
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
        c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ?? c.req.header('X-Real-IP') ?? null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    const tokens = await generateTokens({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      sessionId,
    });

    if (requireEmailVerification) {
      // Send verification email (fire-and-forget — email failure must not break signup)
      const rawVerifyToken = generateSecureToken(32);
      const verifyTokenHash = createHash('sha256').update(rawVerifyToken).digest('hex');
      const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      void db
        .insert(emailVerificationTokens)
        .values({ userId: newUser.id, tokenHash: verifyTokenHash, expiresAt: verifyExpiresAt })
        .then(() => {
          const appUrl = process.env['APP_URL'] ?? 'https://app.topshelfteaching.com';
          const verifyUrl = `${appUrl}/auth/verify-email?token=${rawVerifyToken}`;
          const emailSvc = getEmailService();
          void emailSvc.sendTemplate(
            EMAIL_TEMPLATES.VERIFY_EMAIL,
            { email: newUser.email },
            { firstName: firstName ?? undefined, verifyUrl }
          );
        });
    }

    void insertAuditLog({
      userId: newUser.id,
      action: 'auth.register',
      resource: 'user',
      resourceId: newUser.id,
      ipAddress: c.req.header('x-forwarded-for') ?? undefined,
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

    if (user === undefined) {
      throw unauthorized('Invalid email or password');
    }
    if (user.passwordHash === null) {
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
        c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ?? c.req.header('X-Real-IP') ?? null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Generate tokens
    const tokens = await generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      ...(user.organizationId !== null ? { organizationId: user.organizationId } : {}),
      sessionId,
    });

    void insertAuditLog({
      userId: user.id,
      action: 'auth.login',
      resource: 'user',
      resourceId: user.id,
      ipAddress: c.req.header('x-forwarded-for') ?? undefined,
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
  // POST /auth/oauth - Exchange OAuth provider info for custom JWT tokens
  // ---------------------------------------------------------------------------
  router.post('/oauth', zValidator('json', OAuthSchema), async (c) => {
    const { provider, providerAccountId, email, firstName, lastName } = c.req.valid('json');
    const db = getDatabase();

    // Check if we already have this OAuth account linked
    console.info('[oauth] checking existing oauth account...');
    const existingOAuth = await db.query.oauthAccounts.findFirst({
      where: and(
        eq(oauthAccounts.provider, provider),
        eq(oauthAccounts.providerAccountId, providerAccountId)
      ),
      with: { user: true },
    });

    console.info('[oauth] existing oauth result:', existingOAuth ? 'found' : 'not found');
    let userId: string;
    let userEmail: string;
    let userRole: string;
    let userFirstName: string | null = null;
    let userLastName: string | null = null;

    if (existingOAuth?.user) {
      // Existing OAuth link — use that user
      const u = existingOAuth.user;
      userId = u.id;
      userEmail = u.email;
      userRole = u.role;
      userFirstName = u.firstName;
      userLastName = u.lastName;

      // Update last login
      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, u.id));
    } else {
      // No OAuth link yet — find or create user by email
      console.info('[oauth] looking up user by email...');
      const existingUser = await db.query.users.findFirst({
        where: and(eq(users.email, email.toLowerCase()), isNull(users.deletedAt)),
      });

      if (existingUser) {
        console.info('[oauth] found existing user, linking oauth account...');
        userId = existingUser.id;
        userEmail = existingUser.email;
        userRole = existingUser.role;
        userFirstName = existingUser.firstName;
        userLastName = existingUser.lastName;

        await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
      } else {
        // Create new user (no password — OAuth-only)
        console.info('[oauth] creating new user...');
        const displayName =
          firstName !== undefined &&
          firstName.length > 0 &&
          lastName !== undefined &&
          lastName.length > 0
            ? `${firstName} ${lastName}`
            : (firstName ?? email.split('@')[0] ?? email);

        const [newUser] = await db
          .insert(users)
          .values({
            email: email.toLowerCase(),
            firstName: firstName ?? null,
            lastName: lastName ?? null,
            displayName,
            role: 'learner',
            emailVerified: true, // OAuth provider verified the email
          })
          .returning({ id: users.id, email: users.email, role: users.role });

        if (!newUser) {
          throw serverError('Failed to create user record');
        }

        userId = newUser.id;
        userEmail = newUser.email;
        userRole = newUser.role;
        userFirstName = firstName ?? null;
        userLastName = lastName ?? null;
      }

      // Link the OAuth account
      console.info('[oauth] inserting oauth account link...');
      await db.insert(oauthAccounts).values({
        userId,
        provider,
        providerAccountId,
      });
    }

    // Create session + tokens (same pattern as /auth/login)
    console.info('[oauth] inserting auth session...');
    const sessionId = generateSessionId();

    await db.insert(authSessions).values({
      userId,
      token: sessionId,
      userAgent: c.req.header('User-Agent') ?? null,
      ipAddress:
        c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ?? c.req.header('X-Real-IP') ?? null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const tokens = await generateTokens({
      userId,
      email: userEmail,
      role: userRole,
      sessionId,
    });

    console.info('[oauth] done, returning tokens');
    return c.json({
      message: 'OAuth login successful',
      user: {
        id: userId,
        email: userEmail,
        firstName: userFirstName,
        lastName: userLastName,
        role: userRole,
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

    if (session === undefined) {
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
        c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ?? c.req.header('X-Real-IP') ?? null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Generate new tokens bound to the new session
    const tokens = await generateTokens({
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
      ...(session.user.organizationId !== null
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

    if (authHeader === undefined) {
      return c.json({ message: 'Logged out' });
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme?.toLowerCase() === 'bearer' && token !== undefined) {
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

        void insertAuditLog({
          userId: payload.sub,
          action: 'auth.logout',
          resource: 'user',
          resourceId: payload.sub,
          ipAddress: c.req.header('x-forwarded-for') ?? undefined,
        });
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

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (user) {
      // Generate a cryptographically secure reset token
      const rawToken = generateSecureToken(32);
      // Store a SHA-256 hash — never store raw tokens in the DB
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Invalidate any existing tokens for this user
      await db
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));

      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      // Send password reset email
      const appUrl = process.env['APP_URL'] ?? 'https://app.topshelfteaching.com';
      const resetUrl = `${appUrl}/auth/reset-password?token=${rawToken}`;
      const emailSvc = getEmailService();
      void emailSvc.sendTemplate(
        EMAIL_TEMPLATES.PASSWORD_RESET,
        { email: user.email, ...(user.firstName !== null ? { name: user.firstName } : {}) },
        { firstName: user.firstName ?? undefined, resetUrl }
      );
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
    const { token, password } = c.req.valid('json');
    const db = getDatabase();

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      throw badRequest('Password does not meet requirements', {
        errors: passwordCheck.errors,
      });
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');

    const resetRecord = await db.query.passwordResetTokens.findFirst({
      where: and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt)),
      with: { user: true },
    });

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      throw badRequest('Reset link is invalid or has expired. Please request a new one.');
    }

    const hashed = await hashPassword(password);

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash: hashed, updatedAt: new Date() })
        .where(eq(users.id, resetRecord.userId));

      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, resetRecord.id));

      // Revoke all active sessions so the old password can't be reused via tokens
      await tx
        .update(authSessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(authSessions.userId, resetRecord.userId), isNull(authSessions.revokedAt)));
    });

    void insertAuditLog({
      userId: resetRecord.userId,
      action: 'auth.password_reset',
      resource: 'user',
      resourceId: resetRecord.userId,
      ipAddress: c.req.header('x-forwarded-for') ?? undefined,
    });

    return c.json({ message: 'Password reset successfully. You can now sign in.' });
  });

  // ---------------------------------------------------------------------------
  // POST /auth/verify-email - Verify email address with one-time token
  // ---------------------------------------------------------------------------
  router.post('/verify-email', zValidator('json', VerifyEmailSchema), async (c) => {
    const { token } = c.req.valid('json');
    const db = getDatabase();

    const tokenHash = createHash('sha256').update(token).digest('hex');

    const record = await db.query.emailVerificationTokens.findFirst({
      where: and(
        eq(emailVerificationTokens.tokenHash, tokenHash),
        isNull(emailVerificationTokens.usedAt)
      ),
    });

    if (!record || record.expiresAt < new Date()) {
      throw badRequest('Verification link is invalid or has expired. Please request a new one.');
    }

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ emailVerified: true, updatedAt: new Date() })
        .where(eq(users.id, record.userId));

      await tx
        .update(emailVerificationTokens)
        .set({ usedAt: new Date() })
        .where(eq(emailVerificationTokens.id, record.id));
    });

    return c.json({ message: 'Email verified successfully. You can now sign in.' });
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

  // ---------------------------------------------------------------------------
  // PATCH /auth/me - Update current user's profile
  // ---------------------------------------------------------------------------
  const UpdateProfileSchema = z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    displayName: z.string().min(1).max(150).optional(),
    timezone: z.string().max(64).optional(),
  });

  router.patch('/me', authMiddleware(), zValidator('json', UpdateProfileSchema), async (c) => {
    const userId = c.get('userId');
    const updates = c.req.valid('json');
    const db = getDatabase();

    const existing = await db.query.users.findFirst({
      where: and(eq(users.id, userId), isNull(users.deletedAt), eq(users.isActive, true)),
      columns: { id: true },
    });

    if (!existing) {
      throw unauthorized('User not found');
    }

    const [updated] = await db
      .update(users)
      .set({
        updatedAt: new Date(),
        ...(updates.firstName !== undefined ? { firstName: updates.firstName } : {}),
        ...(updates.lastName !== undefined ? { lastName: updates.lastName } : {}),
        ...(updates.displayName !== undefined ? { displayName: updates.displayName } : {}),
        ...(updates.timezone !== undefined ? { timezone: updates.timezone } : {}),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        displayName: users.displayName,
        role: users.role,
        emailVerified: users.emailVerified,
      });

    return c.json({ user: updated });
  });

  // ---------------------------------------------------------------------------
  // POST /auth/change-password - Change password for authenticated user
  // ---------------------------------------------------------------------------
  const ChangePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  });

  router.post(
    '/change-password',
    authMiddleware(),
    zValidator('json', ChangePasswordSchema),
    async (c) => {
      const userId = c.get('userId');
      const { currentPassword, newPassword } = c.req.valid('json');
      const db = getDatabase();

      const user = await db.query.users.findFirst({
        where: and(eq(users.id, userId), isNull(users.deletedAt), eq(users.isActive, true)),
        columns: { id: true, passwordHash: true },
      });

      if (user === undefined) {
        throw unauthorized('User not found');
      }
      if (user.passwordHash === null) {
        throw unauthorized('User not found');
      }

      const currentValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!currentValid) {
        throw badRequest('Current password is incorrect.');
      }

      const passwordCheck = validatePasswordStrength(newPassword);
      if (!passwordCheck.valid) {
        throw badRequest('Password does not meet requirements', {
          errors: passwordCheck.errors,
        });
      }

      const hashed = await hashPassword(newPassword);

      await db.transaction(async (tx) => {
        await tx
          .update(users)
          .set({ passwordHash: hashed, updatedAt: new Date() })
          .where(eq(users.id, userId));

        // Revoke all active sessions so old tokens are invalidated
        await tx
          .update(authSessions)
          .set({ revokedAt: new Date() })
          .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));
      });

      void insertAuditLog({
        userId,
        action: 'auth.password_changed',
        resource: 'user',
        resourceId: userId,
        ipAddress: c.req.header('x-forwarded-for') ?? undefined,
      });

      return c.json({ message: 'Password changed successfully.' });
    }
  );

  return router;
}

// Re-export for external use
export { zValidator };
