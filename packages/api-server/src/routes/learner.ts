/**
 * TopShelf Service LLC - Learner Routes
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import {
  getDatabase,
  learnerStates,
  learnerProgressEvents,
  learningSessions,
  eq,
  and,
  desc,
} from '@topshelf/database';
import { notFound } from '../middleware/error-handler.js';

// =============================================================================
// SCHEMAS
// =============================================================================

const ProgressEventSchema = z.object({
  blockId: z.string(),
  eventType: z.enum(['started', 'completed', 'hint_used', 'skipped', 'paused', 'resumed']),
  responseData: z.record(z.unknown()).optional(),
  correctness: z.number().min(0).max(1).optional(),
  timeSpentSeconds: z.number().int().min(0).optional(),
});

const StartSessionSchema = z.object({
  contentPackId: z.string().uuid(),
  deviceInfo: z.record(z.unknown()).optional(),
});

// =============================================================================
// ROUTES
// =============================================================================

export function createLearnerRoutes() {
  const router = new Hono();

  // ---------------------------------------------------------------------------
  // GET /learner/state/:contentPackId - Get learner state for a content pack
  // ---------------------------------------------------------------------------
  router.get('/state/:contentPackId', async (c) => {
    const userId = c.get('userId');
    const contentPackId = c.req.param('contentPackId');
    const db = getDatabase();

    const state = await db.query.learnerStates.findFirst({
      where: and(eq(learnerStates.userId, userId), eq(learnerStates.contentPackId, contentPackId)),
    });

    if (!state) {
      throw notFound('Learner state', contentPackId);
    }

    return c.json({
      state: {
        id: state.id,
        currentMode: state.currentMode,
        overallMastery: state.overallMastery,
        totalTimeSpentSeconds: state.totalTimeSpentSeconds,
        blocksCompleted: state.blocksCompleted,
        currentBlockId: state.currentBlockId,
        skillEstimates: state.skillEstimates,
        inProbation: state.inProbation,
        lastActivityAt: state.lastActivityAt,
      },
    });
  });

  // ---------------------------------------------------------------------------
  // GET /learner/states - Get all learner states for current user
  // ---------------------------------------------------------------------------
  router.get('/states', async (c) => {
    const userId = c.get('userId');
    const db = getDatabase();

    const states = await db.query.learnerStates.findMany({
      where: eq(learnerStates.userId, userId),
      with: {
        contentPack: {
          columns: {
            id: true,
            title: true,
            slug: true,
            certificationTarget: true,
          },
        },
      },
      orderBy: [desc(learnerStates.lastActivityAt)],
    });

    return c.json({
      states: states.map((s) => ({
        id: s.id,
        contentPack: s.contentPack,
        currentMode: s.currentMode,
        overallMastery: s.overallMastery,
        blocksCompleted: s.blocksCompleted,
        lastActivityAt: s.lastActivityAt,
      })),
    });
  });

  // ---------------------------------------------------------------------------
  // POST /learner/session/start - Start a new learning session
  // ---------------------------------------------------------------------------
  router.post('/session/start', zValidator('json', StartSessionSchema), async (c) => {
    const userId = c.get('userId');
    const { contentPackId, deviceInfo } = c.req.valid('json');
    const db = getDatabase();

    // Get or create learner state
    let state = await db.query.learnerStates.findFirst({
      where: and(eq(learnerStates.userId, userId), eq(learnerStates.contentPackId, contentPackId)),
    });

    if (!state) {
      const [newState] = await db
        .insert(learnerStates)
        .values({
          userId,
          contentPackId,
          currentMode: 'L1_RECALL',
          overallMastery: 0,
          totalTimeSpentSeconds: 0,
          blocksCompleted: 0,
        })
        .returning();
      if (!newState) {
        throw new Error('Failed to create learner state');
      }
      state = newState;
    }

    // Create new session
    const [session] = await db
      .insert(learningSessions)
      .values({
        userId,
        learnerStateId: state.id,
        status: 'active',
        deviceInfo,
        startedAt: new Date(),
      })
      .returning();

    if (!session) {
      throw new Error('Failed to create session');
    }

    // Update last activity
    await db
      .update(learnerStates)
      .set({ lastActivityAt: new Date() })
      .where(eq(learnerStates.id, state.id));

    return c.json(
      {
        sessionId: session.id,
        state: {
          currentMode: state.currentMode,
          overallMastery: state.overallMastery,
          currentBlockId: state.currentBlockId,
        },
      },
      201
    );
  });

  // ---------------------------------------------------------------------------
  // POST /learner/session/:sessionId/event - Record a progress event
  // ---------------------------------------------------------------------------
  router.post('/session/:sessionId/event', zValidator('json', ProgressEventSchema), async (c) => {
    const userId = c.get('userId');
    const sessionId = c.req.param('sessionId');
    const eventData = c.req.valid('json');
    const db = getDatabase();

    // Verify session belongs to user
    const session = await db.query.learningSessions.findFirst({
      where: and(
        eq(learningSessions.id, sessionId),
        eq(learningSessions.userId, userId),
        eq(learningSessions.status, 'active')
      ),
    });

    if (!session) {
      throw notFound('Active session', sessionId);
    }

    // Record event
    const [event] = await db
      .insert(learnerProgressEvents)
      .values({
        userId,
        learnerStateId: session.learnerStateId,
        blockId: eventData.blockId,
        eventType: eventData.eventType,
        responseData: eventData.responseData ?? null,
        correctness: eventData.correctness ?? null,
        timeSpentSeconds: eventData.timeSpentSeconds ?? null,
        occurredAt: new Date(),
      })
      .returning();

    if (!event) {
      throw new Error('Failed to create progress event');
    }

    // Update session stats if task completed
    if (eventData.eventType === 'completed') {
      await db
        .update(learningSessions)
        .set({
          blocksCompleted: (session.blocksCompleted || 0) + 1,
          blocksAttempted: (session.blocksAttempted || 0) + 1,
        })
        .where(eq(learningSessions.id, sessionId));

      // Update learner state
      await db
        .update(learnerStates)
        .set({
          currentBlockId: eventData.blockId,
          lastActivityAt: new Date(),
          blocksCompleted: session.blocksCompleted ? session.blocksCompleted + 1 : 1,
        })
        .where(eq(learnerStates.id, session.learnerStateId));
    }

    return c.json({
      eventId: event.id,
      recorded: true,
    });
  });

  // ---------------------------------------------------------------------------
  // POST /learner/session/:sessionId/end - End a learning session
  // ---------------------------------------------------------------------------
  router.post('/session/:sessionId/end', async (c) => {
    const userId = c.get('userId');
    const sessionId = c.req.param('sessionId');
    const db = getDatabase();

    const session = await db.query.learningSessions.findFirst({
      where: and(eq(learningSessions.id, sessionId), eq(learningSessions.userId, userId)),
    });

    if (!session) {
      throw notFound('Session', sessionId);
    }

    // End session
    await db
      .update(learningSessions)
      .set({
        status: 'completed',
        endedAt: new Date(),
      })
      .where(eq(learningSessions.id, sessionId));

    return c.json({
      message: 'Session ended successfully',
      sessionId,
      blocksCompleted: session.blocksCompleted,
    });
  });

  // ---------------------------------------------------------------------------
  // GET /learner/progress/:contentPackId - Get detailed progress
  // ---------------------------------------------------------------------------
  router.get('/progress/:contentPackId', async (c) => {
    const userId = c.get('userId');
    const contentPackId = c.req.param('contentPackId');
    const db = getDatabase();

    const state = await db.query.learnerStates.findFirst({
      where: and(eq(learnerStates.userId, userId), eq(learnerStates.contentPackId, contentPackId)),
    });

    if (!state) {
      throw notFound('Progress', contentPackId);
    }

    // Get recent events
    const recentEvents = await db.query.learnerProgressEvents.findMany({
      where: eq(learnerProgressEvents.learnerStateId, state.id),
      orderBy: [desc(learnerProgressEvents.occurredAt)],
      limit: 50,
    });

    return c.json({
      progress: {
        currentMode: state.currentMode,
        overallMastery: state.overallMastery,
        totalTimeSpentSeconds: state.totalTimeSpentSeconds,
        blocksCompleted: state.blocksCompleted,
        skillEstimates: state.skillEstimates,
        retentionHistory: state.retentionHistory,
        inProbation: state.inProbation,
      },
      recentActivity: recentEvents.map((e) => ({
        blockId: e.blockId,
        eventType: e.eventType,
        correctness: e.correctness,
        occurredAt: e.occurredAt,
      })),
    });
  });

  return router;
}
