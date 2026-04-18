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

const learnerModes = ['L1_RECALL', 'L2_EXPLAIN', 'L3_APPLY', 'L4_ANALYZE', 'L5_EXPERT'] as const;

type LearningMode = (typeof learnerModes)[number];

interface PolicySignalSummary {
  performanceAverage: number | undefined;
  positiveAcademicSignals: number;
  negativeAcademicSignals: number;
  hasHelpRequest: boolean;
  hasConceptGap: boolean;
  repeatedErrors: boolean;
  longTime: boolean;
}

interface EnrichedTeachingContext {
  context: TeachingContext;
  explicitTriggers: TriggerType[];
  summary: PolicySignalSummary;
}

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

type EvaluateSignal = z.infer<typeof EvaluateSchema>['signals'][number];

function normalizeLearningMode(mode: string): LearningMode {
  return learnerModes.includes(mode as LearningMode) ? (mode as LearningMode) : 'L1_RECALL';
}

function nextLearningMode(mode: LearningMode): LearningMode {
  const index = learnerModes.indexOf(mode);
  return learnerModes[Math.min(index + 1, learnerModes.length - 1)] ?? mode;
}

function previousLearningMode(mode: LearningMode): LearningMode {
  const index = learnerModes.indexOf(mode);
  return learnerModes[Math.max(index - 1, 0)] ?? mode;
}

function summarizeSignals(signals: EvaluateSignal[]): PolicySignalSummary {
  let weightedPerformance = 0;
  let performanceWeight = 0;
  let positiveAcademicSignals = 0;
  let negativeAcademicSignals = 0;
  let hasHelpRequest = false;
  let hasConceptGap = false;
  let repeatedErrors = false;
  let longTime = false;

  for (const signal of signals) {
    const type = signal.type.toLowerCase();
    const isAcademicSignal =
      type.includes('correctness') || type.includes('mastery') || type.includes('retention');

    if (isAcademicSignal) {
      weightedPerformance += signal.value * signal.confidence;
      performanceWeight += signal.confidence;

      if (signal.value >= 0.85 && signal.confidence >= 0.7) {
        positiveAcademicSignals += 1;
      }

      if (signal.value <= 0.45 && signal.confidence >= 0.7) {
        negativeAcademicSignals += 1;
      }
    }

    if (type.includes('help') || type.includes('hint')) {
      hasHelpRequest = hasHelpRequest || signal.value > 0;
    }

    if (type.includes('concept_gap')) {
      hasConceptGap = hasConceptGap || signal.value > 0;
    }

    if (type.includes('incorrect') || type.includes('error')) {
      repeatedErrors = repeatedErrors || signal.value >= 3;
    }

    if (type.includes('time') && signal.value >= 300) {
      longTime = true;
    }
  }

  return {
    performanceAverage: performanceWeight > 0 ? weightedPerformance / performanceWeight : undefined,
    positiveAcademicSignals,
    negativeAcademicSignals,
    hasHelpRequest,
    hasConceptGap,
    repeatedErrors,
    longTime,
  };
}

function enrichTeachingContext(
  context: TeachingContext,
  signals: EvaluateSignal[]
): EnrichedTeachingContext {
  const summary = summarizeSignals(signals);
  const explicitTriggers: TriggerType[] = [];

  if (summary.hasHelpRequest) {
    explicitTriggers.push(TriggerType.HELP_REQUESTED);
  }

  if (summary.hasConceptGap) {
    explicitTriggers.push(TriggerType.CONCEPT_GAP);
  }

  return {
    context: {
      ...context,
      errorsEncountered: summary.repeatedErrors
        ? Math.max(context.errorsEncountered, 3)
        : context.errorsEncountered,
      sessionStartTime: summary.longTime
        ? new Date(Math.min(context.sessionStartTime.getTime(), Date.now() - 300000))
        : context.sessionStartTime,
    },
    explicitTriggers,
    summary,
  };
}

function mergeTriggers(...collections: TriggerType[][]): TriggerType[] {
  return Array.from(new Set(collections.flat()));
}

export function createPolicyRoutes(): Hono {
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

    const fromMode = normalizeLearningMode(state.currentMode);
    let decision: 'promote' | 'demote' | 'hold' | 'defer' = 'hold';
    let toMode: LearningMode = fromMode;
    let reasoning = 'No strong learner-mode change signal detected.';
    let triggers: TriggerType[] = [];
    let suggestedTeachingMode: TeachingMode | undefined;

    const signalSummary = summarizeSignals(signals);

    if (typeof sessionId === 'string' && sessionId.length > 0) {
      const session = await db.query.learningSessions.findFirst({
        where: and(eq(learningSessions.id, sessionId), eq(learningSessions.userId, userId)),
      });

      if (session) {
        const deviceProfile = ConstraintEngine.inferProfile(
          session.deviceInfo as Record<string, unknown> | null
        );

        const baseContext: TeachingContext = {
          mode: (session.teachingMode ?? TeachingMode.L2_CONTEXTUAL) as TeachingMode,
          deviceProfile,
          constraints: ConstraintEngine.getConstraints(deviceProfile),
          triggers: [],
          sessionStartTime: session.startedAt,
          problemsSolved: session.problemsSolved ?? 0,
          errorsEncountered: session.errorsEncountered ?? 0,
        };

        const { context, explicitTriggers } = enrichTeachingContext(baseContext, signals);
        triggers = mergeTriggers(TriggerDetector.detectTriggers(context), explicitTriggers);
        suggestedTeachingMode = TriggerDetector.suggestModeElevation(context.mode, triggers);

        const storedTriggers = Array.isArray(session.triggersFired)
          ? (session.triggersFired as TriggerType[])
          : [];

        if (
          suggestedTeachingMode !== context.mode ||
          JSON.stringify(storedTriggers) !== JSON.stringify(triggers)
        ) {
          await db
            .update(learningSessions)
            .set({
              teachingMode: suggestedTeachingMode,
              triggersFired: triggers,
            })
            .where(eq(learningSessions.id, sessionId));
        }
      }
    }

    const severeTriggers = triggers.filter(
      (trigger) =>
        trigger === TriggerType.ERROR_REPEATED ||
        trigger === TriggerType.STUCK_DETECTED ||
        trigger === TriggerType.CONCEPT_GAP
    );

    if (
      signalSummary.positiveAcademicSignals >= 2 &&
      (signalSummary.performanceAverage ?? 0) >= 0.8 &&
      severeTriggers.length === 0 &&
      triggers.length === 0
    ) {
      const promotedMode = nextLearningMode(fromMode);

      if (promotedMode !== fromMode) {
        decision = 'promote';
        toMode = promotedMode;
        reasoning = `Consistent high-confidence performance supports promotion to ${promotedMode}.`;
      } else {
        reasoning = 'Learner is already at the highest competency band.';
      }
    } else if (signalSummary.negativeAcademicSignals >= 2 && severeTriggers.length > 0) {
      const demotedMode = previousLearningMode(fromMode);

      if (demotedMode !== fromMode) {
        decision = 'demote';
        toMode = demotedMode;
        reasoning = `Low-confidence performance with active struggle triggers requires a step back to ${demotedMode}.`;
      } else {
        decision = 'defer';
        reasoning =
          'Struggle signals detected, but the learner is already at the minimum competency band.';
      }
    } else if (triggers.length > 0) {
      decision = 'defer';
      reasoning = `Teaching intervention is active (${triggers.join(', ')}), so learner-mode promotion is deferred.`;
    } else if ((signalSummary.performanceAverage ?? 0) > 0) {
      reasoning = 'Signals are mixed, so the learner remains at the current competency band.';
    }

    if (decision === 'promote' || decision === 'demote') {
      await db
        .update(learnerStates)
        .set({
          currentMode: toMode,
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(learnerStates.id, state.id));
    }

    const evaluation = {
      decision,
      fromMode,
      toMode,
      reasoning,
      signals,
      ...(triggers.length > 0 ? { triggers } : {}),
      ...(suggestedTeachingMode !== undefined ? { suggestedTeachingMode } : {}),
    };

    // Record evaluation
    const [record] = await db
      .insert(policyEvaluations)
      .values({
        userId,
        learnerStateId: state.id,
        ...(typeof sessionId === 'string' && sessionId.length > 0 ? { sessionId } : {}),
        decision: evaluation.decision,
        fromMode: evaluation.fromMode,
        toMode: evaluation.toMode,
        signals: evaluation.signals,
        reasoning: evaluation.reasoning,
        policyVersion: 'teaching-v1',
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
