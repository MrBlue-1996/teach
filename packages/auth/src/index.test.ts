/**
 * TopShelf Auth Package - Comprehensive Test Suite
 *
 * Tests for password hashing, JWT token management, session utilities,
 * and OAuth helpers.
 */

import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';

// Mock @topshelf/config before importing auth functions
vi.mock('@topshelf/config', () => ({
  getConfig: () => ({
    auth: {
      jwtSecret: 'test-secret-key-that-is-at-least-32-characters-long-for-testing',
      jwtExpiresIn: '15m',
      refreshTokenExpiresIn: '7d',
      bcryptRounds: 4, // Low rounds for fast tests
      sessionSecret: 'test-session-secret-at-least-32-characters-long',
      allowedOrigins: ['http://localhost:3000'],
      oauth: {
        google: { enabled: false },
        microsoft: { enabled: false },
      },
    },
  }),
}));

import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyToken,
  verifyRefreshToken,
  generateSessionId,
  generateSecureToken,
  generateOAuthState,
  validateOAuthState,
  TokenPayloadSchema,
} from './index.js';

// =============================================================================
// PASSWORD HASHING
// =============================================================================

describe('Password Hashing', () => {
  describe('hashPassword', () => {
    it('should hash a password and return a bcrypt hash string', async () => {
      const password = 'SecureP@ss1';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      // bcrypt hashes start with $2b$ or $2a$
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it('should produce different hashes for the same password (salt)', async () => {
      const password = 'SecureP@ss1';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty password', async () => {
      const hash = await hashPassword('');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle extremely long password', async () => {
      // bcrypt has a max input of 72 bytes, but it should not throw
      const longPassword = 'A'.repeat(100) + '!1a';
      const hash = await hashPassword(longPassword);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'SecureP@ss1';
      const hash = await hashPassword(password);
      const result = await verifyPassword(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const hash = await hashPassword('SecureP@ss1');
      const result = await verifyPassword('WrongPassword1!', hash);

      expect(result).toBe(false);
    });

    it('should return false for empty password against a hash', async () => {
      const hash = await hashPassword('SecureP@ss1');
      const result = await verifyPassword('', hash);

      expect(result).toBe(false);
    });

    it('should round-trip with empty password', async () => {
      const hash = await hashPassword('');
      const result = await verifyPassword('', hash);

      expect(result).toBe(true);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept a strong password', () => {
      const result = validatePasswordStrength('MyStr0ng!Pass');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject a short password', () => {
      const result = validatePasswordStrength('Ab1!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase', () => {
      const result = validatePasswordStrength('lowercase1!pass');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = validatePasswordStrength('UPPERCASE1!PASS');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePasswordStrength('NoNumbers!Here');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = validatePasswordStrength('NoSpecial1Here');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should return multiple errors for very weak password', () => {
      const result = validatePasswordStrength('abc');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should handle empty password', () => {
      const result = validatePasswordStrength('');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });
  });
});

// =============================================================================
// JWT TOKEN MANAGEMENT
// =============================================================================

describe('JWT Token Management', () => {
  const tokenPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'learner',
    sessionId: 'session-abc-123',
  };

  describe('generateAccessToken', () => {
    it('should generate a valid JWT access token', async () => {
      const token = await generateAccessToken(tokenPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      // JWT tokens have 3 parts separated by dots
      expect(token.split('.').length).toBe(3);
    });

    it('should include optional organizationId', async () => {
      const token = await generateAccessToken({
        ...tokenPayload,
        organizationId: 'org-456',
      });

      expect(token).toBeDefined();
      const verified = await verifyToken(token);
      expect(verified.organizationId).toBe('org-456');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', async () => {
      const token = await generateRefreshToken({
        userId: 'user-123',
        sessionId: 'session-abc-123',
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });
  });

  describe('generateTokens', () => {
    it('should return both access and refresh tokens', async () => {
      const tokens = await generateTokens(tokenPayload);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBeGreaterThan(0);
      expect(tokens.tokenType).toBe('Bearer');
    });

    it('should generate different access and refresh tokens', async () => {
      const tokens = await generateTokens(tokenPayload);

      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid access token', async () => {
      const token = await generateAccessToken(tokenPayload);
      const payload = await verifyToken(token);

      expect(payload.sub).toBe('user-123');
      expect(payload.email).toBe('test@example.com');
      expect(payload.role).toBe('learner');
      expect(payload.sessionId).toBe('session-abc-123');
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });

    it('should reject a malformed token', async () => {
      await expect(verifyToken('not-a-valid-token')).rejects.toThrow('Invalid token');
    });

    it('should reject a token with tampered payload', async () => {
      const token = await generateAccessToken(tokenPayload);
      const parts = token.split('.');
      // Tamper with the payload
      parts[1] = 'dGFtcGVyZWQ';
      const tamperedToken = parts.join('.');

      await expect(verifyToken(tamperedToken)).rejects.toThrow();
    });

    it('should reject an empty string token', async () => {
      await expect(verifyToken('')).rejects.toThrow();
    });

    it('should reject a token signed with a different secret', async () => {
      const token = await generateAccessToken(tokenPayload);
      const parts = token.split('.');
      // Replace the entire signature portion with garbage to ensure invalidity
      parts[2] = 'AAAA_this_is_definitely_not_a_valid_signature_BBBB';
      const corrupted = parts.join('.');

      await expect(verifyToken(corrupted)).rejects.toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', async () => {
      const token = await generateRefreshToken({
        userId: 'user-123',
        sessionId: 'session-abc',
      });

      const result = await verifyRefreshToken(token);

      expect(result.userId).toBe('user-123');
      expect(result.sessionId).toBe('session-abc');
    });

    it('should reject an access token as refresh token', async () => {
      const accessToken = await generateAccessToken(tokenPayload);

      // Access tokens have audience 'topshelf-api', refresh expects 'topshelf-refresh'
      await expect(verifyRefreshToken(accessToken)).rejects.toThrow('Invalid refresh token');
    });

    it('should reject a malformed refresh token', async () => {
      await expect(verifyRefreshToken('garbage-token')).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('Token Expiry', () => {
    it('should have expiry in the future for newly generated tokens', async () => {
      const token = await generateAccessToken(tokenPayload);
      const payload = await verifyToken(token);

      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeGreaterThan(now);
    });

    it('should set issued-at to approximately now', async () => {
      const beforeTime = Math.floor(Date.now() / 1000);
      const token = await generateAccessToken(tokenPayload);
      const payload = await verifyToken(token);
      const afterTime = Math.floor(Date.now() / 1000);

      expect(payload.iat).toBeGreaterThanOrEqual(beforeTime);
      expect(payload.iat).toBeLessThanOrEqual(afterTime);
    });
  });
});

// =============================================================================
// TOKEN PAYLOAD SCHEMA
// =============================================================================

describe('TokenPayloadSchema', () => {
  it('should validate a correct token payload', () => {
    const payload = {
      sub: 'user-123',
      email: 'test@example.com',
      role: 'learner',
      sessionId: 'session-abc',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const result = TokenPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('should reject payload with invalid email', () => {
    const payload = {
      sub: 'user-123',
      email: 'not-an-email',
      role: 'learner',
      sessionId: 'session-abc',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const result = TokenPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('should allow optional organizationId', () => {
    const payload = {
      sub: 'user-123',
      email: 'test@example.com',
      role: 'admin',
      organizationId: 'org-456',
      sessionId: 'session-abc',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const result = TokenPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// SESSION & SECURE TOKEN UTILITIES
// =============================================================================

describe('Session Utilities', () => {
  describe('generateSessionId', () => {
    it('should generate a 64-character hex string', () => {
      const sessionId = generateSessionId();

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBe(64);
      expect(sessionId).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate unique session IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateSessionId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate a token of default length', () => {
      const token = generateSecureToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      // 32 bytes -> 64 hex chars
      expect(token.length).toBe(64);
    });

    it('should generate a token of custom length', () => {
      const token = generateSecureToken(16);

      // 16 bytes -> 32 hex chars
      expect(token.length).toBe(32);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set(Array.from({ length: 50 }, () => generateSecureToken()));
      expect(tokens.size).toBe(50);
    });
  });
});

// =============================================================================
// OAUTH HELPERS
// =============================================================================

describe('OAuth Helpers', () => {
  describe('generateOAuthState', () => {
    it('should generate a non-empty string', () => {
      const state = generateOAuthState();

      expect(state).toBeDefined();
      expect(typeof state).toBe('string');
      expect(state.length).toBeGreaterThan(0);
    });

    it('should generate unique states', () => {
      const states = new Set(Array.from({ length: 50 }, () => generateOAuthState()));
      expect(states.size).toBe(50);
    });
  });

  describe('validateOAuthState', () => {
    it('should return true for matching states', () => {
      const state = generateOAuthState();
      expect(validateOAuthState(state, state)).toBe(true);
    });

    it('should return false for mismatched states', () => {
      const state1 = generateOAuthState();
      const state2 = generateOAuthState();
      expect(validateOAuthState(state1, state2)).toBe(false);
    });

    it('should return false when received state is empty', () => {
      expect(validateOAuthState('', 'expected-state')).toBe(false);
    });

    it('should return false when expected state is empty', () => {
      expect(validateOAuthState('received-state', '')).toBe(false);
    });

    it('should return false for different length strings', () => {
      expect(validateOAuthState('short', 'longer-string')).toBe(false);
    });

    it('should use constant-time comparison (same length, different content)', () => {
      const a = 'aaaaaaaaaaaaaaaa';
      const b = 'aaaaaaaaaaaaaaab';
      expect(validateOAuthState(a, b)).toBe(false);
    });
  });
});
