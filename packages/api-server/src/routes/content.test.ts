/**
 * TopShelf API Server - Content Routes Test Suite
 *
 * Tests for content routes: list packs, get pack by ID.
 * Uses Hono's app.request() for HTTP-level testing without a running server.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
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
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([
        {
          id: 'new-pack-1',
          slug: 'new-pack',
          version: '1.0.0',
          title: 'New Pack',
          description: null,
          certificationTarget: null,
          authorId: 'user-test-1',
          status: 'draft',
          metadata: {},
          createdAt: '2026-04-22T00:00:00Z',
          updatedAt: '2026-04-22T00:00:00Z',
        },
      ]),
    }),
  }),
};

vi.mock('@topshelf/database', () => ({
  getDatabase: (): typeof mockDb => mockDb,
  contentPacks: {
    id: 'id',
    slug: 'slug',
    version: 'version',
    status: 'status',
    certificationTarget: 'certificationTarget',
    publishedAt: 'publishedAt',
  },
  contentBlocks: { packId: 'packId', blockId: 'blockId', sequenceOrder: 'sequenceOrder' },
  learnerStates: { userId: 'userId', contentPackId: 'contentPackId' },
  eq: (...args: unknown[]): unknown[] => args,
  and: (...args: unknown[]): unknown[] => args,
  desc: (field: unknown): unknown => field,
  asc: (field: unknown): unknown => field,
}));

vi.mock('@topshelf/config', () => ({
  getConfig: (): { environment: string } => ({
    environment: 'development',
  }),
}));

vi.mock('../middleware/auth.js', () => ({
  requireRole: (): ReturnType<typeof createMiddleware> =>
    createMiddleware(async (_c, next) => {
      await next();
    }),
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

  // ---------------------------------------------------------------------------
  // POST /content/packs
  // ---------------------------------------------------------------------------

  describe('POST /content/packs', () => {
    const validBody = {
      slug: 'new-pack',
      version: '1.0.0',
      title: 'New Pack',
      description: 'A new content pack',
      certificationTarget: 'CompTIA A+',
    };

    beforeEach(() => {
      // No existing pack by default
      mockDb.query.contentPacks.findFirst.mockResolvedValue(null);
      // Reset insert mock chain
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'new-pack-1',
              slug: 'new-pack',
              version: '1.0.0',
              title: 'New Pack',
              description: 'A new content pack',
              certificationTarget: 'CompTIA A+',
              authorId: 'user-test-1',
              status: 'draft',
              metadata: {},
              createdAt: '2026-04-22T00:00:00Z',
              updatedAt: '2026-04-22T00:00:00Z',
            },
          ]),
        }),
      });
    });

    it('should create a content pack and return 201', async () => {
      const res = await app.request('/content/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBody),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.pack).toBeDefined();
      expect(body.pack.slug).toBe('new-pack');
      expect(body.pack.version).toBe('1.0.0');
    });

    it('should return 409 when slug+version already exists', async () => {
      mockDb.query.contentPacks.findFirst.mockResolvedValue({ id: 'existing-pack' });

      const res = await app.request('/content/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBody),
      });

      expect(res.status).toBe(409);
    });

    it('should return 400 for invalid slug format', async () => {
      const res = await app.request('/content/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validBody, slug: 'INVALID SLUG!' }),
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await app.request('/content/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: 'missing-title', version: '1.0.0' }),
      });

      expect(res.status).toBe(400);
    });
  });
});
