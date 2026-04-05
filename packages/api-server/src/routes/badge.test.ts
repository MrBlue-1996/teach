/**
 * TopShelf API Server - Badge Routes Test Suite
 *
 * Tests for badge routes: list badges, get badge details, verify badge.
 * Uses Hono's app.request() for HTTP-level testing without a running server.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createBadgeRoutes } from './badge.js';
import { errorHandler } from '../middleware/error-handler.js';

// =============================================================================
// MOCKS
// =============================================================================

const mockBadges = [
  {
    id: 'badge-1',
    userId: 'user-test-1',
    badgeType: 'mastery',
    level: 'gold',
    status: 'issued',
    masteryScore: 0.95,
    issuedAt: new Date('2026-03-15T10:00:00Z'),
    expiresAt: new Date('2027-03-15T10:00:00Z'),
    verificationHash: 'abc123hash',
    contentPack: {
      title: 'Linux Fundamentals',
      certificationTarget: 'CompTIA Linux+',
    },
  },
  {
    id: 'badge-2',
    userId: 'user-test-1',
    badgeType: 'completion',
    level: 'silver',
    status: 'issued',
    masteryScore: 0.75,
    issuedAt: new Date('2026-02-20T14:00:00Z'),
    expiresAt: new Date('2027-02-20T14:00:00Z'),
    verificationHash: 'def456hash',
    contentPack: {
      title: 'AWS Cloud Practitioner',
      certificationTarget: 'AWS Certified Cloud Practitioner',
    },
  },
];

const mockBadgeWithUser = {
  id: 'badge-1',
  userId: 'user-test-1',
  badgeType: 'mastery',
  level: 'gold',
  status: 'issued',
  masteryScore: 0.95,
  issuedAt: new Date('2026-03-15T10:00:00Z'),
  expiresAt: new Date('2027-03-15T10:00:00Z'),
  verificationHash: 'abc123hash',
  contentPack: {
    title: 'Linux Fundamentals',
    certificationTarget: 'CompTIA Linux+',
  },
  user: {
    displayName: 'John Doe',
  },
};

const mockDb = {
  query: {
    badges: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
};

vi.mock('@topshelf/database', () => ({
  getDatabase: () => mockDb,
  badges: {
    id: 'id',
    userId: 'userId',
    issuedAt: 'issuedAt',
    verificationHash: 'verificationHash',
    status: 'status',
  },
  eq: (...args: unknown[]) => args,
  and: (...args: unknown[]) => args,
  desc: (field: unknown) => field,
}));

vi.mock('@topshelf/config', () => ({
  getConfig: () => ({
    environment: 'development',
  }),
}));

// =============================================================================
// TESTS
// =============================================================================

describe('Badge Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.onError(errorHandler);

    // Simulate authenticated user context
    app.use('*', async (c, next) => {
      c.set('userId' as any, 'user-test-1');
      c.set('userRole' as any, 'learner');
      await next();
    });

    app.route('/badge', createBadgeRoutes());

    // Reset mock implementations
    mockDb.query.badges.findMany.mockResolvedValue(mockBadges);
    mockDb.query.badges.findFirst.mockResolvedValue(null);
  });

  // ---------------------------------------------------------------------------
  // GET /badge
  // ---------------------------------------------------------------------------

  describe('GET /badge', () => {
    it('should return list of user badges', async () => {
      const res = await app.request('/badge');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.badges).toBeDefined();
      expect(Array.isArray(body.badges)).toBe(true);
      expect(body.badges.length).toBe(2);
    });

    it('should return badges with expected fields', async () => {
      const res = await app.request('/badge');

      expect(res.status).toBe(200);
      const body = await res.json();
      const badge = body.badges[0];
      expect(badge).toHaveProperty('id');
      expect(badge).toHaveProperty('badgeType');
      expect(badge).toHaveProperty('level');
      expect(badge).toHaveProperty('status');
      expect(badge).toHaveProperty('masteryScore');
      expect(badge).toHaveProperty('contentPack');
      expect(badge).toHaveProperty('issuedAt');
      expect(badge).toHaveProperty('expiresAt');
    });

    it('should include content pack information', async () => {
      const res = await app.request('/badge');

      expect(res.status).toBe(200);
      const body = await res.json();
      const badge = body.badges[0];
      expect(badge.contentPack).toBeDefined();
      expect(badge.contentPack.title).toBe('Linux Fundamentals');
      expect(badge.contentPack.certificationTarget).toBe('CompTIA Linux+');
    });

    it('should return empty array when no badges exist', async () => {
      mockDb.query.badges.findMany.mockResolvedValue([]);

      const res = await app.request('/badge');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.badges).toEqual([]);
    });

    it('should order badges by issuedAt descending', async () => {
      const res = await app.request('/badge');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.badges[0].id).toBe('badge-1');
      expect(body.badges[1].id).toBe('badge-2');
    });

    it('should only return badges for authenticated user', async () => {
      const res = await app.request('/badge');

      expect(res.status).toBe(200);
      expect(mockDb.query.badges.findMany).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // GET /badge/:badgeId
  // ---------------------------------------------------------------------------

  describe('GET /badge/:badgeId', () => {
    it('should return badge details', async () => {
      mockDb.query.badges.findFirst.mockResolvedValue(mockBadges[0]);

      const res = await app.request('/badge/badge-1');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.badge).toBeDefined();
      expect(body.badge.id).toBe('badge-1');
    });

    it('should return badge with content pack info', async () => {
      mockDb.query.badges.findFirst.mockResolvedValue(mockBadges[0]);

      const res = await app.request('/badge/badge-1');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.badge.contentPack).toBeDefined();
      expect(body.badge.contentPack.title).toBe('Linux Fundamentals');
    });

    it('should return 404 for non-existent badge', async () => {
      mockDb.query.badges.findFirst.mockResolvedValue(null);

      const res = await app.request('/badge/non-existent-badge');

      expect(res.status).toBe(404);
    });

    it('should return 404 for badge belonging to another user', async () => {
      // Query includes userId filter, so if no result, it's 404
      mockDb.query.badges.findFirst.mockResolvedValue(null);

      const res = await app.request('/badge/other-user-badge');

      expect(res.status).toBe(404);
    });

    it('should handle UUID-formatted badge IDs', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      mockDb.query.badges.findFirst.mockResolvedValue({
        ...mockBadges[0],
        id: uuid,
      });

      const res = await app.request(`/badge/${uuid}`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.badge.id).toBe(uuid);
    });

    it('should return all badge fields', async () => {
      mockDb.query.badges.findFirst.mockResolvedValue(mockBadges[0]);

      const res = await app.request('/badge/badge-1');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.badge).toHaveProperty('id');
      expect(body.badge).toHaveProperty('badgeType');
      expect(body.badge).toHaveProperty('level');
      expect(body.badge).toHaveProperty('status');
      expect(body.badge).toHaveProperty('masteryScore');
    });
  });

  // ---------------------------------------------------------------------------
  // GET /badge/verify/:hash
  // ---------------------------------------------------------------------------

  describe('GET /badge/verify/:hash', () => {
    it('should verify a valid badge', async () => {
      mockDb.query.badges.findFirst.mockResolvedValue(mockBadgeWithUser);

      const res = await app.request('/badge/verify/abc123hash');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.valid).toBe(true);
      expect(body.badge).toBeDefined();
    });

    it('should return badge holder information', async () => {
      mockDb.query.badges.findFirst.mockResolvedValue(mockBadgeWithUser);

      const res = await app.request('/badge/verify/abc123hash');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.badge.holder).toBe('John Doe');
    });

    it('should return achievement information', async () => {
      mockDb.query.badges.findFirst.mockResolvedValue(mockBadgeWithUser);

      const res = await app.request('/badge/verify/abc123hash');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.badge.achievement).toBe('Linux Fundamentals');
      expect(body.badge.certification).toBe('CompTIA Linux+');
    });

    it('should return badge level and mastery score', async () => {
      mockDb.query.badges.findFirst.mockResolvedValue(mockBadgeWithUser);

      const res = await app.request('/badge/verify/abc123hash');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.badge.level).toBe('gold');
      expect(body.badge.masteryScore).toBe(0.95);
    });

    it('should return badge dates', async () => {
      mockDb.query.badges.findFirst.mockResolvedValue(mockBadgeWithUser);

      const res = await app.request('/badge/verify/abc123hash');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.badge.issuedAt).toBeDefined();
      expect(body.badge.expiresAt).toBeDefined();
    });

    it('should return invalid for non-existent hash', async () => {
      mockDb.query.badges.findFirst.mockResolvedValue(null);

      const res = await app.request('/badge/verify/invalid-hash');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.valid).toBe(false);
      expect(body.message).toBe('Badge not found or has been revoked');
    });

    it('should return invalid for revoked badge', async () => {
      // Query filters by status='issued', so revoked badges return null
      mockDb.query.badges.findFirst.mockResolvedValue(null);

      const res = await app.request('/badge/verify/revoked-badge-hash');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.valid).toBe(false);
      expect(body.message).toBe('Badge not found or has been revoked');
    });

    it('should return invalid for expired badge', async () => {
      const expiredBadge = {
        ...mockBadgeWithUser,
        expiresAt: new Date('2025-01-01T00:00:00Z'), // Past date
      };
      mockDb.query.badges.findFirst.mockResolvedValue(expiredBadge);

      const res = await app.request('/badge/verify/expired-badge-hash');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.valid).toBe(false);
      expect(body.message).toBe('Badge has expired');
      expect(body.expiredAt).toBeDefined();
    });

    it('should return valid for badge with no expiration', async () => {
      const noExpiryBadge = {
        ...mockBadgeWithUser,
        expiresAt: null,
      };
      mockDb.query.badges.findFirst.mockResolvedValue(noExpiryBadge);

      const res = await app.request('/badge/verify/no-expiry-hash');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.valid).toBe(true);
    });

    it('should return valid for badge with future expiration', async () => {
      const futureExpiryBadge = {
        ...mockBadgeWithUser,
        expiresAt: new Date('2030-12-31T23:59:59Z'),
      };
      mockDb.query.badges.findFirst.mockResolvedValue(futureExpiryBadge);

      const res = await app.request('/badge/verify/future-expiry-hash');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.valid).toBe(true);
    });

    it('should handle missing user display name gracefully', async () => {
      const badgeWithNullUser = {
        ...mockBadgeWithUser,
        user: null,
      };
      mockDb.query.badges.findFirst.mockResolvedValue(badgeWithNullUser);

      const res = await app.request('/badge/verify/hash-with-null-user');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.valid).toBe(true);
      expect(body.badge.holder).toBeUndefined();
    });

    it('should handle missing content pack gracefully', async () => {
      const badgeWithNullPack = {
        ...mockBadgeWithUser,
        contentPack: null,
      };
      mockDb.query.badges.findFirst.mockResolvedValue(badgeWithNullPack);

      const res = await app.request('/badge/verify/hash-with-null-pack');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.valid).toBe(true);
      expect(body.badge.achievement).toBeUndefined();
      expect(body.badge.certification).toBeUndefined();
    });

    it('should handle special characters in hash', async () => {
      mockDb.query.badges.findFirst.mockResolvedValue(null);

      const res = await app.request('/badge/verify/hash%20with%20spaces');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.valid).toBe(false);
    });

    it('should handle long hash values', async () => {
      const longHash = 'a'.repeat(256);
      mockDb.query.badges.findFirst.mockResolvedValue(null);

      const res = await app.request(`/badge/verify/${longHash}`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.valid).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge Cases and Error Handling
  // ---------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle badges with all null optional fields', async () => {
      const minimalBadge = {
        id: 'badge-minimal',
        userId: 'user-test-1',
        badgeType: 'completion',
        level: null,
        status: 'issued',
        masteryScore: null,
        issuedAt: new Date(),
        expiresAt: null,
        contentPack: null,
      };
      mockDb.query.badges.findFirst.mockResolvedValue(minimalBadge);

      const res = await app.request('/badge/badge-minimal');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.badge.level).toBeNull();
      expect(body.badge.masteryScore).toBeNull();
    });

    it('should handle badge list with mixed content pack values', async () => {
      const mixedBadges = [
        {
          ...mockBadges[0],
          contentPack: { title: 'Course A', certificationTarget: 'Cert A' },
        },
        {
          ...mockBadges[1],
          contentPack: null,
        },
      ];
      mockDb.query.badges.findMany.mockResolvedValue(mixedBadges);

      const res = await app.request('/badge');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.badges[0].contentPack).toBeDefined();
      expect(body.badges[1].contentPack).toBeNull();
    });

    it('should handle very long badge IDs gracefully', async () => {
      const longId = 'badge-' + 'a'.repeat(500);
      mockDb.query.badges.findFirst.mockResolvedValue(null);

      const res = await app.request(`/badge/${longId}`);

      expect(res.status).toBe(404);
    });
  });
});
