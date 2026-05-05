/**
 * TopShelf Teaching - Admin API
 * Aligned with backend: packages/api-server/src/routes/admin.ts
 *
 * All endpoints require admin role (school_admin, district_admin, system_admin).
 * Requests from non-admin users will receive 403 Forbidden.
 */

import { api } from './client';

/** Matches backend response from GET /admin/stats */
export interface AdminStats {
  stats: {
    totalUsers: number;
    totalOrganizations: number;
    publishedContentPacks: number;
    activeLearners: number;
  };
  generatedAt: string;
}

/** Matches backend user shape from GET /admin/users */
export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

/** Content pack shape from GET /admin/content-packs */
export interface AdminContentPack {
  id: string;
  slug: string;
  version: string;
  title: string;
  description: string | null;
  certificationTarget: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** Content block shape from GET /admin/content-packs/:packId */
export interface AdminContentBlock {
  id: string;
  blockId: string;
  packId: string;
  title: string;
  objective: string | null;
  targetMode: string;
  timeBudgetSeconds: number | null;
  content: unknown;
  hints: unknown[];
  sequenceOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPackDetail extends AdminContentPack {
  blocks: AdminContentBlock[];
}

export interface UpdatePackRequest {
  title?: string;
  description?: string;
  status?: 'draft' | 'published' | 'archived';
  certificationTarget?: string;
}

export interface UpdateBlockRequest {
  title?: string;
  objective?: string;
  content?: unknown;
  hints?: unknown[];
  timeBudgetSeconds?: number;
}

export const adminApi = {
  /** GET /admin/stats - Platform-wide dashboard statistics */
  getStats: () => api.get<AdminStats>('/admin/stats'),

  /** GET /admin/users - List all users (up to 100) */
  getUsers: () => api.get<{ users: AdminUser[] }>('/admin/users'),

  /** PATCH /admin/users/:userId - Update user role or active status */
  updateUser: (userId: string, updates: { role?: string; isActive?: boolean }) =>
    api.patch<{ message: string; user: AdminUser }>(`/admin/users/${userId}`, updates),

  /** GET /admin/content-packs - List all packs (all statuses) */
  getContentPacks: () => api.get<{ contentPacks: AdminContentPack[] }>('/admin/content-packs'),

  /** GET /admin/content-packs/:packId - Full pack with blocks */
  getContentPack: (packId: string) =>
    api.get<{ pack: AdminPackDetail }>(`/admin/content-packs/${packId}`),

  /** PATCH /admin/content-packs/:packId - Update pack metadata */
  updateContentPack: (packId: string, updates: UpdatePackRequest) =>
    api.patch<{ message: string; pack: AdminContentPack }>(
      `/admin/content-packs/${packId}`,
      updates
    ),

  /** PATCH /admin/content-packs/:packId/blocks/:contentBlockId - Update a block */
  updateBlock: (packId: string, contentBlockId: string, updates: UpdateBlockRequest) =>
    api.patch<{ message: string; block: AdminContentBlock }>(
      `/admin/content-packs/${packId}/blocks/${contentBlockId}`,
      updates
    ),
};
