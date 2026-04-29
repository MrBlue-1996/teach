import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { createManagerRoutes } from './manager.js';
import { errorHandler } from '../middleware/error-handler.js';

const mockDb = {
  query: {
    users: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
  insert: vi.fn(),
  update: vi.fn(),
};

vi.mock(
  '@topshelf/database',
  (): Record<string, unknown> => ({
    getDatabase: (): typeof mockDb => mockDb,
    users: {
      id: 'id',
      email: 'email',
      role: 'role',
      managerId: 'managerId',
      organizationId: 'organizationId',
      deletedAt: 'deletedAt',
      firstName: 'firstName',
      lastName: 'lastName',
      displayName: 'displayName',
      isActive: 'isActive',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      passwordHash: 'passwordHash',
      lastLoginAt: 'lastLoginAt',
      emailVerified: 'emailVerified',
    },
    eq: (...args: unknown[]): unknown[] => args,
    and: (...args: unknown[]): unknown[] => args,
    inArray: (...args: unknown[]): unknown[] => args,
    isNull: (value: unknown): unknown => value,
  })
);

vi.mock(
  '@topshelf/auth',
  (): Record<string, unknown> => ({
    hashPassword: vi.fn().mockResolvedValue('hashed-password'),
    validatePasswordStrength: vi.fn().mockReturnValue({ valid: true, errors: [] }),
  })
);

vi.mock(
  '@topshelf/config',
  (): Record<string, unknown> => ({
    getConfig: () => ({
      environment: 'development',
    }),
  })
);

vi.mock(
  '../middleware/auth.js',
  (): Record<string, unknown> => ({
    requireRole: (..._roles: string[]) =>
      createMiddleware(async (c, next): Promise<void> => {
        if (c.get('userRole') === undefined) {
          throw new Error('Authentication required');
        }
        await next();
      }),
  })
);

vi.mock(
  '../lib/audit.js',
  (): Record<string, unknown> => ({
    insertAuditLog: vi.fn().mockResolvedValue(undefined),
  })
);

function createAppWithRole(role: string, userId: string = 'actor-1'): Hono {
  const app = new Hono();
  app.onError(errorHandler);
  app.use('*', async (c, next) => {
    c.set('userId' as never, userId);
    c.set('userRole' as never, role);
    await next();
  });
  app.route('/manager', createManagerRoutes());
  return app;
}

describe('Manager Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(),
      }),
    });

    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn(),
        }),
      }),
    });
  });

  it('lists scoped team members with progress metrics', async () => {
    const app = createAppWithRole('manager');

    mockDb.query.users.findFirst.mockResolvedValueOnce({
      id: 'actor-1',
      email: 'manager@example.com',
      role: 'manager',
      organizationId: 'org-1',
    });

    mockDb.query.users.findMany.mockResolvedValueOnce([
      {
        id: 'staff-1',
        email: 'staff@example.com',
        firstName: 'Pat',
        lastName: 'Doe',
        displayName: 'Pat Doe',
        role: 'staff',
        organizationId: 'org-1',
        managerId: 'actor-1',
        isActive: true,
        lastLoginAt: new Date('2026-04-28T12:00:00.000Z'),
        createdAt: new Date('2026-04-01T12:00:00.000Z'),
        manager: {
          id: 'actor-1',
          email: 'manager@example.com',
          displayName: 'Manager Person',
        },
        learnerStates: [
          {
            currentMode: 'L3_APPLY',
            overallMastery: 0.75,
            totalTimeSpentSeconds: 3600,
            blocksCompleted: 12,
            lastActivityAt: new Date('2026-04-28T10:00:00.000Z'),
          },
        ],
        badges: [{ status: 'issued' }, { status: 'pending' }],
      },
    ]);

    const response = await app.request('/manager/team-members');
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.teamMembers).toHaveLength(1);
    expect(body.teamMembers[0]).toMatchObject({
      id: 'staff-1',
      role: 'staff',
      badgeCount: 1,
      blocksCompleted: 12,
      totalTimeSpentSeconds: 3600,
      currentMode: 'L3_APPLY',
    });
  });

  it('allows a manager to create staff accounts', async () => {
    const app = createAppWithRole('manager');

    mockDb.query.users.findFirst
      .mockResolvedValueOnce({
        id: 'actor-1',
        email: 'manager@example.com',
        role: 'manager',
        organizationId: 'org-1',
      })
      .mockResolvedValueOnce(null);

    const returning = vi.fn().mockResolvedValue([
      {
        id: 'staff-1',
        email: 'staff@example.com',
        role: 'staff',
        managerId: 'actor-1',
        organizationId: 'org-1',
      },
    ]);
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({ returning }),
    });

    const response = await app.request('/manager/team-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'staff@example.com',
        password: 'StrongPass1!',
        firstName: 'Pat',
        lastName: 'Doe',
        role: 'staff',
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.user.role).toBe('staff');
    expect(body.user.managerId).toBe('actor-1');
  });

  it('blocks a manager from creating other managers', async () => {
    const app = createAppWithRole('manager');

    mockDb.query.users.findFirst.mockResolvedValueOnce({
      id: 'actor-1',
      email: 'manager@example.com',
      role: 'manager',
      organizationId: 'org-1',
    });

    const response = await app.request('/manager/team-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'new-manager@example.com',
        password: 'StrongPass1!',
        role: 'manager',
      }),
    });

    expect(response.status).toBe(403);
  });

  it('allows org admins to create manager accounts', async () => {
    const app = createAppWithRole('school_admin');

    mockDb.query.users.findFirst
      .mockResolvedValueOnce({
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'school_admin',
        organizationId: 'org-1',
      })
      .mockResolvedValueOnce(null);

    const returning = vi.fn().mockResolvedValue([
      {
        id: 'manager-1',
        email: 'manager@example.com',
        role: 'manager',
        managerId: null,
        organizationId: 'org-1',
      },
    ]);
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({ returning }),
    });

    const response = await app.request('/manager/team-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'manager@example.com',
        password: 'StrongPass1!',
        role: 'manager',
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.user.role).toBe('manager');
  });

  it('updates a team member inside scope', async () => {
    const app = createAppWithRole('manager');

    mockDb.query.users.findFirst
      .mockResolvedValueOnce({
        id: 'actor-1',
        email: 'manager@example.com',
        role: 'manager',
        organizationId: 'org-1',
      })
      .mockResolvedValueOnce({
        id: 'staff-1',
        email: 'staff@example.com',
        role: 'staff',
        organizationId: 'org-1',
        managerId: 'actor-1',
        firstName: 'Pat',
        lastName: 'Doe',
        displayName: 'Pat Doe',
      });

    const returning = vi.fn().mockResolvedValue([
      {
        id: 'staff-1',
        email: 'staff@example.com',
        role: 'staff',
        isActive: false,
        managerId: 'actor-1',
        organizationId: 'org-1',
      },
    ]);
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning }),
      }),
    });

    const response = await app.request('/manager/team-members/staff-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user.isActive).toBe(false);
  });

  it('deactivates a direct report', async () => {
    const app = createAppWithRole('manager');

    mockDb.query.users.findFirst
      .mockResolvedValueOnce({
        id: 'actor-1',
        email: 'manager@example.com',
        role: 'manager',
        organizationId: 'org-1',
      })
      .mockResolvedValueOnce({
        id: 'staff-1',
        role: 'staff',
      });

    const returning = vi.fn().mockResolvedValue([{ id: 'staff-1' }]);
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning }),
      }),
    });

    const response = await app.request('/manager/team-members/staff-1', {
      method: 'DELETE',
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain('deactivated');
  });
});
