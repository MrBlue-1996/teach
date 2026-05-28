/**
 * Content Pack Schemas (TS-CONTENT-004)
 *
 * Zod schemas for validating content packs and teaching blocks.
 */

import { z } from 'zod';

import { learningModeSchema } from './learner.schema.js';

function isSemanticVersion(value: string): boolean {
  const [core, ...prereleaseParts] = value.split('-');
  const prerelease = prereleaseParts.length > 0 ? prereleaseParts.join('-') : undefined;
  const parts = core?.split('.') ?? [];

  if (parts.length !== 3 || parts.some((part) => part.length === 0 || !/^\d+$/.test(part))) {
    return false;
  }

  if (prerelease === undefined) {
    return true;
  }

  return (
    prerelease.length > 0 && prerelease.split('.').every((part) => /^[a-zA-Z0-9-]+$/.test(part))
  );
}

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
export const contentTagSchema = z.string().min(1).max(50);

/** Supported source-data statuses for demo and authorized content */
export const sourceDataStatusSchema = z.enum([
  'demo',
  'authorized',
  'requires-client-source',
  'deprecated',
]);

/** Locale code */
export const localeCodeSchema = z.string().regex(/^[a-z]{2}-[A-Z]{2}$/, 'Invalid locale code');

/** Translation status */
export const translationStatusSchema = z.enum(['planned', 'in-progress', 'complete']);

/** Authored-by metadata */
export const contentAuthorSchema = z
  .object({
    name: z.string().min(1).max(200),
    email: z.string().email().optional(),
  })
  .strict();

/** Device constraints for authored teaching responses */
export const deviceConstraintsSchema = z
  .object({
    maxResponseChars: z.number().int().min(200).max(50000),
  })
  .strict();

/** Trigger rule for adaptive support */
export const triggerRuleSchema = z
  .object({
    type: z.enum(['repeated_errors', 'stuck_time', 'help_requested']),
    threshold: z.number().int().min(1).optional(),
    unit: z.enum(['seconds']).optional(),
  })
  .strict();

/**
 * Structured stimulus rendered above prompt text. Ensures challenge prompts
 * that reference artifacts (ticket/huddle/station/etc.) are solvable as displayed.
 */
export const ticketStimulusSchema = z
  .object({
    kind: z.literal('ticket'),
    table: z.string().min(1).max(40),
    guests: z.number().int().min(1).max(99).optional(),
    server: z.string().min(1).max(40).optional(),
    time: z.string().min(1).max(20).optional(),
    items: z
      .array(
        z
          .object({
            quantity: z.number().int().min(1).max(99),
            name: z.string().min(1).max(120),
            modifiers: z.array(z.string().min(1).max(120)).readonly().optional(),
            cookTimeSeconds: z.number().int().min(15).max(7200).optional(),
          })
          .strict()
      )
      .min(1)
      .max(20)
      .readonly(),
    notes: z.string().max(200).optional(),
  })
  .strict();

export const stationStateStimulusSchema = z
  .object({
    kind: z.literal('station_state'),
    contextHeader: z.string().max(200).optional(),
    windowMinutes: z.number().int().min(1).max(240).optional(),
    observations: z.array(z.string().min(1).max(200)).min(1).max(15).readonly(),
  })
  .strict();

export const huddleNotesStimulusSchema = z
  .object({
    kind: z.literal('huddle_notes'),
    header: z.string().max(120).optional(),
    notes: z
      .array(
        z
          .object({
            label: z.string().min(1).max(40),
            detail: z.string().min(1).max(200),
          })
          .strict()
      )
      .min(1)
      .max(15)
      .readonly(),
  })
  .strict();

export const menuBoardStimulusSchema = z
  .object({
    kind: z.literal('menu_board'),
    header: z.string().max(120).optional(),
    features: z.array(z.string().min(1).max(200)).readonly().optional(),
    eightySixItems: z.array(z.string().min(1).max(120)).readonly().optional(),
    notes: z.array(z.string().min(1).max(200)).readonly().optional(),
  })
  .strict();

export const stepBankStimulusSchema = z
  .object({
    kind: z.literal('step_bank'),
    instruction: z.string().min(1).max(200).optional(),
    steps: z.array(z.string().min(1).max(200)).min(2).max(15).readonly(),
  })
  .strict();

export const plainTextStimulusSchema = z
  .object({
    kind: z.literal('plain_text'),
    monospace: z.boolean().optional(),
    lines: z.array(z.string().max(200)).min(1).max(30).readonly(),
  })
  .strict();

export const recipeStimulusSchema = z
  .object({
    kind: z.literal('recipe'),
    title: z.string().min(1).max(120),
    yields: z.string().min(1).max(60).optional(),
    prepTimeMinutes: z.number().int().min(0).max(1440).optional(),
    cookTimeMinutes: z.number().int().min(0).max(1440).optional(),
    ingredients: z
      .array(
        z
          .object({
            quantity: z.string().min(1).max(40),
            item: z.string().min(1).max(120),
            modifier: z.string().min(1).max(120).optional(),
          })
          .strict()
      )
      .min(1)
      .max(30)
      .readonly(),
    steps: z.array(z.string().min(1).max(300)).min(1).max(30).readonly(),
    notes: z.string().max(400).optional(),
    imageRef: z.string().min(1).max(200).optional(),
  })
  .strict();

export const imageStimulusSchema = z
  .object({
    kind: z.literal('image'),
    imageRef: z.string().min(1).max(200),
    altText: z
      .string()
      .max(300)
      .refine((value) => value.trim().length >= 4, {
        message: 'altText must be at least 4 non-whitespace characters',
      }),
    caption: z.string().max(400).optional(),
    focusRegions: z
      .array(
        z
          .object({
            label: z.string().min(1).max(60),
            xPct: z.number().min(0).max(100),
            yPct: z.number().min(0).max(100),
            widthPct: z.number().min(0.5).max(100),
            heightPct: z.number().min(0.5).max(100),
          })
          .strict()
      )
      .readonly()
      .optional(),
  })
  .strict();

export const kitchenImageManifestEntrySchema = z
  .object({
    path: z.string().min(1).max(500),
    altText: z
      .string()
      .max(300)
      .refine((value) => value.trim().length >= 4, {
        message: 'altText must be at least 4 non-whitespace characters',
      }),
    sourceDataStatus: sourceDataStatusSchema,
    licenseRef: z.string().min(1).max(500).nullable().optional(),
    tags: z.array(z.string().min(1).max(50)).readonly().optional(),
  })
  .strict();

export const kitchenImageManifestSchema = z
  .object({
    schemaVersion: z.string().refine(isSemanticVersion, 'Invalid semantic version'),
    defaultDimensions: z
      .object({
        widthPx: z.number().int().min(1).max(10000),
        heightPx: z.number().int().min(1).max(10000),
      })
      .strict()
      .optional(),
    entries: z.record(
      z
        .string()
        .min(1)
        .max(200)
        .refine((key) => !key.includes('..') && !/\.[a-z0-9]+$/i.test(key), {
          message: 'imageRef keys must be extensionless manifest paths',
        }),
      kitchenImageManifestEntrySchema
    ),
  })
  .strict();

export const challengeStimulusSchema = z.discriminatedUnion('kind', [
  ticketStimulusSchema,
  stationStateStimulusSchema,
  huddleNotesStimulusSchema,
  menuBoardStimulusSchema,
  stepBankStimulusSchema,
  plainTextStimulusSchema,
  recipeStimulusSchema,
  imageStimulusSchema,
]);

/** Structured module links */
export const moduleLinksSchema = z
  .object({
    fundamentalsTaught: z.array(z.string().min(1).max(100)).readonly(),
    downtimeDecisions: z.array(z.string().min(1).max(100)).readonly(),
    chaosEvents: z.array(z.string().min(1).max(100)).readonly(),
    externalAssessmentId: z.string().min(1).max(100).nullable().optional(),
    ticketFlows: z.array(z.string().min(1).max(100)).readonly(),
    triggerRules: z.array(triggerRuleSchema).min(1).readonly(),
  })
  .strict();

/** Asset catalog entry */
export const assetCatalogEntrySchema = z
  .object({
    id: z.string().min(1).max(100),
    title: z.string().min(1).max(200),
    sourceDataStatus: sourceDataStatusSchema,
    sourceReference: z.string().min(1).max(500).optional(),
  })
  .strict();

/** Asset catalog used by structured module links */
export const assetCatalogSchema = z
  .object({
    fundamentals: z.array(assetCatalogEntrySchema).readonly(),
    downtimeDecisions: z.array(assetCatalogEntrySchema).readonly(),
    chaosEvents: z.array(assetCatalogEntrySchema).readonly(),
    assessments: z.array(assetCatalogEntrySchema).readonly(),
    ticketFlows: z.array(assetCatalogEntrySchema).readonly(),
  })
  .strict();

/** Pack integrity metadata */
export const integrityMetadataSchema = z
  .object({
    releaseMode: z.enum(['demo', 'release']),
    checksum: z.string().min(1).nullable().optional(),
  })
  .strict();

/** Optional surfaced representation attached to a block */
export const teachingSurfaceSchema = z
  .object({
    surfaceType: z.string().min(1).max(50),
    content: z.string().min(1).max(10000),
  })
  .strict();

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
    blockId: z.string().min(1).max(100).optional(),
    title: z.string().min(1).max(200).optional(),
    objective: z.string().min(1).max(500).optional(),
    concept: z.string().min(1).max(200),
    type: z.string().min(1).max(50).optional(),
    targetMode: z.string().min(1).max(50).optional(),
    mode: learningModeSchema,
    content: z.string().min(1).max(10000).optional(),
    canonicalSolution: z.string().min(1).max(50000),
    explanation: z.string().min(1).max(10000),
    hint: z.string().min(1).max(1000).optional(),
    surfaceVariants: z.array(surfaceVariantSchema).min(2).readonly(),
    surfaces: z.array(teachingSurfaceSchema).readonly().optional(),
    tags: z.array(z.string().min(1).max(50)).readonly().optional(),
    timeBudgetSeconds: z.number().int().min(30).max(7200),
    difficulty: difficultyLevelSchema,
    prerequisites: z.array(teachingBlockIdSchema).readonly(),
    successCriteria: successCriteriaSchema,
    deviceConstraints: deviceConstraintsSchema.optional(),
    moduleLinks: moduleLinksSchema.optional(),
    stimulus: challengeStimulusSchema.optional(),
    hints: z.array(z.string().min(1).max(1000)).readonly(),
    commonErrors: z.array(commonErrorSchema).readonly(),
  })
  .strict();

/** Semantic version pattern */
export const semanticVersionSchema = z
  .string()
  .refine(isSemanticVersion, 'Invalid semantic version');

/** Content pack manifest (full schema for validation) */
export const contentPackManifestSchema = z
  .object({
    id: contentPackIdSchema,
    slug: z.string().min(1).max(200).optional(),
    name: z.string().min(1).max(200),
    title: z.string().min(1).max(200).optional(),
    version: semanticVersionSchema,
    description: z.string().min(1).max(2000),
    domain: z.string().min(1).max(100).optional(),
    certificationTarget: z.string().min(1).max(200).nullable().optional(),
    tags: z.array(contentTagSchema).min(1).readonly(),
    roleMappings: z.array(badgeIdSchema).readonly(),
    difficulty: difficultyLevelSchema,
    chromebookCompatible: z.boolean().optional(),
    targetDeviceProfile: z.string().min(1).max(100).optional(),
    status: z.string().min(1).max(50).optional(),
    locale: localeCodeSchema.optional(),
    translationStatus: z.record(localeCodeSchema, translationStatusSchema).optional(),
    minDeviceProfile: minDeviceProfileSchema,
    teachingBlocks: z.array(teachingBlockSchema).min(1).readonly(),
    assetCatalog: assetCatalogSchema.optional(),
    author: z.union([z.string().min(1).max(200), contentAuthorSchema]),
    metadata: z.record(z.unknown()).optional(),
    integrity: integrityMetadataSchema.optional(),
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
export type KitchenImageManifestSchema = z.infer<typeof kitchenImageManifestSchema>;
