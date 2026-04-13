/**
 * TopShelf Service LLC - Policy Routes
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getDatabase, policyEvaluations, learnerStates, eq, and, desc } from '@topshelf/database';
import { notFound } from '../middleware/error-handler.js';

const EvaluateSchema = z.object({
  contentPackId: z.string().uuid(),
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
    const { contentPackId, signals } = c.req.valid('json');
    const db = getDatabase();

    // Get current learner state
    const state = await db.query.learnerStates.findFirst({
      where: and(eq(learnerStates.userId, userId), eq(learnerStates.contentPackId, contentPackId)),
    });

    if (!state) {
      throw notFound('Learner state', contentPackId);
    }

    // In production, this would call the policy engine
    // For now, return a simulated evaluation
    const evaluation = {
      decision: 'hold' as const,
      fromMode: state.currentMode,
      toMode: state.currentMode,
      reasoning: 'Insufficient signals for promotion decision',
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
