/**
 * Content Pack Schemas (TS-CONTENT-004)
 *
 * Zod schemas for validating content packs and teaching blocks.
 */

import { z } from 'zod';

import { learningModeSchema } from './learner.schema.js';

/** Content pack ID pattern */
export const contentPackIdSchema = z
  .string()
  .regex(/^pack-[a-zA-Z0-9_-]+$/, 'Invalid content pack ID format');

/** Teaching block ID pattern */
export const teachingBlockIdSchema = z
  .string()
  .regex(/^tb-[a-zA-Z0-9_-]+$/, 'Invalid teaching block ID format');

/** Badge ID pattern */
export const badgeIdSchema = z.string().regex(/^badge-[a-zA-Z0-9_-]+$/, 'Invalid badge ID format');

/** Role ID pattern */
export const roleIdSchema = z.string().regex(/^role-[a-zA-Z0-9_-]+$/, 'Invalid role ID format');

/** Difficulty level */
export const difficultyLevelSchema = z.enum(['beginner', 'intermediate', 'advanced', 'expert']);

/** Content tag */
export const contentTagSchema = z.enum([
  'required',
  'recommended',
  'elective',
  'capstone',
  'retention',
]);

/** Minimum device profile */
export const minDeviceProfileSchema = z
  .object({
    ramMb: z.number().int().min(256).max(65536),
    networkKbps: z.number().int().min(0).max(1000000),
    requiresWebGL: z.boolean().optional(),
    requiresWebGPU: z.boolean().optional(),
    requiresWasm: z.boolean().optional(),
  })
  .strict();

/** Surface variant */
export const surfaceVariantSchema = z
  .object({
    id: z.string().min(1).max(50),
    description: z.string().min(1).max(500),
    data: z.record(z.unknown()),
  })
  .strict();

/** Success criteria */
export const successCriteriaSchema = z
  .object({
    minCorrectnessScore: z.number().min(0).max(1),
    maxTimeSeconds: z.number().int().min(1).max(86400),
    maxRetries: z.number().int().min(0).max(100),
    requiresExplanation: z.boolean(),
    customValidator: z.string().optional(),
  })
  .strict();

/** Common error */
export const commonErrorSchema = z
  .object({
    pattern: z.string().min(1).max(200),
    description: z.string().min(1).max(500),
    remediation: z.string().min(1).max(1000),
    relatedBlockId: teachingBlockIdSchema.optional(),
  })
  .strict();

/** Teaching block */
export const teachingBlockSchema = z
  .object({
    id: teachingBlockIdSchema,
    concept: z.string().min(1).max(200),
    mode: learningModeSchema,
    canonicalSolution: z.string().min(1).max(50000),
    explanation: z.string().min(1).max(10000),
    surfaceVariants: z.array(surfaceVariantSchema).min(2).readonly(),
    timeBudgetSeconds: z.number().int().min(30).max(7200),
    difficulty: difficultyLevelSchema,
    prerequisites: z.array(teachingBlockIdSchema).readonly(),
    successCriteria: successCriteriaSchema,
    hints: z.array(z.string().min(1).max(1000)).readonly(),
    commonErrors: z.array(commonErrorSchema).readonly(),
  })
  .strict();

/** Semantic version pattern */
export const semanticVersionSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/, 'Invalid semantic version');

/** Content pack manifest (full schema for validation) */
export const contentPackManifestSchema = z
  .object({
    id: contentPackIdSchema,
    name: z.string().min(1).max(200),
    version: semanticVersionSchema,
    description: z.string().min(1).max(2000),
    tags: z.array(contentTagSchema).min(1).readonly(),
    roleMappings: z.array(badgeIdSchema).readonly(),
    difficulty: difficultyLevelSchema,
    minDeviceProfile: minDeviceProfileSchema,
    teachingBlocks: z.array(teachingBlockSchema).min(1).readonly(),
    author: z.string().min(1).max(200),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    signature: z.string().min(1),
    signingKeyId: z.string().min(1).max(100),
    schemaVersion: semanticVersionSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    // If content has 'required' tag, it must have role mappings
    if (data.tags.includes('required') && data.roleMappings.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['roleMappings'],
        message: 'Content packs with required tag must have role mappings',
        params: { errorCode: 'MISSING_ROLE_MAPPING' },
      });
    }
  })
  .refine(
    (data) => {
      // Each teaching block must have at least 2 surface variants
      return data.teachingBlocks.every((block) => block.surfaceVariants.length >= 2);
    },
    { message: 'Each teaching block must have at least 2 surface variants' }
  );

/** Validation error */
export const validationErrorSchema = z
  .object({
    code: z.string().min(1),
    path: z.string(),
    message: z.string().min(1),
    severity: z.literal('error'),
  })
  .strict();

/** Validation warning */
export const validationWarningSchema = z
  .object({
    code: z.string().min(1),
    path: z.string(),
    message: z.string().min(1),
    severity: z.literal('warning'),
  })
  .strict();

/** Parity divergence */
export const parityDivergenceSchema = z
  .object({
    blockId: teachingBlockIdSchema,
    field: z.string().min(1),
    deterministicOutput: z.string(),
    llmOutput: z.string(),
    similarity: z.number().min(0).max(1),
  })
  .strict();

/** Parity test result */
export const parityTestResultSchema = z
  .object({
    passed: z.boolean(),
    divergenceCount: z.number().int().min(0),
    maxAllowedDivergence: z.number().int().min(0),
    divergences: z.array(parityDivergenceSchema).readonly(),
  })
  .strict();

/** Content pack validation result */
export const contentPackValidationResultSchema = z
  .object({
    valid: z.boolean(),
    errors: z.array(validationErrorSchema).readonly(),
    warnings: z.array(validationWarningSchema).readonly(),
    parityResults: parityTestResultSchema.optional(),
  })
  .strict();

/** Content pack revocation */
export const contentPackRevocationSchema = z
  .object({
    packId: contentPackIdSchema,
    version: semanticVersionSchema,
    reason: z.string().min(1).max(1000),
    revokedAt: z.string().datetime(),
    replacementPackId: contentPackIdSchema.optional(),
  })
  .strict();

// Type exports
export type ContentPackIdSchema = z.infer<typeof contentPackIdSchema>;
export type TeachingBlockIdSchema = z.infer<typeof teachingBlockIdSchema>;
export type BadgeIdSchema = z.infer<typeof badgeIdSchema>;
export type TeachingBlockSchema = z.infer<typeof teachingBlockSchema>;
export type ContentPackManifestSchema = z.infer<typeof contentPackManifestSchema>;
export type ContentPackValidationResultSchema = z.infer<typeof contentPackValidationResultSchema>;
