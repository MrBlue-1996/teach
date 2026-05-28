/**
 * TopShelf Service LLC - Learner Routes
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { randomUUID } from 'crypto';
import {
  getDatabase,
  users,
  learnerStates,
  learnerProgressEvents,
  learningSessions,
  contentBlocks,
  badges,
  eq,
  and,
  gte,
  desc,
  sql,
  isNull,
} from '@topshelf/database';
import {
  PedagogyEngine,
  TriggerDetector,
  TriggerType,
  ConstraintEngine,
  TeachingMode,
  type TeachingContext,
  type TrialOutcome,
} from '@topshelf/engine';
import { notFound } from '../middleware/error-handler.js';
import {
  nextSchedule,
  buildAggregateRetentionQueue,
  type RetentionHistoryEntry as SchedulerRetentionEntry,
} from '../lib/retention-scheduler.js';

// =============================================================================
// HELPERS
// =============================================================================

const CLEAN_PASS_CORRECTNESS = 0.8;

/**
 * Walk events oldest-to-newest, building per-block trial outcomes.
 * A block trial is "passed" when a `completed` event with
 * `correctness >= CLEAN_PASS_CORRECTNESS` exists for it. `helpRequested`
 * is true if any `hint_used` event for the same block precedes the
 * completion in the same session window.
 *
 * Events are expected newest-first (from DB ORDER BY); internally reversed
 * so a later `completed` overrides an earlier attempt. Returned trials are
 * oldest-first so `TriggerDetector.suggestModeFade` can slice the trailing window.
 */
function deriveRecentTrials(
  events: readonly {
    blockId: string;
    eventType: string;
    correctness: number | null;
  }[]
): TrialOutcome[] {
  const trialsByBlock = new Map<string, { passed: boolean | null; helpRequested: boolean }>();
  const ordered: string[] = [];

  // Walk oldest-to-newest so a later `completed` overrides an earlier attempt
  for (const event of [...events].reverse()) {
    const existing = trialsByBlock.get(event.blockId) ?? {
      passed: null,
      helpRequested: false,
    };

    if (event.eventType === 'hint_used') {
      existing.helpRequested = true;
    } else if (event.eventType === 'completed') {
      existing.passed = (event.correctness ?? 0) >= CLEAN_PASS_CORRECTNESS;
    }

    trialsByBlock.set(event.blockId, existing);
    if (!ordered.includes(event.blockId)) {
      ordered.push(event.blockId);
    }
  }

  return ordered.flatMap((blockId) => {
    const trial = trialsByBlock.get(blockId);
    // Only count blocks that have actually been completed (passed is non-null)
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    if (!trial || trial.passed === null) {
      return [];
    }

    return [{ passed: trial.passed, helpRequested: trial.helpRequested }];
  });
}

// =============================================================================
// SCHEMAS
// =============================================================================

const HintSourceEnum = z.enum(['help_button', 'stuck_timer']);

const ProgressResponseDataSchema = z
  .object({
    hintIndex: z.number().int().min(0).optional(),
    helpRequested: z.boolean().optional(),
    helpUsed: z.boolean().optional(),
    source: HintSourceEnum.optional(),
  })
  .passthrough();

const ProgressEventSchema = z.object({
  blockId: z.string(),
  eventType: z.enum(['started', 'completed', 'hint_used', 'skipped', 'paused', 'resumed']),
  responseData: ProgressResponseDataSchema.optional(),
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

const DEFAULT_RETENTION_REASSESS_DAYS = 7;
const DEFAULT_RETENTION_DECAY_HALF_LIFE_DAYS = 21;
const MAX_RETENTION_HISTORY_ENTRIES = 200;

interface RetentionSchedule {
  reassessAfterDays: number;
  decayHalfLifeDays: number;
}

interface RetentionHistoryEntry {
  taskId: string;
  date: string;
  pass: boolean;
  daysSinceOriginal: number;
  latencyMs: number;
  reassessAfterDays?: number;
  decayHalfLifeDays?: number;
  nextReassessAt?: string;
  /** Leitner stage at the time this record was written. */
  stage?: number;
  /** Consecutive-pass counter at the time this record was written. */
  consecutivePasses?: number;
}

function parseRetentionSchedule(content: unknown): RetentionSchedule {
  const retention =
    content !== null && typeof content === 'object'
      ? (content as Record<string, unknown>)['retention']
      : undefined;
  const retentionObj =
    retention !== null && typeof retention === 'object'
      ? (retention as Record<string, unknown>)
      : null;

  const reassessAfterDays = retentionObj?.['reassessAfterDays'];
  const decayHalfLifeDays = retentionObj?.['decayHalfLifeDays'];

  const parsedReassess =
    typeof reassessAfterDays === 'number' &&
    Number.isInteger(reassessAfterDays) &&
    reassessAfterDays >= 1 &&
    reassessAfterDays <= 365
      ? reassessAfterDays
      : DEFAULT_RETENTION_REASSESS_DAYS;

  const parsedHalfLife =
    typeof decayHalfLifeDays === 'number' &&
    Number.isInteger(decayHalfLifeDays) &&
    decayHalfLifeDays >= 1 &&
    decayHalfLifeDays <= 365
      ? decayHalfLifeDays
      : DEFAULT_RETENTION_DECAY_HALF_LIFE_DAYS;

  return {
    reassessAfterDays: parsedReassess,
    decayHalfLifeDays: parsedHalfLife,
  };
}

function parseRetentionHistory(raw: unknown): RetentionHistoryEntry[] {
  if (!Array.isArray(raw)) return [];

  return raw.filter((entry): entry is RetentionHistoryEntry => {
    if (entry === null || typeof entry !== 'object') {
      return false;
    }

    const record = entry as Record<string, unknown>;
    return (
      typeof record['taskId'] === 'string' &&
      typeof record['date'] === 'string' &&
      typeof record['pass'] === 'boolean' &&
      typeof record['daysSinceOriginal'] === 'number' &&
      typeof record['latencyMs'] === 'number'
    );
  });
}

function toReassessmentDate(baseDate: Date, days: number): Date {
  const next = new Date(baseDate);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function buildRetentionQueue(
  records: RetentionHistoryEntry[],
  now: Date
): {
  dueTaskIds: string[];
  dueCount: number;
  nextDueAt: string | null;
} {
  const dueTaskIds = new Set<string>();
  let nextDueAt: Date | null = null;

  for (const record of records) {
    const nextAtIso =
      record.nextReassessAt ??
      toReassessmentDate(
        new Date(record.date),
        record.reassessAfterDays ?? DEFAULT_RETENTION_REASSESS_DAYS
      ).toISOString();

    const nextAt = new Date(nextAtIso);
    if (Number.isNaN(nextAt.getTime())) {
      continue;
    }

    if (nextAt.getTime() <= now.getTime()) {
      dueTaskIds.add(record.taskId);
      continue;
    }

    if (nextDueAt === null || nextAt.getTime() < nextDueAt.getTime()) {
      nextDueAt = nextAt;
    }
  }

  return {
    dueTaskIds: Array.from(dueTaskIds),
    dueCount: dueTaskIds.size,
    nextDueAt: nextDueAt?.toISOString() ?? null,
  };
}

// =============================================================================
// ROUTES
// =============================================================================

export function createLearnerRoutes(): Hono {
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
  // GET /learner/stats - Aggregate stats across all packs for the current user
  // ---------------------------------------------------------------------------
  router.get('/stats', async (c) => {
    const userId = c.get('userId');
    const db = getDatabase();

    const [states, sessionCounts] = await Promise.all([
      db.query.learnerStates.findMany({
        where: eq(learnerStates.userId, userId),
        columns: {
          overallMastery: true,
          totalTimeSpentSeconds: true,
          blocksCompleted: true,
          lastActivityAt: true,
        },
      }),
      db
        .select({ totalSessions: sql<number>`count(*)` })
        .from(learningSessions)
        .where(eq(learningSessions.userId, userId)),
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const totalTimeMinutes = Math.round(
      states.reduce((sum, s) => sum + s.totalTimeSpentSeconds, 0) / 60
    );
    const totalBlocksCompleted = states.reduce((sum, s) => sum + s.blocksCompleted, 0);
    const averageMastery =
      states.length > 0 ? states.reduce((sum, s) => sum + s.overallMastery, 0) / states.length : 0;
    const packsActive = states.filter(
      (s) => s.lastActivityAt !== null && s.lastActivityAt >= thirtyDaysAgo
    ).length;
    const totalSessions = Number(sessionCounts[0]?.totalSessions ?? 0);

    return c.json({
      totalTimeMinutes,
      totalBlocksCompleted,
      averageMastery: Math.round(averageMastery * 1000) / 1000,
      packsStarted: states.length,
      packsActive,
      totalSessions,
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
    const deviceProfile = ConstraintEngine.inferProfile(deviceInfo);
    const overallMastery = Number(state.overallMastery);
    const blocksCompleted = Number(state.blocksCompleted);
    const initialExposure =
      (!Number.isFinite(overallMastery) || overallMastery <= 0) &&
      (!Number.isFinite(blocksCompleted) || blocksCompleted === 0);
    const teachingContext = PedagogyEngine.createContext(
      TeachingMode.L2_CONTEXTUAL,
      deviceProfile,
      { initialExposure }
    );

    // Create new session with teaching context
    const [session] = await db
      .insert(learningSessions)
      .values({
        userId,
        learnerStateId: state.id,
        status: 'active',
        deviceInfo,
        teachingMode: teachingContext.mode,
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
    const sessionMetricUpdates: Record<string, unknown> = {};

    if (eventData.eventType === 'completed') {
      const learnerState = await db.query.learnerStates.findFirst({
        where: eq(learnerStates.id, session.learnerStateId),
        columns: {
          id: true,
          contentPackId: true,
          retentionHistory: true,
        },
      });

      let updatedRetentionHistory: RetentionHistoryEntry[] | undefined;

      if (learnerState) {
        const block = await db.query.contentBlocks.findFirst({
          where: and(
            eq(contentBlocks.packId, learnerState.contentPackId),
            eq(contentBlocks.blockId, eventData.blockId)
          ),
          columns: {
            content: true,
          },
        });

        const schedule = parseRetentionSchedule(block?.content);
        const now = new Date();
        const existingHistory = parseRetentionHistory(learnerState.retentionHistory);
        const passed = (eventData.correctness ?? 0) >= 0.5;

        // A completion is treated as "with help" if the client tagged it
        // explicitly (helpRequested/helpUsed) OR a hint_used event for this
        // block already exists in this session.
        const responseData = eventData.responseData;
        const explicitHelp =
          responseData?.['helpRequested'] === true || responseData?.['helpUsed'] === true;
        const priorHintUsed = explicitHelp
          ? false
          : Boolean(
              await db.query.learnerProgressEvents.findFirst({
                where: and(
                  eq(learnerProgressEvents.userId, userId),
                  eq(learnerProgressEvents.learnerStateId, session.learnerStateId),
                  eq(learnerProgressEvents.blockId, eventData.blockId),
                  eq(learnerProgressEvents.eventType, 'hint_used')
                ),
              })
            );
        const helpRequested = explicitHelp || priorHintUsed;

        const computed = nextSchedule({
          taskId: eventData.blockId,
          passed,
          helpRequested,
          completedAt: now,
          decayHalfLifeDays: schedule.decayHalfLifeDays,
          history: existingHistory,
        });

        const retentionRecord: RetentionHistoryEntry = {
          taskId: eventData.blockId,
          date: now.toISOString(),
          pass: passed,
          daysSinceOriginal: 0,
          latencyMs: Math.max(0, (eventData.timeSpentSeconds ?? 0) * 1000),
          reassessAfterDays: computed.intervalDays,
          decayHalfLifeDays: schedule.decayHalfLifeDays,
          nextReassessAt: computed.nextReassessAt,
          stage: computed.stage,
          consecutivePasses: computed.consecutivePasses,
        };

        updatedRetentionHistory = [...existingHistory, retentionRecord].slice(
          -MAX_RETENTION_HISTORY_ENTRIES
        );
      }

      sessionMetricUpdates['blocksCompleted'] =
        sql`coalesce(${learningSessions.blocksCompleted}, 0) + 1`;
      sessionMetricUpdates['blocksAttempted'] =
        sql`coalesce(${learningSessions.blocksAttempted}, 0) + 1`;

      // Correct answer → increment problems solved
      if (eventData.correctness !== undefined && eventData.correctness >= 0.5) {
        sessionMetricUpdates['problemsSolved'] =
          sql`coalesce(${learningSessions.problemsSolved}, 0) + 1`;
      }

      // Wrong answer → increment errors
      if (eventData.correctness !== undefined && eventData.correctness < 0.5) {
        sessionMetricUpdates['errorsEncountered'] =
          sql`coalesce(${learningSessions.errorsEncountered}, 0) + 1`;
      }

      // Update learner state
      await db
        .update(learnerStates)
        .set({
          currentBlockId: eventData.blockId,
          lastActivityAt: new Date(),
          blocksCompleted: sql`coalesce(${learnerStates.blocksCompleted}, 0) + 1`,
          ...(updatedRetentionHistory ? { retentionHistory: updatedRetentionHistory } : {}),
        })
        .where(eq(learnerStates.id, session.learnerStateId));
    }

    if (eventData.eventType === 'hint_used') {
      // Requesting a hint counts as an implicit error signal
      sessionMetricUpdates['errorsEncountered'] =
        sql`coalesce(${learningSessions.errorsEncountered}, 0) + 1`;
    }

    if (eventData.eventType === 'skipped') {
      sessionMetricUpdates['errorsEncountered'] =
        sql`coalesce(${learningSessions.errorsEncountered}, 0) + 1`;
    }

    if (eventData.correctness !== undefined && eventData.eventType === 'completed') {
      sessionMetricUpdates['averageCorrectness'] = sql`
        (
          (coalesce(${learningSessions.averageCorrectness}, 0) * coalesce(${learningSessions.blocksAttempted}, 0))
          + ${eventData.correctness}
        ) / (coalesce(${learningSessions.blocksAttempted}, 0) + 1)
      `;
    }

    if (Object.keys(sessionMetricUpdates).length > 0) {
      await db
        .update(learningSessions)
        .set(sessionMetricUpdates)
        .where(eq(learningSessions.id, sessionId));
    }

    const refreshedSession =
      (await db.query.learningSessions.findFirst({
        where: and(
          eq(learningSessions.id, sessionId),
          eq(learningSessions.userId, userId),
          eq(learningSessions.status, 'active')
        ),
      })) ?? session;

    const deviceProfile = ConstraintEngine.inferProfile(
      refreshedSession.deviceInfo as Record<string, unknown> | null
    );

    const helpSeed =
      eventData.eventType === 'hint_used' &&
      (eventData.responseData?.['helpRequested'] === true ||
        eventData.responseData?.['helpUsed'] === true)
        ? [TriggerType.HELP_REQUESTED]
        : [];

    const teachingContext: TeachingContext = {
      mode: refreshedSession.teachingMode ?? TeachingMode.L2_CONTEXTUAL,
      deviceProfile,
      constraints: ConstraintEngine.getConstraints(deviceProfile),
      triggers: helpSeed,
      sessionStartTime: refreshedSession.startedAt,
      problemsSolved: refreshedSession.problemsSolved ?? 0,
      errorsEncountered: refreshedSession.errorsEncountered ?? 0,
    };

    const detected = TriggerDetector.detectTriggers(teachingContext);
    const triggers = [...new Set([...helpSeed, ...detected])];
    const suggestedMode = TriggerDetector.suggestModeElevation(teachingContext.mode, triggers);

    await db
      .update(learningSessions)
      .set({
        triggersFired: triggers,
        teachingMode: suggestedMode,
        deviceProfile,
      })
      .where(eq(learningSessions.id, sessionId));

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

    // ----- Badge award on pack completion -----
    let badgeAwarded = false;
    let issuedBadge: { id: string; verificationHash: string | null } | undefined;

    try {
      const learnerState = await db.query.learnerStates.findFirst({
        where: eq(learnerStates.id, session.learnerStateId),
        columns: {
          id: true,
          contentPackId: true,
          blocksCompleted: true,
          currentMode: true,
          overallMastery: true,
        },
      });

      if (learnerState !== undefined) {
        // Count total blocks in this pack
        const [blockCount] = await db
          .select({ total: sql<number>`count(*)` })
          .from(contentBlocks)
          .where(eq(contentBlocks.packId, learnerState.contentPackId));

        const totalBlocks = blockCount?.total ?? 0;
        const isComplete = totalBlocks > 0 && learnerState.blocksCompleted >= totalBlocks;

        if (isComplete) {
          // Guard against duplicate badges
          const existing = await db.query.badges.findFirst({
            where: and(
              eq(badges.userId, userId),
              eq(badges.contentPackId, learnerState.contentPackId),
              eq(badges.badgeType, 'completion'),
              isNull(badges.revokedAt)
            ),
            columns: { id: true },
          });

          if (existing === undefined) {
            const verificationHash = randomUUID();
            const [newBadge] = await db
              .insert(badges)
              .values({
                userId,
                contentPackId: learnerState.contentPackId,
                badgeType: 'completion',
                level: learnerState.currentMode,
                status: 'issued',
                masteryScore: learnerState.overallMastery,
                totalTimeSpent: (session.blocksCompleted ?? 0) * 60, // fallback estimate
                benchmarksPassed: 0,
                verificationHash,
                issuedAt: new Date(),
              })
              .returning({ id: badges.id, verificationHash: badges.verificationHash });

            if (newBadge !== undefined) {
              badgeAwarded = true;
              issuedBadge = newBadge;
            }
          }
        }
      }
    } catch {
      // Badge failure must never break session end
    }

    return c.json({
      message: 'Session ended successfully',
      sessionId,
      blocksCompleted: session.blocksCompleted,
      badgeAwarded,
      ...(issuedBadge !== undefined ? { badge: issuedBadge } : {}),
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

    const retentionQueue = buildRetentionQueue(
      parseRetentionHistory(state.retentionHistory),
      new Date()
    );

    return c.json({
      progress: {
        currentMode: state.currentMode,
        overallMastery: state.overallMastery,
        totalTimeSpentSeconds: state.totalTimeSpentSeconds,
        blocksCompleted: state.blocksCompleted,
        skillEstimates: state.skillEstimates,
        retentionHistory: state.retentionHistory,
        retentionQueue,
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
  // GET /learner/weekly-goal - Weekly learning goal summary
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // GET /learner/retention/queue
  // Aggregated due-task queue across all packs for the current learner.
  // Returns RetentionQueueSummary shape consumed by computeDecayAffordance.
  // ---------------------------------------------------------------------------
  router.get('/retention/queue', async (c) => {
    const userId = c.get('userId');
    const db = getDatabase();

    const states = await db.query.learnerStates.findMany({
      where: eq(learnerStates.userId, userId),
      columns: { retentionHistory: true },
    });

    const histories = states.map((state) => {
      const parsed = parseRetentionHistory(state.retentionHistory) as SchedulerRetentionEntry[];
      return parsed;
    });

    const queue = buildAggregateRetentionQueue(histories, new Date());

    return c.json(queue);
  });

  router.get('/weekly-goal', async (c) => {
    const userId = c.get('userId');
    const db = getDatabase();

    // Compute start of current ISO week (Monday)
    const now = new Date();
    const day = now.getUTCDay(); // 0 = Sunday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() + diffToMonday);
    weekStart.setUTCHours(0, 0, 0, 0);

    // Read stored weekly target from user metadata
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { metadata: true },
    });

    const meta = (user?.metadata ?? {}) as Record<string, unknown>;
    const targetMinutes =
      typeof meta['weeklyGoalMinutes'] === 'number' ? meta['weeklyGoalMinutes'] : 60;

    // Sum time from sessions completed this week
    const sessions = await db.query.learningSessions.findMany({
      where: and(eq(learningSessions.userId, userId), gte(learningSessions.startedAt, weekStart)),
      columns: { startedAt: true, endedAt: true, pausedDurationSeconds: true },
    });

    let completedSeconds = 0;
    const activeDays = new Set<string>();
    for (const s of sessions) {
      const endTime = s.endedAt ?? new Date();
      const rawSeconds = Math.max(0, (endTime.getTime() - s.startedAt.getTime()) / 1000);
      const paused = s.pausedDurationSeconds ?? 0;
      const completedSessionSeconds = Math.max(0, rawSeconds - paused);
      completedSeconds += completedSessionSeconds;
      activeDays.add(s.startedAt.toISOString().slice(0, 10));
    }

    return c.json({
      targetMinutes,
      completedMinutes: Math.round(completedSeconds / 60),
      daysActive: activeDays.size,
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /learner/weekly-goal - Update weekly learning target
  // ---------------------------------------------------------------------------
  const WeeklyGoalSchema = z.object({
    targetMinutes: z.number().int().min(15).max(10080), // 15 min to 1 week
  });

  router.patch('/weekly-goal', zValidator('json', WeeklyGoalSchema), async (c) => {
    const userId = c.get('userId');
    const { targetMinutes } = c.req.valid('json');
    const db = getDatabase();

    // Read current metadata
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { metadata: true },
    });

    const existing = (user?.metadata ?? {}) as Record<string, unknown>;
    const updated = { ...existing, weeklyGoalMinutes: targetMinutes };

    await db
      .update(users)
      .set({ metadata: updated, updatedAt: new Date() })
      .where(eq(users.id, userId));

    // Recompute this week's progress
    const now = new Date();
    const day = now.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() + diffToMonday);
    weekStart.setUTCHours(0, 0, 0, 0);

    const sessions = await db.query.learningSessions.findMany({
      where: and(eq(learningSessions.userId, userId), gte(learningSessions.startedAt, weekStart)),
      columns: { startedAt: true, endedAt: true, pausedDurationSeconds: true },
    });

    let completedSeconds = 0;
    const activeDays = new Set<string>();
    for (const s of sessions) {
      const endTime = s.endedAt ?? new Date();
      const rawSeconds = Math.max(0, (endTime.getTime() - s.startedAt.getTime()) / 1000);
      const paused = s.pausedDurationSeconds ?? 0;
      completedSeconds += rawSeconds - paused;
      activeDays.add(s.startedAt.toISOString().slice(0, 10));
    }

    return c.json({
      targetMinutes,
      completedMinutes: Math.round(completedSeconds / 60),
      daysActive: activeDays.size,
    });
  });

  // ---------------------------------------------------------------------------
  // POST /learner/session/:sessionId/teach - Get engine-backed teaching guidance
  // ---------------------------------------------------------------------------
  router.post('/session/:sessionId/teach', zValidator('json', TeachRequestSchema), async (c) => {
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

    if (blockId !== undefined) {
      const block = await db.query.contentBlocks.findFirst({
        where: and(
          eq(contentBlocks.packId, session.learnerState.contentPackId),
          eq(contentBlocks.blockId, blockId)
        ),
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

    // Re-seed any triggers that were stored during the most recent event so that
    // HELP_REQUESTED (set by caller, never auto-detected) survives the round-trip.
    const persistedTriggers = Array.isArray(session.triggersFired)
      ? (session.triggersFired as string[]).filter((t): t is TriggerType =>
          Object.values(TriggerType).includes(t as TriggerType)
        )
      : [];

    const context: TeachingContext = {
      mode: session.teachingMode ?? TeachingMode.L2_CONTEXTUAL,
      deviceProfile,
      constraints: ConstraintEngine.getConstraints(deviceProfile),
      triggers: persistedTriggers,
      sessionStartTime: session.startedAt,
      problemsSolved: session.problemsSolved ?? 0,
      errorsEncountered: session.errorsEncountered ?? 0,
    };

    // Run engine
    const response = PedagogyEngine.processTeachingRequest(context, teachingContent);

    // Check for mode elevation
    const triggers = TriggerDetector.detectTriggers(context);
    const suggestedMode = TriggerDetector.suggestModeElevation(context.mode, triggers);
    const elevatedMode = suggestedMode > response.mode ? suggestedMode : response.mode;

    if (elevatedMode > context.mode) {
      await db
        .update(learningSessions)
        .set({ teachingMode: elevatedMode, triggersFired: triggers })
        .where(eq(learningSessions.id, sessionId));
    }

    // Compute recommendedMode: elevation wins if active; otherwise consider fade
    // when the last few completed blocks were clean (high correctness, no hints).
    let recommendedMode = elevatedMode;
    if (elevatedMode <= context.mode) {
      const recentEvents = await db.query.learnerProgressEvents.findMany({
        where: eq(learnerProgressEvents.learnerStateId, session.learnerStateId),
        orderBy: [desc(learnerProgressEvents.occurredAt)],
        limit: 50,
      });

      const recentTrials = deriveRecentTrials(recentEvents);
      recommendedMode = TriggerDetector.suggestModeFade(context.mode, recentTrials);
    }

    return c.json({
      ...response,
      triggers,
      suggestedMode: elevatedMode,
      recommendedMode,
      currentMode: context.mode,
    });
  });

  return router;
}
