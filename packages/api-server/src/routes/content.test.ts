/**
 * TopShelf API Server - Content Routes Test Suite
 *
 * Tests for content routes: list packs, get pack by ID.
 * Uses Hono's app.request() for HTTP-level testing without a running server.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createContentRoutes } from './content.js';
import { errorHandler } from '../middleware/error-handler.js';

// =============================================================================
// MOCKS
// =============================================================================

const mockPacks = [
  {
    id: 'pack-linux-v1',
    slug: 'linux-fundamentals',
    version: '1.0.0',
    title: 'Linux Fundamentals',
    description: 'Core Linux skills',
    certificationTarget: 'CompTIA Linux+',
    status: 'published',
    publishedAt: '2026-01-15T00:00:00Z',
    blocks: [
      {
        id: 'block-1',
        blockId: 'tb-linux-user-001',
        title: 'Creating Users',
        objective: 'Learn user creation',
        targetMode: 'L0',
        timeBudgetSeconds: 300,
        sequenceOrder: 1,
      },
    ],
  },
];

const mockDb = {
  query: {
    contentPacks: {
      findMany: vi.fn().mockResolvedValue(mockPacks),
      findFirst: vi.fn().mockResolvedValue(mockPacks[0]),
    },
    contentBlocks: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'block-1',
        blockId: 'tb-linux-user-001',
        title: 'Creating Users',
        objective: 'Learn user creation',
        targetMode: 'L0',
        timeBudgetSeconds: 300,
        content: { text: 'content' },
        hints: ['hint 1'],
        variants: [],
        pack: { id: 'pack-linux-v1', title: 'Linux Fundamentals', status: 'published' },
      }),
    },
    learnerStates: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
};

vi.mock('@topshelf/database', () => ({
  getDatabase: () => mockDb,
  contentPacks: {
    id: 'id',
    status: 'status',
    certificationTarget: 'certificationTarget',
    publishedAt: 'publishedAt',
  },
  contentBlocks: { packId: 'packId', blockId: 'blockId', sequenceOrder: 'sequenceOrder' },
  learnerStates: { userId: 'userId', contentPackId: 'contentPackId' },
  eq: (...args: unknown[]) => args,
  and: (...args: unknown[]) => args,
  desc: (field: unknown) => field,
  asc: (field: unknown) => field,
}));

vi.mock('@topshelf/config', () => ({
  getConfig: () => ({
    environment: 'development',
  }),
}));

vi.mock('../middleware/auth.js', () => ({
  requireRole: () => {
    const { createMiddleware } = require('hono/factory');
    return createMiddleware(async (_c: any, next: any) => {
      await next();
    });
  },
}));

// =============================================================================
// TESTS
// =============================================================================

describe('Content Routes', () => {
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

    app.route('/content', createContentRoutes());

    // Re-apply default mock values
    mockDb.query.contentPacks.findMany.mockResolvedValue(mockPacks);
    mockDb.query.contentPacks.findFirst.mockResolvedValue(mockPacks[0]);
    mockDb.query.learnerStates.findFirst.mockResolvedValue(null);
  });

  // ---------------------------------------------------------------------------
  // GET /content/packs
  // ---------------------------------------------------------------------------

  describe('GET /content/packs', () => {
    it('should list available content packs', async () => {
      const res = await app.request('/content/packs');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.packs).toBeDefined();
      expect(Array.isArray(body.packs)).toBe(true);
      expect(body.pagination).toBeDefined();
    });

    it('should include pagination info', async () => {
      const res = await app.request('/content/packs?limit=10&offset=0');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination.limit).toBe(10);
      expect(body.pagination.offset).toBe(0);
    });

    it('should filter by status', async () => {
      mockDb.query.contentPacks.findMany.mockResolvedValue([]);

      const res = await app.request('/content/packs?status=draft');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.packs).toEqual([]);
    });

    it('should reject invalid status value', async () => {
      const res = await app.request('/content/packs?status=invalid_status');

      expect(res.status).toBe(400);
    });

    it('should apply default limit and offset', async () => {
      const res = await app.request('/content/packs');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination.limit).toBe(20);
      expect(body.pagination.offset).toBe(0);
    });

    it('should reject limit above maximum', async () => {
      const res = await app.request('/content/packs?limit=500');

      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /content/packs/:packId
  // ---------------------------------------------------------------------------

  describe('GET /content/packs/:packId', () => {
    it('should return pack details', async () => {
      const res = await app.request('/content/packs/pack-linux-v1');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pack).toBeDefined();
      expect(body.pack.id).toBe('pack-linux-v1');
    });

    it('should return null learner progress when none exists', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(null);

      const res = await app.request('/content/packs/pack-linux-v1');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.learnerProgress).toBeNull();
    });

    it('should return learner progress when it exists', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue({
        currentMode: 'L2',
        blocksCompleted: 3,
        overallMastery: 0.65,
        currentBlockId: 'tb-linux-perms-001',
      });

      const res = await app.request('/content/packs/pack-linux-v1');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.learnerProgress).toBeDefined();
      expect(body.learnerProgress.currentMode).toBe('L2');
      expect(body.learnerProgress.blocksCompleted).toBe(3);
    });

    it('should return 404 for non-existent pack', async () => {
      mockDb.query.contentPacks.findFirst.mockResolvedValue(null);

      const res = await app.request('/content/packs/pack-nonexistent');

      expect(res.status).toBe(404);
    });
  });
});
