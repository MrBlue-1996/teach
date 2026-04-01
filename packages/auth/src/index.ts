/**
 * TopShelf Service LLC - Authentication & Authorization System
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { getConfig } from '@topshelf/config';

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

export const TokenPayloadSchema = z.object({
  sub: z.string(), // User ID
  email: z.string().email(),
  role: z.string(),
  organizationId: z.string().optional(),
  sessionId: z.string(),
  iat: z.number(),
  exp: z.number(),
});

export type TokenPayload = z.infer<typeof TokenPayloadSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface UserCredentials {
  email: string;
  password: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  organizationId?: string;
}

// =============================================================================
// PASSWORD HASHING
// =============================================================================

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const config = getConfig();
  return bcrypt.hash(password, config.auth.bcryptRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Check password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// JWT TOKEN MANAGEMENT
// =============================================================================

/**
 * Get JWT secret as Uint8Array
 */
function getJwtSecret(): Uint8Array {
  const config = getConfig();
  return new TextEncoder().encode(config.auth.jwtSecret);
}

/**
 * Parse duration string (e.g., "24h", "7d") to seconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    default:
      throw new Error(`Invalid duration unit: ${unit}`);
  }
}

/**
 * Generate a JWT access token
 */
export async function generateAccessToken(payload: {
  userId: string;
  email: string;
  role: string;
  organizationId?: string;
  sessionId: string;
}): Promise<string> {
  const config = getConfig();
  const secret = getJwtSecret();
  const expiresIn = parseDuration(config.auth.jwtExpiresIn);

  const token = await new SignJWT({
    email: payload.email,
    role: payload.role,
    organizationId: payload.organizationId,
    sessionId: payload.sessionId,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .setIssuer('topshelf-teaching')
    .setAudience('topshelf-api')
    .sign(secret);

  return token;
}

/**
 * Generate a refresh token
 */
export async function generateRefreshToken(payload: {
  userId: string;
  sessionId: string;
}): Promise<string> {
  const config = getConfig();
  const secret = getJwtSecret();
  const expiresIn = parseDuration(config.auth.refreshTokenExpiresIn);

  const token = await new SignJWT({
    sessionId: payload.sessionId,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .setIssuer('topshelf-teaching')
    .setAudience('topshelf-refresh')
    .sign(secret);

  return token;
}

/**
 * Generate both access and refresh tokens
 */
export async function generateTokens(payload: {
  userId: string;
  email: string;
  role: string;
  organizationId?: string;
  sessionId: string;
}): Promise<AuthTokens> {
  const config = getConfig();
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(payload),
    generateRefreshToken({ userId: payload.userId, sessionId: payload.sessionId }),
  ]);

  return {
    accessToken,
    refreshToken,
    expiresIn: parseDuration(config.auth.jwtExpiresIn),
    tokenType: 'Bearer',
  };
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  const secret = getJwtSecret();

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'topshelf-teaching',
      audience: 'topshelf-api',
    });

    // Validate payload structure
    const result = TokenPayloadSchema.safeParse({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId,
      sessionId: payload.sessionId,
      iat: payload.iat,
      exp: payload.exp,
    });

    if (!result.success) {
      throw new Error('Invalid token payload');
    }

    return result.data;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        throw new Error('Token has expired');
      }
      if (error.message.includes('signature')) {
        throw new Error('Invalid token signature');
      }
    }
    throw new Error('Invalid token');
  }
}

/**
 * Verify a refresh token
 */
export async function verifyRefreshToken(token: string): Promise<{
  userId: string;
  sessionId: string;
}> {
  const secret = getJwtSecret();

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'topshelf-teaching',
      audience: 'topshelf-refresh',
    });

    if (payload.type !== 'refresh') {
      throw new Error('Not a refresh token');
    }

    return {
      userId: payload.sub as string,
      sessionId: payload.sessionId as string,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        throw new Error('Refresh token has expired');
      }
    }
    throw new Error('Invalid refresh token');
  }
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/**
 * Generate a secure session ID
 */
export function generateSessionId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a secure random token (for password reset, email verification, etc.)
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

// =============================================================================
// OAUTH HELPERS
// =============================================================================

export interface OAuthUserInfo {
  provider: string;
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
}

/**
 * Generate OAuth state parameter
 */
export function generateOAuthState(): string {
  return generateSecureToken(16);
}

/**
 * Validate OAuth state parameter (CSRF protection)
 */
export function validateOAuthState(receivedState: string, expectedState: string): boolean {
  if (!receivedState || !expectedState) {
    return false;
  }

  // Constant-time comparison
  if (receivedState.length !== expectedState.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < receivedState.length; i++) {
    result |= receivedState.charCodeAt(i) ^ expectedState.charCodeAt(i);
  }

  return result === 0;
}

// =============================================================================
// EXPORTS (all public symbols are exported at their definition sites above)
// =============================================================================
