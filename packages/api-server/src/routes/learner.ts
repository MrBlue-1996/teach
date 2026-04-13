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
  contentBlocks,
  eq,
  and,
  desc,
  asc,
} from '@topshelf/database';
import {
  PedagogyEngine,
  TriggerDetector,
  ConstraintEngine,
  TeachingMode,
  type TeachingContext,
} from '@topshelf/engine';
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

const TeachRequestSchema = z.object({
  blockId: z.string().optional(),
  content: z.string().optional(),
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
      state = newState;
    }

    if (!state) {
      throw new Error('Insert failed');
    }

    // Infer device profile from client-provided deviceInfo
    const deviceProfile = ConstraintEngine.inferProfile(
      deviceInfo as Record<string, unknown> | undefined
    );

    // Create new session with teaching context
    const [session] = await db
      .insert(learningSessions)
      .values({
        userId,
        learnerStateId: state.id,
        status: 'active',
        deviceInfo,
        teachingMode: TeachingMode.L2_CONTEXTUAL,
        deviceProfile,
        errorsEncountered: 0,
        problemsSolved: 0,
        triggersFired: [],
        startedAt: new Date(),
      })
      .returning();

    if (!session) {
      throw new Error('Insert failed');
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
        teaching: {
          mode: session.teachingMode,
          deviceProfile: session.deviceProfile,
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
      throw new Error('Insert failed');
    }

    // ---- Update teaching metrics on the session ----
    const sessionUpdates: Record<string, unknown> = {};
    let nextProblemsSolved = session.problemsSolved ?? 0;
    let nextErrorsEncountered = session.errorsEncountered ?? 0;

    if (eventData.eventType === 'completed') {
      sessionUpdates['blocksCompleted'] = (session.blocksCompleted || 0) + 1;
      sessionUpdates['blocksAttempted'] = (session.blocksAttempted || 0) + 1;

      // Correct answer → increment problems solved
      if (eventData.correctness !== undefined && eventData.correctness >= 0.5) {
        nextProblemsSolved += 1;
        sessionUpdates['problemsSolved'] = nextProblemsSolved;
      }

      // Wrong answer → increment errors
      if (eventData.correctness !== undefined && eventData.correctness < 0.5) {
        nextErrorsEncountered += 1;
        sessionUpdates['errorsEncountered'] = nextErrorsEncountered;
      }

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

    if (eventData.eventType === 'hint_used') {
      // Requesting a hint counts as an implicit error signal
      nextErrorsEncountered += 1;
      sessionUpdates['errorsEncountered'] = nextErrorsEncountered;
    }

    if (eventData.eventType === 'skipped') {
      nextErrorsEncountered += 1;
      sessionUpdates['errorsEncountered'] = nextErrorsEncountered;
    }

    const deviceProfile = ConstraintEngine.inferProfile(
      session.deviceInfo as Record<string, unknown> | null
    );

    const teachingContext: TeachingContext = {
      mode: (session.teachingMode ?? TeachingMode.L2_CONTEXTUAL) as TeachingMode,
      deviceProfile,
      constraints: ConstraintEngine.getConstraints(deviceProfile),
      triggers: [],
      sessionStartTime: session.startedAt,
      problemsSolved: nextProblemsSolved,
      errorsEncountered: nextErrorsEncountered,
    };

    const triggers = TriggerDetector.detectTriggers(teachingContext);
    const suggestedMode = TriggerDetector.suggestModeElevation(teachingContext.mode, triggers);

    sessionUpdates['triggersFired'] = triggers;
    sessionUpdates['teachingMode'] = suggestedMode;
    sessionUpdates['deviceProfile'] = deviceProfile;

    if (eventData.correctness !== undefined && eventData.eventType === 'completed') {
      const priorAttempts = session.blocksAttempted ?? 0;
      const previousAverage = session.averageCorrectness ?? null;
      const nextAttemptCount = priorAttempts + 1;
      const correctnessTotal = (previousAverage ?? 0) * priorAttempts + eventData.correctness;
      sessionUpdates['averageCorrectness'] = correctnessTotal / nextAttemptCount;
    }

    if (Object.keys(sessionUpdates).length > 0) {
      await db
        .update(learningSessions)
        .set(sessionUpdates)
        .where(eq(learningSessions.id, sessionId));
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

  // ---------------------------------------------------------------------------
  // POST /learner/session/:sessionId/teach - Get engine-backed teaching guidance
  // ---------------------------------------------------------------------------
  router.post(
    '/session/:sessionId/teach',
    zValidator('json', TeachRequestSchema),
    async (c) => {
      const userId = c.get('userId');
      const sessionId = c.req.param('sessionId');
      const { blockId, content: clientContent } = c.req.valid('json');
      const db = getDatabase();

      // Look up session
      const session = await db.query.learningSessions.findFirst({
        where: and(
          eq(learningSessions.id, sessionId),
          eq(learningSessions.userId, userId),
          eq(learningSessions.status, 'active')
        ),
        with: { learnerState: true },
      });

      if (!session) {
        throw notFound('Active session', sessionId);
      }

      // Resolve teaching content: prefer existing block hints, fall back to client
      let teachingContent = clientContent ?? '';

      if (blockId) {
        const block = await db.query.contentBlocks.findFirst({
          where: eq(contentBlocks.blockId, blockId),
        });

        if (block) {
          const hints = Array.isArray(block.hints) ? (block.hints as string[]) : [];
          if (hints.length > 0) {
            teachingContent = hints.join('\n\n');
          }
        }
      }

      // Reconstruct TeachingContext from persisted session state
      const deviceProfile = ConstraintEngine.inferProfile(
        session.deviceInfo as Record<string, unknown> | null
      );

      const context: TeachingContext = {
        mode: (session.teachingMode ?? TeachingMode.L2_CONTEXTUAL) as TeachingMode,
        deviceProfile,
        constraints: ConstraintEngine.getConstraints(deviceProfile),
        triggers: [],
        sessionStartTime: session.startedAt,
        problemsSolved: session.problemsSolved ?? 0,
        errorsEncountered: session.errorsEncountered ?? 0,
      };

      // Run engine
      const response = PedagogyEngine.processTeachingRequest(context, teachingContent);

      // Check for mode elevation
      const triggers = TriggerDetector.detectTriggers(context);
      const suggestedMode = TriggerDetector.suggestModeElevation(context.mode, triggers);

      if (suggestedMode > context.mode) {
        await db
          .update(learningSessions)
          .set({ teachingMode: suggestedMode, triggersFired: triggers })
          .where(eq(learningSessions.id, sessionId));
      }

      return c.json({
        ...response,
        triggers,
        suggestedMode,
        currentMode: context.mode,
      });
    }
  );

  return router;
}
