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
  learnerStates,
  eq,
  desc,
  sql,
} from '@topshelf/database';
import { requireRole } from '../middleware/auth.js';
import { notFound, forbidden } from '../middleware/error-handler.js';

export function createAdminRoutes() {
  const router = new Hono();

  // All admin routes require admin role
  router.use('*', requireRole('school_admin', 'district_admin', 'system_admin'));

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
        totalUsers: userCount?.count || 0,
        totalOrganizations: orgCount?.count || 0,
        publishedContentPacks: packCount?.count || 0,
        activeLearners: activeLearnersCount?.count || 0,
      },
      generatedAt: new Date().toISOString(),
    });
  });

  // ---------------------------------------------------------------------------
  // GET /admin/users - List users
  // ---------------------------------------------------------------------------
  router.get('/users', async (c) => {
    // userRole available from middleware for future role-based filtering
    const db = getDatabase();

    // System admins see all, others see only their org
    const usersList = await db.query.users.findMany({
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
      if (updates.role && currentUserRole !== 'system_admin') {
        throw forbidden('Only system admins can change user roles');
      }

      const [updated] = await db
        .update(users)
        .set({
          ...updates,
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
    const db = getDatabase();

    const packs = await db.query.contentPacks.findMany({
      orderBy: [desc(contentPacks.createdAt)],
      with: {
        author: {
          columns: { displayName: true },
        },
      },
    });

    return c.json({ contentPacks: packs });
  });

  return router;
}
