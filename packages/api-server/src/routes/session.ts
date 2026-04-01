/**
 * TopShelf Service LLC - Session Routes
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { Hono } from 'hono';
import { getDatabase, learningSessions, eq, and, desc } from '@topshelf/database';
import { notFound } from '../middleware/error-handler.js';

export function createSessionRoutes() {
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
        contentPack: s.learnerState?.contentPack,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        blocksCompleted: s.blocksCompleted,
      })),
    });
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

  return router;
}
