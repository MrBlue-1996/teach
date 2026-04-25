/**
 * TopShelf Service LLC - Session Routes
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { Hono } from 'hono';
import { getDatabase, learningSessions, eq, and, desc } from '@topshelf/database';
import { notFound, AuthorizationError, ValidationError } from '../middleware/error-handler.js';

export function createSessionRoutes(): Hono {
  const router = new Hono();

  // GET /session - List user's learning sessions
  router.get('/', async (c) => {
    const userId = c.get('userId');
    const db = getDatabase();

    const sessions = await db.query.learningSessions.findMany({
      where: eq(learningSessions.userId, userId),
      orderBy: [desc(learningSessions.startedAt)],
      limit: 50,
      with: {
        learnerState: {
          with: {
            contentPack: {
              columns: { title: true, slug: true },
            },
          },
        },
      },
    });

    return c.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        status: s.status,
        contentPack: (s.learnerState as typeof s.learnerState | null)?.contentPack,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        blocksCompleted: s.blocksCompleted,
      })),
    });
  });

  // GET /session/active - Get user's current active session
  router.get('/active', async (c) => {
    const userId = c.get('userId');
    const db = getDatabase();

    const session = await db.query.learningSessions.findFirst({
      where: and(eq(learningSessions.userId, userId), eq(learningSessions.status, 'active')),
      orderBy: [desc(learningSessions.startedAt)],
    });

    return c.json({ session: session ?? null });
  });

  // GET /session/:sessionId - Get session details
  router.get('/:sessionId', async (c) => {
    const userId = c.get('userId');
    const sessionId = c.req.param('sessionId');
    const db = getDatabase();

    const session = await db.query.learningSessions.findFirst({
      where: and(eq(learningSessions.id, sessionId), eq(learningSessions.userId, userId)),
      with: {
        learnerState: true,
      },
    });

    if (!session) {
      throw notFound('Session', sessionId);
    }

    return c.json({ session });
  });

  // DELETE /session/:id - Revoke/end a session
  router.delete('/:id', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const db = getDatabase();

    // Look up by id first to distinguish 404 vs 403
    const session = await db.query.learningSessions.findFirst({
      where: eq(learningSessions.id, id),
    });

    if (!session) {
      throw notFound('Session', id);
    }

    if (session.userId !== userId) {
      throw new AuthorizationError('Session not owned by current user');
    }

    if (session.status === 'completed') {
      throw new ValidationError('Session already ended');
    }

    await db
      .update(learningSessions)
      .set({ status: 'completed', endedAt: new Date() })
      .where(eq(learningSessions.id, id));

    return c.json({ success: true });
  });

  return router;
}
