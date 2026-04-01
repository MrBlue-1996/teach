/**
 * Tests for Badges API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { badgesApi, type Badge, type BadgeVerification } from './badges';

// Mock the api client
vi.mock('./client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from './client';

const mockApi = api as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('badgesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockBadge: Badge = {
    id: 'badge-123',
    badgeType: 'completion',
    level: 'L2_EXPLAIN',
    status: 'issued',
    masteryScore: 0.85,
    contentPack: {
      title: 'JavaScript Fundamentals',
      certificationTarget: 'JavaScript Developer',
    },
    issuedAt: '2024-01-15T10:00:00Z',
    expiresAt: '2025-01-15T10:00:00Z',
  };

  const mockBadgesResponse = {
    badges: [mockBadge],
  };

  describe('getAll', () => {
    it('should call GET /badge to list all badges', async () => {
      mockApi.get.mockResolvedValueOnce(mockBadgesResponse);

      const result = await badgesApi.getAll();

      expect(mockApi.get).toHaveBeenCalledWith('/badge');
      expect(result).toEqual(mockBadgesResponse);
    });

    it('should return empty badges array when none exist', async () => {
      mockApi.get.mockResolvedValueOnce({ badges: [] });

      const result = await badgesApi.getAll();

      expect(result.badges).toEqual([]);
    });

    it('should propagate API errors', async () => {
      const error = new Error('Network error');
      mockApi.get.mockRejectedValueOnce(error);

      await expect(badgesApi.getAll()).rejects.toThrow('Network error');
    });
  });

  describe('getEarned', () => {
    it('should call GET /badge (same as getAll, filter client-side)', async () => {
      mockApi.get.mockResolvedValueOnce(mockBadgesResponse);

      const result = await badgesApi.getEarned();

      expect(mockApi.get).toHaveBeenCalledWith('/badge');
      expect(result).toEqual(mockBadgesResponse);
    });
  });

  describe('getAvailable', () => {
    it('should call GET /badge (fallback endpoint)', async () => {
      mockApi.get.mockResolvedValueOnce(mockBadgesResponse);

      const result = await badgesApi.getAvailable();

      expect(mockApi.get).toHaveBeenCalledWith('/badge');
      expect(result).toEqual(mockBadgesResponse);
    });
  });

  describe('getBadge', () => {
    it('should call GET /badge/:badgeId with correct ID', async () => {
      mockApi.get.mockResolvedValueOnce({ badge: mockBadge });

      const result = await badgesApi.getBadge('badge-123');

      expect(mockApi.get).toHaveBeenCalledWith('/badge/badge-123');
      expect(result.badge).toEqual(mockBadge);
    });

    it('should handle non-existent badge', async () => {
      const error = new Error('Badge not found');
      mockApi.get.mockRejectedValueOnce(error);

      await expect(badgesApi.getBadge('non-existent')).rejects.toThrow('Badge not found');
    });
  });

  describe('verify', () => {
    it('should call GET /badge/verify/:hash for valid badge', async () => {
      const verificationResponse: BadgeVerification = {
        valid: true,
        badge: {
          holder: 'John Doe',
          achievement: 'JavaScript Fundamentals',
          certification: 'JavaScript Developer',
          level: 'L2_EXPLAIN',
          masteryScore: 0.85,
          issuedAt: '2024-01-15T10:00:00Z',
          expiresAt: '2025-01-15T10:00:00Z',
        },
      };
      mockApi.get.mockResolvedValueOnce(verificationResponse);

      const result = await badgesApi.verify('abc123hash');

      expect(mockApi.get).toHaveBeenCalledWith('/badge/verify/abc123hash');
      expect(result.valid).toBe(true);
      expect(result.badge?.holder).toBe('John Doe');
    });

    it('should handle invalid badge hash', async () => {
      const verificationResponse: BadgeVerification = {
        valid: false,
        message: 'Invalid badge hash',
      };
      mockApi.get.mockResolvedValueOnce(verificationResponse);

      const result = await badgesApi.verify('invalid-hash');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Invalid badge hash');
    });

    it('should handle expired badge', async () => {
      const verificationResponse: BadgeVerification = {
        valid: false,
        message: 'Badge has expired',
        expiredAt: '2023-01-15T10:00:00Z',
      };
      mockApi.get.mockResolvedValueOnce(verificationResponse);

      const result = await badgesApi.verify('expired-badge-hash');

      expect(result.valid).toBe(false);
      expect(result.expiredAt).toBe('2023-01-15T10:00:00Z');
    });
  });

  describe('share', () => {
    it('should call POST /badge/:badgeId/share', async () => {
      const shareResponse = { shareUrl: 'https://example.com/badge/share/xyz' };
      mockApi.post.mockResolvedValueOnce(shareResponse);

      const result = await badgesApi.share('badge-123');

      expect(mockApi.post).toHaveBeenCalledWith('/badge/badge-123/share');
      expect(result.shareUrl).toBe('https://example.com/badge/share/xyz');
    });

    it('should propagate errors when sharing fails', async () => {
      const error = new Error('Unauthorized');
      mockApi.post.mockRejectedValueOnce(error);

      await expect(badgesApi.share('badge-123')).rejects.toThrow('Unauthorized');
    });
  });
});
