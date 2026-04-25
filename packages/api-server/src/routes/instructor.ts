/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import {
  getDatabase,
  contentPacks,
  learnerStates,
  learningSessions,
  users,
  eq,
  sql,
  desc,
  and,
} from '@topshelf/database';
import { authMiddleware, requireRole } from '../middleware/auth.js';

export function createInstructorRoutes(): Hono {
  const router = new Hono();

  router.use('*', authMiddleware());
  router.use('*', requireRole('instructor', 'school_admin', 'district_admin', 'system_admin'));

  // ---------------------------------------------------------------------------
  // GET /instructor/courses - List instructor's content packs with learner stats
  // ---------------------------------------------------------------------------
  router.get('/courses', async (c) => {
    const userId = c.get('userId');
    const db = getDatabase();

    const packs = await db
      .select({
        id: contentPacks.id,
        slug: contentPacks.slug,
        title: contentPacks.title,
        version: contentPacks.version,
        status: contentPacks.status,
        createdAt: contentPacks.createdAt,
        enrolledCount: sql<number>`count(distinct ${learnerStates.userId})`,
      })
      .from(contentPacks)
      .leftJoin(learnerStates, eq(learnerStates.contentPackId, contentPacks.id))
      .where(eq(contentPacks.authorId, userId))
      .groupBy(
        contentPacks.id,
        contentPacks.slug,
        contentPacks.title,
        contentPacks.version,
        contentPacks.status,
        contentPacks.createdAt
      )
      .orderBy(desc(contentPacks.createdAt));

    return c.json({ courses: packs });
  });

  // ---------------------------------------------------------------------------
  // GET /instructor/students - List students across instructor's packs
  // ---------------------------------------------------------------------------
  router.get(
    '/students',
    zValidator(
      'query',
      z.object({
        packId: z.string().uuid().optional(),
      })
    ),
    async (c) => {
      const userId = c.get('userId');
      const { packId } = c.req.valid('query');
      const db = getDatabase();

      const students = await db
        .select({
          userId: learnerStates.userId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          displayName: users.displayName,
          packId: contentPacks.id,
          packSlug: contentPacks.slug,
          packTitle: contentPacks.title,
          masteryScore: learnerStates.overallMastery,
          lastSessionAt: sql<string | null>`max(${learningSessions.endedAt})`,
          totalSessions: sql<number>`count(distinct ${learningSessions.id})`,
        })
        .from(learnerStates)
        .innerJoin(users, eq(users.id, learnerStates.userId))
        .innerJoin(contentPacks, eq(contentPacks.id, learnerStates.contentPackId))
        .leftJoin(learningSessions, eq(learningSessions.learnerStateId, learnerStates.id))
        .where(
          packId !== undefined
            ? and(eq(contentPacks.authorId, userId), eq(contentPacks.id, packId))
            : eq(contentPacks.authorId, userId)
        )
        .groupBy(
          learnerStates.userId,
          users.email,
          users.firstName,
          users.lastName,
          users.displayName,
          contentPacks.id,
          contentPacks.slug,
          contentPacks.title,
          learnerStates.overallMastery
        )
        .orderBy(desc(sql`max(${learningSessions.endedAt})`));

      const result = students.map((s) => ({
        userId: s.userId,
        email: s.email,
        displayName:
          s.displayName ?? ([s.firstName, s.lastName].filter(Boolean).join(' ') || s.email),
        packId: s.packId,
        packSlug: s.packSlug,
        packTitle: s.packTitle,
        lastSessionAt: s.lastSessionAt,
        totalSessions: s.totalSessions,
        masteryScore: s.masteryScore,
      }));

      return c.json({ students: result });
    }
  );

  return router;
}
