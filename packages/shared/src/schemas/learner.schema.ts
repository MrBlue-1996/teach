/**
 * Learner Schemas (TS-NLP-008)
 *
 * Zod schemas for runtime validation of learner-related data.
 */

import { z } from 'zod';

/** Learner ID pattern */
export const learnerIdSchema = z.string().regex(/^u-[a-zA-Z0-9_-]+$/, 'Invalid learner ID format');

/** Skill domain pattern */
export const skillDomainSchema = z.string().min(1).max(100);

/** Learning mode */
export const learningModeSchema = z.enum(['L0', 'L1', 'L2', 'L3', 'L4']);

/** Skill estimate */
export const skillEstimateSchema = z
  .object({
    score: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1),
    lastUpdated: z.string().datetime(),
    observationCount: z.number().int().min(0),
  })
  .strict();

/** Time efficiency metrics */
export const timeEfficiencySchema = z
  .object({
    medianMs: z.number().int().min(0),
    cohortPercentile: z.number().min(0).max(1),
    sampleSize: z.number().int().min(0),
  })
  .strict();

/** Retention record */
export const retentionRecordSchema = z
  .object({
    taskId: z.string().min(1),
    date: z.string().datetime(),
    pass: z.boolean(),
    daysSinceOriginal: z.number().int().min(0),
    latencyMs: z.number().int().min(0),
  })
  .strict();

/** Promotion record */
export const promotionRecordSchema = z
  .object({
    from: learningModeSchema,
    to: learningModeSchema,
    timestamp: z.string().datetime(),
    domain: skillDomainSchema,
    evidenceIds: z.array(z.string()).readonly(),
    isRollback: z.boolean(),
  })
  .strict();

/** Mastery score */
export const masteryScoreSchema = z
  .object({
    composite: z.number().min(0).max(1),
    components: z
      .object({
        transfer: z.number().min(0).max(1),
        robustness: z.number().min(0).max(1),
        retention: z.number().min(0).max(1),
        benchmarkPasses: z.number().min(0).max(1),
        timeEfficiency: z.number().min(0).max(1),
        explainability: z.number().min(0).max(1),
      })
      .strict(),
    weights: z
      .object({
        transfer: z.number().min(0).max(1),
        robustness: z.number().min(0).max(1),
        retention: z.number().min(0).max(1),
        benchmarkPasses: z.number().min(0).max(1),
        timeEfficiency: z.number().min(0).max(1),
        explainability: z.number().min(0).max(1),
      })
      .strict(),
  })
  .strict();

/** Complete learner state */
export const learnerStateSchema = z
  .object({
    learnerId: learnerIdSchema,
    skillEstimates: z.record(skillDomainSchema, skillEstimateSchema),
    timeEfficiency: timeEfficiencySchema,
    transferScore: z.number().min(0).max(1),
    retentionHistory: z.array(retentionRecordSchema).readonly(),
    promotionHistory: z.array(promotionRecordSchema).readonly(),
    lastActivity: z.string().datetime(),
    currentModes: z.record(skillDomainSchema, learningModeSchema),
    probationWindows: z.record(skillDomainSchema, z.number().int().min(0)),
    masteryScore: masteryScoreSchema,
  })
  .strict();

/** Learner event type */
export const learnerEventTypeSchema = z.enum([
  'task_started',
  'task_completed',
  'task_abandoned',
  'promotion',
  'rollback',
  'retention_check',
  'benchmark_attempt',
  'calibration',
]);

/** Learner event */
export const learnerEventSchema = z
  .object({
    eventId: z.string().min(1),
    learnerId: learnerIdSchema,
    eventType: learnerEventTypeSchema,
    timestamp: z.string().datetime(),
    payload: z.record(z.unknown()),
    nonce: z.string().min(16).max(64),
    signature: z.string().optional(),
  })
  .strict();

/** Calibration result */
export const calibrationResultSchema = z
  .object({
    completionTimeMs: z.number().int().min(0),
    firstAction: z.enum(['view_solution', 'attempt_direct', 'request_hint']),
    retryCount: z.number().int().min(0),
    pastedContent: z.boolean(),
    recommendedMode: learningModeSchema,
    confidence: z.number().min(0).max(1),
  })
  .strict();

// Type exports inferred from schemas
export type LearnerIdSchema = z.infer<typeof learnerIdSchema>;
export type LearningModeSchema = z.infer<typeof learningModeSchema>;
export type SkillEstimateSchema = z.infer<typeof skillEstimateSchema>;
export type TimeEfficiencySchema = z.infer<typeof timeEfficiencySchema>;
export type RetentionRecordSchema = z.infer<typeof retentionRecordSchema>;
export type PromotionRecordSchema = z.infer<typeof promotionRecordSchema>;
export type MasteryScoreSchema = z.infer<typeof masteryScoreSchema>;
export type LearnerStateSchema = z.infer<typeof learnerStateSchema>;
export type LearnerEventSchema = z.infer<typeof learnerEventSchema>;
export type CalibrationResultSchema = z.infer<typeof calibrationResultSchema>;
