/**
 * TopShelf API Server - Admin Routes Test Suite
 *
 * Tests for admin routes: stats, users, organizations, content packs.
 * Uses Hono's app.request() for HTTP-level testing without a running server.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { createAdminRoutes } from './admin.js';
import { errorHandler } from '../middleware/error-handler.js';

// =============================================================================
// MOCKS
// =============================================================================

const mockUsers = [
  {
    id: 'user-1',
    email: 'admin@example.com',
    displayName: 'Admin User',
    role: 'system_admin',
    isActive: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
  },
  {
    id: 'user-2',
    email: 'learner@example.com',
    displayName: 'Learner User',
    role: 'learner',
    isActive: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
  },
];

const mockOrganizations = [
  {
    id: 'org-1',
    name: 'Test Organization',
    slug: 'test-org',
    createdAt: new Date(),
  },
];

const mockContentPacks = [
  {
    id: 'pack-1',
    title: 'Linux Fundamentals',
    status: 'published',
    createdAt: new Date(),
    author: { displayName: 'Author User' },
  },
];

const mockDb = {
  query: {
    users: {
      findMany: vi.fn().mockResolvedValue(mockUsers),
      findFirst: vi.fn(),
    },
    organizations: {
      findMany: vi.fn().mockResolvedValue(mockOrganizations),
    },
    contentPacks: {
      findMany: vi.fn().mockResolvedValue(mockContentPacks),
    },
    contentBlocks: {
      findFirst: vi.fn(),
    },
  },
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn(),
      }),
    }),
  }),
};

vi.mock('@topshelf/database', () => ({
  getDatabase: (): typeof mockDb => mockDb,
  users: { id: 'id', email: 'email', createdAt: 'createdAt' },
  organizations: { id: 'id', createdAt: 'createdAt' },
  contentPacks: { id: 'id', status: 'status', createdAt: 'createdAt' },
  contentBlocks: { id: 'id', sequenceOrder: 'sequenceOrder' },
  learnerStates: { userId: 'userId' },
  eq: (...args: unknown[]): unknown[] => args,
  asc: (field: unknown): unknown => field,
  desc: (field: unknown): unknown => field,
  isNull: (field: unknown): unknown => field,
  sql: (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): { strings: TemplateStringsArray; values: unknown[] } => ({ strings, values }),
}));

vi.mock('@topshelf/config', () => ({
  getConfig: (): { environment: string } => ({
    environment: 'development',
  }),
}));

vi.mock('../middleware/auth.js', () => ({
  requireRole: (..._roles: string[]): ReturnType<typeof createMiddleware> =>
    createMiddleware(async (c, next): Promise<void> => {
      // Check if role is set (for unauthorized tests)
      const role = c.get('userRole');
      if (role === undefined || role === null || role === '') {
        throw new Error('Authentication required');
      }
      await next();
    }),
}));

// =============================================================================
// TESTS
// =============================================================================

describe('Admin Routes', () => {
  let app: Hono;

  const createAppWithRole = (role: string): Hono => {
    const testApp = new Hono();
    testApp.onError(errorHandler);
    testApp.use('*', async (c, next) => {
      c.set('userId' as any, 'user-test-1');
      c.set('userRole' as any, role);
      await next();
    });
    testApp.route('/admin', createAdminRoutes());
    return testApp;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    app = createAppWithRole('system_admin');

    // Reset mock implementations
    mockDb.query.users.findMany.mockResolvedValue(mockUsers);
    mockDb.query.users.findFirst.mockResolvedValue(null);
    mockDb.query.organizations.findMany.mockResolvedValue(mockOrganizations);
    mockDb.query.contentPacks.findMany.mockResolvedValue(mockContentPacks);
    mockDb.query.contentBlocks.findFirst.mockResolvedValue(null);

    // Setup select chain for stats
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue([{ count: 10 }]),
    });
  });

  // ---------------------------------------------------------------------------
  // GET /admin/stats
  // ---------------------------------------------------------------------------

  describe('GET /admin/stats', () => {
    beforeEach(() => {
      // Mock the select chain for each query
      let callCount = 0;
      mockDb.select.mockReturnValue({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation((): Array<{ count: number }> => [{ count: 5 }]),
          // Direct return for queries without where
          then: (resolve: (v: unknown) => void): void => resolve([{ count: callCount++ * 5 + 10 }]),
          [Symbol.iterator]: function* (): Generator<{ count: number }, void, undefined> {
            yield { count: 10 };
          },
        })),
      });
    });

    it('should return dashboard statistics for admin user', async () => {
      const res = await app.request('/admin/stats');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.stats).toBeDefined();
      expect(body.generatedAt).toBeDefined();
    });

    it('should include all required stat fields', async () => {
      const res = await app.request('/admin/stats');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.stats).toHaveProperty('totalUsers');
      expect(body.stats).toHaveProperty('totalOrganizations');
      expect(body.stats).toHaveProperty('publishedContentPacks');
      expect(body.stats).toHaveProperty('activeLearners');
    });

    it('should return stats for school_admin role', async () => {
      const schoolAdminApp = createAppWithRole('school_admin');
      const res = await schoolAdminApp.request('/admin/stats');

      expect(res.status).toBe(200);
    });

    it('should return stats for district_admin role', async () => {
      const districtAdminApp = createAppWithRole('district_admin');
      const res = await districtAdminApp.request('/admin/stats');

      expect(res.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /admin/users
  // ---------------------------------------------------------------------------

  describe('GET /admin/users', () => {
    it('should return list of users', async () => {
      const res = await app.request('/admin/users');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.users).toBeDefined();
      expect(Array.isArray(body.users)).toBe(true);
    });

    it('should not expose password hashes in user list', async () => {
      const res = await app.request('/admin/users');

      expect(res.status).toBe(200);
      const body = await res.json();
      body.users.forEach((user: any) => {
        expect(user.passwordHash).toBeUndefined();
      });
    });

    it('should return users with expected fields', async () => {
      const res = await app.request('/admin/users');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.users.length).toBeGreaterThan(0);
      const user = body.users[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('role');
    });
  });

  // ---------------------------------------------------------------------------
  // GET /admin/users/:userId
  // ---------------------------------------------------------------------------

  describe('GET /admin/users/:userId', () => {
    it('should return user details', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'admin@example.com',
        displayName: 'Admin User',
        role: 'system_admin',
        organization: null,
        learnerStates: [],
      });

      const res = await app.request('/admin/users/user-1');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user).toBeDefined();
      expect(body.user.id).toBe('user-1');
    });

    it('should not expose password hash in user details', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'admin@example.com',
        passwordHash: 'secret-hash',
        displayName: 'Admin User',
        role: 'system_admin',
        organization: null,
        learnerStates: [],
      });

      const res = await app.request('/admin/users/user-1');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.passwordHash).toBeUndefined();
    });

    it('should return 404 for non-existent user', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null);

      const res = await app.request('/admin/users/non-existent-id');

      expect(res.status).toBe(404);
    });

    it('should include learner states with content pack info', async () => {
      mockDb.query.users.findFirst.mockResolvedValue({
        id: 'user-2',
        email: 'learner@example.com',
        displayName: 'Learner User',
        role: 'learner',
        organization: { id: 'org-1', name: 'Test Org' },
        learnerStates: [
          {
            id: 'state-1',
            contentPack: { title: 'Linux Fundamentals' },
          },
        ],
      });

      const res = await app.request('/admin/users/user-2');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.learnerStates).toBeDefined();
      expect(Array.isArray(body.user.learnerStates)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /admin/users/:userId
  // ---------------------------------------------------------------------------

  describe('PATCH /admin/users/:userId', () => {
    it('should update user isActive status', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 'user-2',
                email: 'learner@example.com',
                role: 'learner',
                isActive: false,
              },
            ]),
          }),
        }),
      });

      const res = await app.request('/admin/users/user-2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe('User updated successfully');
      expect(body.user.isActive).toBe(false);
    });

    it('should allow system admin to change user role', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 'user-2',
                email: 'learner@example.com',
                role: 'instructor',
                isActive: true,
              },
            ]),
          }),
        }),
      });

      const res = await app.request('/admin/users/user-2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'instructor' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.role).toBe('instructor');
    });

    it('should reject role change from non-system admin', async () => {
      const schoolAdminApp = createAppWithRole('school_admin');

      const res = await schoolAdminApp.request('/admin/users/user-2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'instructor' }),
      });

      expect(res.status).toBe(403);
    });

    it('should return 404 when updating non-existent user', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const res = await app.request('/admin/users/non-existent-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      });

      expect(res.status).toBe(404);
    });

    it('should reject invalid role value', async () => {
      const res = await app.request('/admin/users/user-2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'invalid_role' }),
      });

      expect(res.status).toBe(400);
    });

    it('should allow updating with empty body (no changes)', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 'user-2',
                email: 'learner@example.com',
                role: 'learner',
                isActive: true,
              },
            ]),
          }),
        }),
      });

      const res = await app.request('/admin/users/user-2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /admin/organizations
  // ---------------------------------------------------------------------------

  describe('GET /admin/organizations', () => {
    it('should return list of organizations', async () => {
      const res = await app.request('/admin/organizations');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.organizations).toBeDefined();
      expect(Array.isArray(body.organizations)).toBe(true);
    });

    it('should return organizations with expected fields', async () => {
      const res = await app.request('/admin/organizations');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.organizations.length).toBeGreaterThan(0);
      const org = body.organizations[0];
      expect(org).toHaveProperty('id');
      expect(org).toHaveProperty('name');
    });

    it('should return empty array when no organizations exist', async () => {
      mockDb.query.organizations.findMany.mockResolvedValue([]);

      const res = await app.request('/admin/organizations');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.organizations).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /admin/content-packs
  // ---------------------------------------------------------------------------

  describe('GET /admin/content-packs', () => {
    it('should return list of content packs', async () => {
      const res = await app.request('/admin/content-packs');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.contentPacks).toBeDefined();
      expect(Array.isArray(body.contentPacks)).toBe(true);
    });

    it('should include author information', async () => {
      const res = await app.request('/admin/content-packs');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.contentPacks.length).toBeGreaterThan(0);
      const pack = body.contentPacks[0];
      expect(pack.author).toBeDefined();
      expect(pack.author.displayName).toBe('Author User');
    });

    it('should return empty array when no content packs exist', async () => {
      mockDb.query.contentPacks.findMany.mockResolvedValue([]);

      const res = await app.request('/admin/content-packs');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.contentPacks).toEqual([]);
    });
  });

  describe('PATCH /admin/content-packs/:packId', () => {
    it('should reject content pack updates from non-system admins', async () => {
      const schoolAdminApp = createAppWithRole('school_admin');

      const res = await schoolAdminApp.request('/admin/content-packs/pack-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /admin/content-packs/:packId/blocks/:blockId', () => {
    it('should reject block updates from non-system admins', async () => {
      const schoolAdminApp = createAppWithRole('school_admin');

      const res = await schoolAdminApp.request('/admin/content-packs/pack-1/blocks/block-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Block' }),
      });

      expect(res.status).toBe(403);
    });
  });
});
