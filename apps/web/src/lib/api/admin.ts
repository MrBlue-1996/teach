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

export const adminApi = {
  /** GET /admin/stats - Platform-wide dashboard statistics */
  getStats: () => api.get<AdminStats>('/admin/stats'),

  /** GET /admin/users - List all users (up to 100) */
  getUsers: () => api.get<{ users: AdminUser[] }>('/admin/users'),
};
