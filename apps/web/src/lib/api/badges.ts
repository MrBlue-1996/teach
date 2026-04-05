/**
 * TopShelf Teaching - Badges API
 * Aligned with backend: packages/api-server/src/routes/badge.ts
 *
 * Backend routes:
 *   GET /badge         - List user's badges (all of them)
 *   GET /badge/:badgeId - Get badge details
 *   GET /badge/verify/:hash - Verify badge by hash (public)
 *
 * There are NO separate /badge/earned or /badge/available endpoints.
 */

import { api } from './client';

/** Matches backend badge shape from GET /badge */
export interface Badge {
  id: string;
  badgeType: string;
  level: string;
  status: string;
  masteryScore: number;
  contentPack: {
    title: string;
    certificationTarget: string;
  };
  issuedAt: string;
  expiresAt: string | null;
}

/** Matches backend response from GET /badge/verify/:hash */
export interface BadgeVerification {
  valid: boolean;
  message?: string;
  expiredAt?: string;
  badge?: {
    holder: string;
    achievement: string;
    certification: string;
    level: string;
    masteryScore: number;
    issuedAt: string;
    expiresAt: string | null;
  };
}

export const badgesApi = {
  /** GET /badge - List all user's badges */
  getAll: () => api.get<{ badges: Badge[] }>('/badge'),

  /**
   * GET /badge - Backend does not have a separate /badge/earned endpoint.
   * Returns all badges; filter client-side by status === 'issued' if needed.
   * TODO: Backend does not support /badge/earned — using /badge instead
   */
  getEarned: () => api.get<{ badges: Badge[] }>('/badge'),

  /**
   * TODO: Backend does not have /badge/available endpoint.
   * There is no concept of "available" badges on the backend.
   * Using /badge as fallback; consumer should filter as needed.
   */
  getAvailable: () => api.get<{ badges: Badge[] }>('/badge'),

  /** GET /badge/:badgeId - Get badge details */
  getBadge: (badgeId: string) => api.get<{ badge: Badge }>(`/badge/${badgeId}`),

  /** GET /badge/verify/:hash - Verify badge by hash (public) */
  verify: (hash: string) => api.get<BadgeVerification>(`/badge/verify/${hash}`),

  // TODO: Backend does not have a /badge/:badgeId/share endpoint
  share: (badgeId: string) => api.post<{ shareUrl: string }>(`/badge/${badgeId}/share`),
};
