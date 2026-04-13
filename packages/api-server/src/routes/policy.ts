/**
 * TopShelf Service LLC - Policy Routes
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import {
  getDatabase,
  policyEvaluations,
  learnerStates,
  learningSessions,
  eq,
  and,
  desc,
} from '@topshelf/database';
import {
  TriggerDetector,
  ConstraintEngine,
  TeachingMode,
  TriggerType,
  type TeachingContext,
} from '@topshelf/engine';
import { notFound } from '../middleware/error-handler.js';

const EvaluateSchema = z.object({
  contentPackId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  signals: z.array(
    z.object({
      type: z.string(),
      value: z.number(),
      confidence: z.number().min(0).max(1),
    })
  ),
});

export function createPolicyRoutes() {
  const router = new Hono();

  // POST /policy/evaluate - Request policy evaluation
  router.post('/evaluate', zValidator('json', EvaluateSchema), async (c) => {
    const userId = c.get('userId');
    const { contentPackId, sessionId, signals } = c.req.valid('json');
    const db = getDatabase();

    // Get current learner state
    const state = await db.query.learnerStates.findFirst({
      where: and(eq(learnerStates.userId, userId), eq(learnerStates.contentPackId, contentPackId)),
    });

    if (!state) {
      throw notFound('Learner state', contentPackId);
    }

    // Build teaching context from session if available
    let decision: 'promote' | 'demote' | 'hold' | 'defer' = 'hold';
    let toMode = state.currentMode;
    let reasoning = 'Insufficient signals for promotion decision';
    let triggers: TriggerType[] = [];

    if (sessionId) {
      const session = await db.query.learningSessions.findFirst({
        where: and(
          eq(learningSessions.id, sessionId),
          eq(learningSessions.userId, userId)
        ),
      });

      if (session) {
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

        triggers = TriggerDetector.detectTriggers(context);
        const suggestedMode = TriggerDetector.suggestModeElevation(context.mode, triggers);

        if (suggestedMode > context.mode) {
          decision = 'promote';
          reasoning = `Triggers detected: ${triggers.join(', ')}. Elevating teaching mode.`;
        } else if (triggers.length === 0 && context.problemsSolved > 5) {
          decision = 'hold';
          reasoning = 'No triggers detected and steady progress.';
        }
      }
    }

    const evaluation = {
      decision,
      fromMode: state.currentMode,
      toMode,
      reasoning,
      signals,
    };

    // Record evaluation
    const [record] = await db
      .insert(policyEvaluations)
      .values({
        userId,
        learnerStateId: state.id,
        decision: evaluation.decision,
        fromMode: evaluation.fromMode,
        toMode: evaluation.toMode,
        signals: evaluation.signals,
        reasoning: evaluation.reasoning,
        evaluatedAt: new Date(),
      })
      .returning();

    if (!record) {
      throw new Error('Insert failed');
    }

    return c.json({
      evaluationId: record.id,
      ...evaluation,
    });
  });

  // GET /policy/history/:contentPackId - Get policy evaluation history
  router.get('/history/:contentPackId', async (c) => {
    const userId = c.get('userId');
    const contentPackId = c.req.param('contentPackId');
    const db = getDatabase();

    const state = await db.query.learnerStates.findFirst({
      where: and(eq(learnerStates.userId, userId), eq(learnerStates.contentPackId, contentPackId)),
    });

    if (!state) {
      throw notFound('Learner state', contentPackId);
    }

    const evaluations = await db.query.policyEvaluations.findMany({
      where: eq(policyEvaluations.learnerStateId, state.id),
      orderBy: [desc(policyEvaluations.evaluatedAt)],
      limit: 20,
    });

    return c.json({
      evaluations: evaluations.map((e) => ({
        id: e.id,
        decision: e.decision,
        fromMode: e.fromMode,
        toMode: e.toMode,
        reasoning: e.reasoning,
        evaluatedAt: e.evaluatedAt,
      })),
    });
  });

  return router;
}
