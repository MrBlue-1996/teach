/**
 * TopShelf Teaching - Content API
 * Aligned with backend: packages/api-server/src/routes/content.ts
 *
 * Backend uses "packs" terminology, not "courses".
 * Routes: GET /content/packs, GET /content/packs/:packId,
 *         GET /content/packs/:packId/blocks/:blockId, GET /content/next/:contentPackId
 */

import { api } from './client';

/** Matches backend response shape from GET /content/packs */
export interface ContentPack {
  id: string;
  slug: string;
  version: string;
  title: string;
  description: string;
  certificationTarget: string;
  status: string;
  publishedAt: string;
}

/** Matches backend block shape from GET /content/packs/:packId */
export interface ContentBlockSummary {
  id: string;
  blockId: string;
  title: string;
  objective: string;
  targetMode: string;
  timeBudgetSeconds: number;
  sequenceOrder: number;
}

/** Matches backend response shape from GET /content/packs/:packId */
export interface ContentPackDetail {
  pack: {
    id: string;
    slug: string;
    version: string;
    title: string;
    description: string;
    certificationTarget: string;
    status: string;
    totalBlocks: number;
    blocks: ContentBlockSummary[];
  };
  learnerProgress: {
    currentMode: string;
    blocksCompleted: number;
    overallMastery: number;
    currentBlockId: string;
  } | null;
}

/** Matches backend response shape from GET /content/packs/:packId/blocks/:blockId */
export interface ContentBlockDetail {
  block: {
    id: string;
    blockId: string;
    title: string;
    objective: string;
    targetMode: string;
    timeBudgetSeconds: number;
    content: unknown;
    hints: unknown;
    variants: unknown;
  };
  learnerMode: string;
  pack: {
    id: string;
    title: string;
    status: string;
  };
}

/** Matches backend response from GET /content/next/:contentPackId */
export interface NextBlockResponse {
  complete: boolean;
  message?: string;
  blocksCompleted?: number;
  nextBlock?: {
    id: string;
    blockId: string;
    title: string;
    objective: string;
    targetMode: string;
    sequenceOrder: number;
  };
  progress?: {
    completed: number;
    currentMode: string;
  };
}

/** Backend response for GET /content/packs list */
export interface PacksListResponse {
  packs: ContentPack[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export const contentApi = {
  /** GET /content/packs - List available content packs */
  getPacks: (params?: {
    status?: string;
    certification?: string;
    limit?: string;
    offset?: string;
  }) => api.get<PacksListResponse>('/content/packs', params),

  /** GET /content/packs/:packId - Get content pack details with blocks */
  getPack: (packId: string) => api.get<ContentPackDetail>(`/content/packs/${packId}`),

  /** GET /content/packs/:packId/blocks/:blockId - Get specific block content */
  getBlock: (packId: string, blockId: string) =>
    api.get<ContentBlockDetail>(`/content/packs/${packId}/blocks/${blockId}`),

  /** GET /content/next/:contentPackId - Get next recommended block */
  getNextBlock: (contentPackId: string) =>
    api.get<NextBlockResponse>(`/content/next/${contentPackId}`),

  // --- Legacy aliases for backward compatibility during migration ---

  /** @deprecated Use getPacks instead. Maps to GET /content/packs */
  getCourses: (params?: { category?: string; search?: string }) =>
    api.get<PacksListResponse>('/content/packs', params as Record<string, string> | undefined),

  /** @deprecated Use getPack instead. Maps to GET /content/packs/:packId */
  getCourse: (courseId: string) => api.get<ContentPackDetail>(`/content/packs/${courseId}`),

  /** GET /content/packs/:packId — blocks are included in the pack response */
  getModules: (courseId: string) => api.get<ContentPackDetail>(`/content/packs/${courseId}`),

  /** POST /content/packs/:packId/enroll — begin tracking this pack for the learner */
  enrollInCourse: (courseId: string) =>
    api.post<{ enrolled: boolean }>(`/content/packs/${courseId}/enroll`),

  /** DELETE /content/packs/:packId/enroll — stop tracking this pack */
  unenrollFromCourse: (courseId: string) =>
    api.delete<{ enrolled: boolean }>(`/content/packs/${courseId}/enroll`),

  /** POST /content/packs/:packId/blocks/:blockId/submit — submit a learner answer */
  submitAnswer: (courseId: string, blockId: string, answer: string) =>
    api.post<{
      correct: boolean;
      explanation?: string;
      correctAnswer?: string;
    }>(`/content/packs/${courseId}/blocks/${blockId}/submit`, { answer }),

  /** GET /content/categories — list available certification categories */
  getCategories: () => api.get<string[]>('/content/categories'),
};
