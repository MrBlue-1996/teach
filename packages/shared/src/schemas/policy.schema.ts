/**
 * Policy Engine Schemas (TS-POLICY-005)
 *
 * Zod schemas for validating promotion policies and evaluation rules.
 */

import { z } from 'zod';

import { badgeIdSchema } from './content.schema.js';
import { learnerIdSchema, learningModeSchema, skillDomainSchema } from './learner.schema.js';

/** Policy version pattern (YYYY-MM-DD) */
export const policyVersionSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Policy version must be in YYYY-MM-DD format');

/** Signal type */
export const signalTypeSchema = z.enum([
  'benchmark_passes',
  'transfer_score',
  'time_efficiency',
  'retention',
  'explainability',
  'robustness',
  'correctness',
]);

/** Policy decision */
export const policyDecisionSchema = z.enum(['promote', 'demote', 'hold', 'defer', 'remediate']);

/** Multi-signal configuration */
export const multiSignalConfigSchema = z
  .object({
    requiredSignals: z.array(signalTypeSchema).min(1).readonly(),
    windowMinutes: z.number().int().min(1).max(43200), // Max 30 days
    consecutivePasses: z.number().int().min(1).max(20),
    transferThreshold: z.number().min(0).max(1),
    timePercentileThreshold: z.number().min(0).max(1),
    probationTasks: z.number().int().min(1).max(50),
    rollbackOnFailureRate: z.number().min(0).max(1),
  })
  .strict();

/** Employer requirements */
export const employerRequirementsSchema = z
  .object({
    requiredBadges: z.array(badgeIdSchema).readonly(),
    minRetentionDays: z.number().int().min(1).max(365),
    requiresProctoredCapstone: z.boolean(),
    promotionThresholds: multiSignalConfigSchema.partial().optional(),
  })
  .strict();

/** Promotion policy */
export const promotionPolicySchema = z
  .object({
    policyVersion: policyVersionSchema,
    multiSignal: multiSignalConfigSchema,
    domainOverrides: z.record(skillDomainSchema, multiSignalConfigSchema.partial()).optional(),
    employerRequirements: employerRequirementsSchema.optional(),
  })
  .strict();

/** Signal value */
export const signalValueSchema = z
  .object({
    type: signalTypeSchema,
    value: z.number().min(0),
    confidence: z.number().min(0).max(1),
    measuredAt: z.string().datetime(),
    evidenceIds: z.array(z.string()).readonly(),
  })
  .strict();

/** Policy evaluation input */
export const policyEvaluationInputSchema = z
  .object({
    learnerId: learnerIdSchema,
    domain: skillDomainSchema,
    currentMode: learningModeSchema,
    signals: z.array(signalValueSchema).readonly(),
    policy: promotionPolicySchema,
    inProbation: z.boolean(),
    probationTasksCompleted: z.number().int().min(0),
  })
  .strict();

/** Probe type */
export const probeTypeSchema = z.enum([
  'replication',
  'variation',
  'recovery',
  'time_boxed',
  'retention_24h',
  'retention_7d',
  'retention_30d',
  'far_transfer',
  'explainability',
]);

/** Recommended action */
export const recommendedActionSchema = z
  .object({
    type: z.enum(['continue', 'probe', 'remediate', 'review']),
    taskId: z.string().optional(),
    probeType: probeTypeSchema.optional(),
    remediationBlockId: z.string().optional(),
  })
  .strict();

/** Policy evaluation output */
export const policyEvaluationOutputSchema = z
  .object({
    decision: policyDecisionSchema,
    targetMode: learningModeSchema.optional(),
    reasoning: z.string().min(1).max(2000),
    contributingSignals: z.array(signalValueSchema).readonly(),
    missingSignals: z.array(signalTypeSchema).optional(),
    recommendedAction: recommendedActionSchema,
    evaluatedAt: z.string().datetime(),
    signature: z.string().min(1),
  })
  .strict();

/** Policy layer */
export const policyLayerSchema = z
  .object({
    name: z.enum(['safety', 'employer', 'learner', 'system']),
    priority: z.number().int().min(0).max(100),
    rules: z
      .array(
        z
          .object({
            id: z.string().min(1),
            description: z.string().min(1).max(500),
            condition: z.string().min(1).max(1000),
            action: policyDecisionSchema,
            terminal: z.boolean(),
          })
          .strict()
      )
      .readonly(),
  })
  .strict();

/** Policy audit record */
export const policyAuditRecordSchema = z
  .object({
    auditId: z.string().min(1),
    input: policyEvaluationInputSchema,
    output: policyEvaluationOutputSchema,
    policyVersion: policyVersionSchema,
    timestamp: z.string().datetime(),
    nodeId: z.string().min(1),
    signature: z.string().min(1),
  })
  .strict();

// Type exports
export type PolicyVersionSchema = z.infer<typeof policyVersionSchema>;
export type SignalTypeSchema = z.infer<typeof signalTypeSchema>;
export type PolicyDecisionSchema = z.infer<typeof policyDecisionSchema>;
export type MultiSignalConfigSchema = z.infer<typeof multiSignalConfigSchema>;
export type PromotionPolicySchema = z.infer<typeof promotionPolicySchema>;
export type SignalValueSchema = z.infer<typeof signalValueSchema>;
export type PolicyEvaluationInputSchema = z.infer<typeof policyEvaluationInputSchema>;
export type PolicyEvaluationOutputSchema = z.infer<typeof policyEvaluationOutputSchema>;
export type PolicyAuditRecordSchema = z.infer<typeof policyAuditRecordSchema>;
