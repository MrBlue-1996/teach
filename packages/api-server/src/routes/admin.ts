/**
 * TopShelf Service LLC - Admin Routes
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import {
  getDatabase,
  users,
  organizations,
  contentPacks,
  contentBlocks,
  learnerStates,
  eq,
  asc,
  desc,
  sql,
} from '@topshelf/database';
import { requireRole } from '../middleware/auth.js';
import { notFound, forbidden } from '../middleware/error-handler.js';

export function createAdminRoutes(): Hono {
  const router = new Hono();

  // All admin routes require admin role
  router.use('*', requireRole('school_admin', 'district_admin', 'system_admin'));

  const assertSystemAdmin = (role: string): void => {
    if (role !== 'system_admin') {
      throw forbidden('Only system admins can modify content packs');
    }
  };

  // ---------------------------------------------------------------------------
  // GET /admin/stats - Dashboard statistics
  // ---------------------------------------------------------------------------
  router.get('/stats', async (c) => {
    const db = getDatabase();

    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);

    const [orgCount] = await db.select({ count: sql<number>`count(*)` }).from(organizations);

    const [packCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(contentPacks)
      .where(eq(contentPacks.status, 'published'));

    const [activeLearnersCount] = await db
      .select({ count: sql<number>`count(distinct ${learnerStates.userId})` })
      .from(learnerStates);

    return c.json({
      stats: {
        totalUsers: userCount?.count ?? 0,
        totalOrganizations: orgCount?.count ?? 0,
        publishedContentPacks: packCount?.count ?? 0,
        activeLearners: activeLearnersCount?.count ?? 0,
      },
      generatedAt: new Date().toISOString(),
    });
  });

  // ---------------------------------------------------------------------------
  // GET /admin/users - List users
  // ---------------------------------------------------------------------------
  router.get('/users', async (c) => {
    const currentUserId = c.get('userId');
    const currentUserRole = c.get('userRole');
    const db = getDatabase();

    // System admins see all users; school/district admins see only their org
    let orgFilter: ReturnType<typeof eq> | undefined;
    if (currentUserRole !== 'system_admin') {
      const self = await db.query.users.findFirst({
        where: eq(users.id, currentUserId),
        columns: { organizationId: true },
      });
      if (self?.organizationId !== null && self?.organizationId !== undefined) {
        orgFilter = eq(users.organizationId, self.organizationId);
      } else {
        // No org assigned — return empty list rather than leaking all users
        return c.json({ users: [] });
      }
    }

    const usersList = await db.query.users.findMany({
      where: orgFilter,
      columns: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: [desc(users.createdAt)],
      limit: 100,
    });

    return c.json({ users: usersList });
  });

  // ---------------------------------------------------------------------------
  // GET /admin/users/:userId - Get user details
  // ---------------------------------------------------------------------------
  router.get('/users/:userId', async (c) => {
    const userId = c.req.param('userId');
    const db = getDatabase();

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        organization: true,
        learnerStates: {
          with: {
            contentPack: {
              columns: { title: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw notFound('User', userId);
    }

    return c.json({
      user: {
        ...user,
        passwordHash: undefined, // Never expose password hash
      },
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /admin/users/:userId - Update user
  // ---------------------------------------------------------------------------
  router.patch(
    '/users/:userId',
    zValidator(
      'json',
      z.object({
        isActive: z.boolean().optional(),
        role: z
          .enum([
            'learner',
            'staff',
            'manager',
            'instructor',
            'content_author',
            'school_admin',
            'district_admin',
            'system_admin',
          ])
          .optional(),
      })
    ),
    async (c) => {
      const userId = c.req.param('userId');
      const updates = c.req.valid('json');
      const currentUserRole = c.get('userRole');
      const db = getDatabase();

      // Only system admins can change roles
      if (updates.role !== undefined && currentUserRole !== 'system_admin') {
        throw forbidden('Only system admins can change user roles');
      }

      const [updated] = await db
        .update(users)
        .set({
          ...(updates.role !== undefined ? { role: updates.role } : {}),
          ...(updates.isActive !== undefined ? { isActive: updates.isActive } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updated) {
        throw notFound('User', userId);
      }

      return c.json({
        message: 'User updated successfully',
        user: {
          id: updated.id,
          email: updated.email,
          role: updated.role,
          isActive: updated.isActive,
        },
      });
    }
  );

  // ---------------------------------------------------------------------------
  // GET /admin/organizations - List organizations
  // ---------------------------------------------------------------------------
  router.get('/organizations', async (c) => {
    const db = getDatabase();

    const orgs = await db.query.organizations.findMany({
      orderBy: [desc(organizations.createdAt)],
    });

    return c.json({ organizations: orgs });
  });

  // ---------------------------------------------------------------------------
  // GET /admin/content-packs - List all content packs
  // ---------------------------------------------------------------------------
  router.get('/content-packs', async (c) => {
    const currentUserId = c.get('userId');
    const currentUserRole = c.get('userRole');
    const db = getDatabase();

    // System admins see all packs; others see only their org's packs
    let packFilter: ReturnType<typeof eq> | undefined;
    if (currentUserRole !== 'system_admin') {
      const self = await db.query.users.findFirst({
        where: eq(users.id, currentUserId),
        columns: { organizationId: true },
      });
      if (self?.organizationId !== null && self?.organizationId !== undefined) {
        packFilter = eq(contentPacks.organizationId, self.organizationId);
      } else {
        // No org assigned — return empty list rather than leaking global packs
        return c.json({ contentPacks: [] });
      }
    }

    const packs = await db.query.contentPacks.findMany({
      where: packFilter,
      orderBy: [desc(contentPacks.createdAt)],
      with: {
        author: {
          columns: { displayName: true },
        },
      },
    });

    return c.json({ contentPacks: packs });
  });

  // ---------------------------------------------------------------------------
  // GET /admin/content-packs/:packId - Get full pack with all blocks for editing
  // ---------------------------------------------------------------------------
  router.get('/content-packs/:packId', async (c) => {
    const packId = c.req.param('packId');
    const currentUserId = c.get('userId');
    const currentUserRole = c.get('userRole');
    const db = getDatabase();

    const pack = await db.query.contentPacks.findFirst({
      where: eq(contentPacks.id, packId),
      with: {
        blocks: {
          orderBy: [asc(contentBlocks.sequenceOrder)],
        },
      },
    });

    if (!pack) {
      throw notFound('ContentPack', packId);
    }

    // Non-system admins can only access packs belonging to their organization
    if (currentUserRole !== 'system_admin') {
      const self = await db.query.users.findFirst({
        where: eq(users.id, currentUserId),
        columns: { organizationId: true },
      });
      if (
        self?.organizationId === null ||
        self?.organizationId === undefined ||
        pack.organizationId !== self.organizationId
      ) {
        throw forbidden('Access denied');
      }
    }

    return c.json({ pack });
  });

  // ---------------------------------------------------------------------------
  // PATCH /admin/content-packs/:packId - Update pack metadata
  // ---------------------------------------------------------------------------
  router.patch(
    '/content-packs/:packId',
    zValidator(
      'json',
      z.object({
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        status: z.enum(['draft', 'published', 'archived']).optional(),
        certificationTarget: z.string().max(255).optional(),
      })
    ),
    async (c) => {
      const packId = c.req.param('packId');
      const updates = c.req.valid('json');
      const currentUserRole = c.get('userRole');
      const db = getDatabase();

      assertSystemAdmin(currentUserRole);

      const [updated] = await db
        .update(contentPacks)
        .set({
          ...(updates.title !== undefined ? { title: updates.title } : {}),
          ...(updates.description !== undefined ? { description: updates.description } : {}),
          ...(updates.status !== undefined ? { status: updates.status } : {}),
          ...(updates.certificationTarget !== undefined
            ? { certificationTarget: updates.certificationTarget }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(contentPacks.id, packId))
        .returning();

      if (!updated) {
        throw notFound('ContentPack', packId);
      }

      return c.json({ message: 'Pack updated', pack: updated });
    }
  );

  // ---------------------------------------------------------------------------
  // PATCH /admin/content-packs/:packId/blocks/:blockId - Update a block
  // ---------------------------------------------------------------------------
  router.patch(
    '/content-packs/:packId/blocks/:contentBlockId',
    zValidator(
      'json',
      z.object({
        title: z.string().min(1).max(255).optional(),
        objective: z.string().optional(),
        content: z.unknown().optional(),
        hints: z.array(z.unknown()).optional(),
        timeBudgetSeconds: z.number().int().positive().optional(),
      })
    ),
    async (c) => {
      const { packId, contentBlockId } = c.req.param();
      const updates = c.req.valid('json');
      const currentUserRole = c.get('userRole');
      const db = getDatabase();

      assertSystemAdmin(currentUserRole);

      // Verify block belongs to pack
      const existing = await db.query.contentBlocks.findFirst({
        where: eq(contentBlocks.id, contentBlockId),
        columns: { packId: true },
      });

      if (!existing) {
        throw notFound('ContentBlock', contentBlockId);
      }

      if (existing.packId !== packId) {
        throw forbidden('Block does not belong to this pack');
      }

      const { content, hints, title, objective, timeBudgetSeconds } = updates;

      const [updated] = await db
        .update(contentBlocks)
        .set({
          ...(title !== undefined ? { title } : {}),
          ...(objective !== undefined ? { objective } : {}),
          ...(timeBudgetSeconds !== undefined ? { timeBudgetSeconds } : {}),
          ...(content !== undefined ? { content: content as Record<string, unknown> } : {}),
          ...(hints !== undefined ? { hints } : {}),
          updatedAt: new Date(),
        })
        .where(eq(contentBlocks.id, contentBlockId))
        .returning();

      if (!updated) {
        throw notFound('ContentBlock', contentBlockId);
      }

      return c.json({ message: 'Block updated', block: updated });
    }
  );

  return router;
}
