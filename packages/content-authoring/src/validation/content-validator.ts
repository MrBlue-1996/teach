/**
 * Content Pack Validator (TS-CONTENT-004)
 *
 * Validates content packs against schema, business rules,
 * and parity requirements.
 */

import { ParityValidator, type LLMFormattedOutput } from '@topshelf/deterministic-formatter';
import {
  contentPackManifestSchema,
  type ContentPackManifest,
  type ContentPackValidationResult,
  type ValidationError,
  type ValidationWarning,
} from '@topshelf/shared';

import type { ZodError } from 'zod';

/** Validation options */
export interface ValidationOptions {
  /** Skip parity validation */
  readonly skipParityCheck?: boolean;
  /** Skip signature verification */
  readonly skipSignatureCheck?: boolean;
  /** LLM outputs for parity check */
  readonly llmOutputs?: ReadonlyMap<string, LLMFormattedOutput>;
  /** Strict mode - treat warnings as errors */
  readonly strict?: boolean;
  /** Source file path used for filename-to-id consistency checks */
  readonly sourcePath?: string;
}

const OFFICIAL_CLAIM_PATTERN = /official\s+uncle\s+julio[\u2019']?s/i;

const STRUCTURED_ASSET_FIELDS = [
  {
    catalogKey: 'fundamentals' as const,
    linkKey: 'fundamentalsTaught' as const,
    orphanCode: 'ORPHAN_FUNDAMENTAL',
    unresolvedCode: 'MISSING_FUNDAMENTAL_REFERENCE',
  },
  {
    catalogKey: 'downtimeDecisions' as const,
    linkKey: 'downtimeDecisions' as const,
    orphanCode: 'ORPHAN_DOWNTIME_DECISION',
    unresolvedCode: 'MISSING_DOWNTIME_DECISION_REFERENCE',
  },
  {
    catalogKey: 'chaosEvents' as const,
    linkKey: 'chaosEvents' as const,
    orphanCode: 'ORPHAN_CHAOS_EVENT',
    unresolvedCode: 'MISSING_CHAOS_EVENT_REFERENCE',
  },
  {
    catalogKey: 'ticketFlows' as const,
    linkKey: 'ticketFlows' as const,
    orphanCode: 'ORPHAN_TICKET_FLOW',
    unresolvedCode: 'MISSING_TICKET_FLOW_REFERENCE',
  },
];

const PER_PACK_REQUIRED_STIMULUS: Record<string, ReadonlySet<string>> = {
  'pack-uncle-julios-v1': new Set([
    'tb-uj-tools-color-barriers',
    'tb-uj-station-setup',
    'tb-uj-line-readiness',
    'tb-uj-ticket-flow-basics',
    'tb-uj-downtime-decisions',
    'tb-uj-cleaning-reset',
  ]),
};

const GENERIC_STIMULUS_EXEMPT = new Set(['orientation-safety', 'assessment-gate']);

const STIMULUS_KEYWORDS = [
  /\bticket\b/i,
  /\bhuddle\b/i,
  /\byour station\b/i,
  /\bstation has\b/i,
  /\bstation is\b/i,
  /\bthe board\b/i,
  /\bmenu board\b/i,
  /\border\b/i,
  /\bexpo fires\b/i,
];

function expectedPackIdFromSourcePath(sourcePath: string): string | null {
  const normalizedPath = sourcePath.replace(/\\/g, '/');
  const fileName = normalizedPath.split('/').at(-1);
  if (fileName === undefined) {
    return null;
  }

  if (!fileName.startsWith('content_pack_') || !fileName.endsWith('.json')) {
    return null;
  }

  const normalizedName = fileName.slice('content_pack_'.length, -'.json'.length).replace(/_/g, '-');
  return `pack-${normalizedName}`;
}

function getRecordValue(record: Record<string, unknown>, key: string): unknown {
  if (!Object.hasOwn(record, key)) return undefined;
  // eslint-disable-next-line security/detect-object-injection
  return record[key];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collectReferencedResponseStrings(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectReferencedResponseStrings(item));
  }

  return [];
}

function blockHasInlineAssessment(block: ContentPackManifest['teachingBlocks'][number]): boolean {
  return block.surfaceVariants.some((variant) => {
    const data = variant.data;
    if (!isRecord(data)) {
      return false;
    }

    const assessmentId = getRecordValue(data, 'assessmentId');
    const type = getRecordValue(data, 'type');
    return typeof assessmentId === 'string' || type === 'manager_signoff';
  });
}

function hasAuthorizedSourceReference(pack: ContentPackManifest): boolean {
  if (pack.assetCatalog === undefined) {
    return false;
  }

  const catalogGroups = [
    pack.assetCatalog.fundamentals,
    pack.assetCatalog.downtimeDecisions,
    pack.assetCatalog.chaosEvents,
    pack.assetCatalog.assessments,
    pack.assetCatalog.ticketFlows,
  ];

  return catalogGroups.some((group) =>
    group.some(
      (entry) => entry.sourceDataStatus === 'authorized' && entry.sourceReference !== undefined
    )
  );
}

/**
 * Content pack validator
 */
export class ContentPackValidator {
  private readonly parityValidator: ParityValidator;

  constructor() {
    this.parityValidator = new ParityValidator();
  }

  /**
   * Validate a content pack
   */
  validate(pack: unknown, options: ValidationOptions = {}): ContentPackValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Step 1: Schema validation
    const schemaResult = this.validateSchema(pack);
    if (!schemaResult.valid) {
      errors.push(...schemaResult.errors);
      // Cannot continue validation without valid schema
      return { valid: false, errors, warnings };
    }

    const validPack = pack as ContentPackManifest;

    // Step 2: Business rule validation
    const businessErrors = this.validateBusinessRules(validPack, options.sourcePath);
    errors.push(...businessErrors.errors);
    warnings.push(...businessErrors.warnings);

    // Step 3: Content consistency validation
    const contentErrors = this.validateContentConsistency(validPack);
    errors.push(...contentErrors.errors);
    warnings.push(...contentErrors.warnings);

    // Step 4: Signature validation (unless skipped)
    if (options.skipSignatureCheck !== true) {
      const signatureResult = this.validateSignature(validPack);
      if (!signatureResult.valid) {
        errors.push(...signatureResult.errors);
      }
    }

    // Step 5: Parity validation (if LLM outputs provided)
    let parityResults = undefined;
    if (options.skipParityCheck !== true && options.llmOutputs !== undefined) {
      parityResults = this.parityValidator.validateBatch(
        validPack.teachingBlocks,
        options.llmOutputs as ReadonlyMap<`tb-${string}`, LLMFormattedOutput>
      );
      if (!parityResults.passed) {
        errors.push({
          code: 'PARITY_FAILURE',
          path: 'teachingBlocks',
          message: `Parity check failed with ${parityResults.divergenceCount} divergences`,
          severity: 'error',
        });
      }
    }

    // Determine final validity
    const isValid =
      options.strict === true ? errors.length === 0 && warnings.length === 0 : errors.length === 0;

    return {
      valid: isValid,
      errors,
      warnings,
      ...(parityResults !== undefined ? { parityResults } : {}),
    };
  }

  /**
   * Validate against Zod schema
   */
  private validateSchema(pack: unknown): {
    valid: boolean;
    errors: ValidationError[];
  } {
    try {
      contentPackManifestSchema.parse(pack);
      return { valid: true, errors: [] };
    } catch (err) {
      const zodError = err as ZodError;
      const errors: ValidationError[] = zodError.errors.map((issue) => {
        if (issue.code === 'custom') {
          const customParams = issue.params as { errorCode?: string } | undefined;
          return {
            code: customParams?.errorCode ?? 'SCHEMA_CUSTOM',
            path: issue.path.join('.'),
            message: issue.message,
            severity: 'error' as const,
          };
        }
        return {
          code: 'SCHEMA_' + issue.code.toUpperCase(),
          path: issue.path.join('.'),
          message: issue.message,
          severity: 'error' as const,
        };
      });
      return { valid: false, errors };
    }
  }

  /**
   * Validate business rules
   */
  private validateBusinessRules(
    pack: ContentPackManifest,
    sourcePath?: string
  ): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (sourcePath !== undefined) {
      const expectedPackId = expectedPackIdFromSourcePath(sourcePath);
      if (expectedPackId !== null && pack.id !== expectedPackId) {
        errors.push({
          code: 'PACK_FILENAME_ID_MISMATCH',
          path: 'id',
          message: `Pack ID ${pack.id} does not match filename-derived ID ${expectedPackId}`,
          severity: 'error',
        });
      }
    }

    if (pack.assetCatalog !== undefined && pack.locale === undefined) {
      errors.push({
        code: 'MISSING_LOCALE',
        path: 'locale',
        message: 'Structured content packs must declare a locale.',
        severity: 'error',
      });
    }

    if (
      pack.integrity?.releaseMode === 'release' &&
      (pack.integrity.checksum === null || pack.integrity.checksum === undefined)
    ) {
      errors.push({
        code: 'MISSING_RELEASE_CHECKSUM',
        path: 'integrity.checksum',
        message: 'Release-mode content packs must include a checksum.',
        severity: 'error',
      });
    }

    if (
      pack.integrity?.releaseMode === 'demo' &&
      (pack.integrity.checksum === null || pack.integrity.checksum === undefined)
    ) {
      warnings.push({
        code: 'DEMO_CHECKSUM_SKIPPED',
        path: 'integrity.checksum',
        message:
          'Demo-mode content packs may omit a checksum, but packaged releases should supply one.',
        severity: 'warning',
      });
    }

    if (OFFICIAL_CLAIM_PATTERN.test(JSON.stringify(pack)) && !hasAuthorizedSourceReference(pack)) {
      errors.push({
        code: 'UNAUTHORIZED_OFFICIAL_CLAIM',
        path: '<root>',
        message:
          "Official Uncle Julio's claims require at least one authorized source reference in the pack asset catalog.",
        severity: 'error',
      });
    }

    // Rule: Required packs must have role mappings
    if (pack.tags.includes('required') && pack.roleMappings.length === 0) {
      errors.push({
        code: 'MISSING_ROLE_MAPPING',
        path: 'roleMappings',
        message: 'Content packs with "required" tag must have role mappings',
        severity: 'error',
      });
    }

    // Rule: Check for duplicate teaching block IDs
    const blockIds = new Set<string>();
    for (const block of pack.teachingBlocks) {
      if (blockIds.has(block.id)) {
        errors.push({
          code: 'DUPLICATE_BLOCK_ID',
          path: `teachingBlocks.${block.id}`,
          message: `Duplicate teaching block ID: ${block.id}`,
          severity: 'error',
        });
      }
      blockIds.add(block.id);
    }

    // Rule: All prerequisites must exist within the pack
    for (const block of pack.teachingBlocks) {
      for (const prereq of block.prerequisites) {
        if (!blockIds.has(prereq)) {
          errors.push({
            code: 'MISSING_PREREQUISITE',
            path: `teachingBlocks.${block.id}.prerequisites`,
            message: `Prerequisite ${prereq} not found in pack`,
            severity: 'error',
          });
        }
      }
    }

    // Warning: Large packs may have performance issues
    if (pack.teachingBlocks.length > 50) {
      warnings.push({
        code: 'LARGE_PACK',
        path: 'teachingBlocks',
        message: `Pack contains ${pack.teachingBlocks.length} blocks, consider splitting`,
        severity: 'warning',
      });
    }

    // Warning: Check for very long canonical solutions
    for (const block of pack.teachingBlocks) {
      if (block.canonicalSolution.length > 10000) {
        warnings.push({
          code: 'LONG_SOLUTION',
          path: `teachingBlocks.${block.id}.canonicalSolution`,
          message: 'Canonical solution exceeds 10000 characters',
          severity: 'warning',
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate content consistency
   */
  private validateContentConsistency(pack: ContentPackManifest): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const referencedAssets = {
      fundamentals: new Map<string, number>(),
      downtimeDecisions: new Map<string, number>(),
      chaosEvents: new Map<string, number>(),
      assessments: new Map<string, number>(),
      ticketFlows: new Map<string, number>(),
    };

    const catalogMaps =
      pack.assetCatalog === undefined
        ? undefined
        : {
            fundamentals: new Map(pack.assetCatalog.fundamentals.map((entry) => [entry.id, entry])),
            downtimeDecisions: new Map(
              pack.assetCatalog.downtimeDecisions.map((entry) => [entry.id, entry])
            ),
            chaosEvents: new Map(pack.assetCatalog.chaosEvents.map((entry) => [entry.id, entry])),
            assessments: new Map(pack.assetCatalog.assessments.map((entry) => [entry.id, entry])),
            ticketFlows: new Map(pack.assetCatalog.ticketFlows.map((entry) => [entry.id, entry])),
          };

    if (pack.assetCatalog !== undefined) {
      const globalAssetIds = new Map<string, string>();
      for (const catalogName of [
        'fundamentals',
        'downtimeDecisions',
        'chaosEvents',
        'assessments',
        'ticketFlows',
      ] as const) {
        // eslint-disable-next-line security/detect-object-injection
        const entries = pack.assetCatalog[catalogName];
        for (const entry of entries) {
          const seenInCatalog = globalAssetIds.get(entry.id);
          if (seenInCatalog !== undefined) {
            errors.push({
              code: 'DUPLICATE_ASSET_ID',
              path: `assetCatalog.${catalogName}.${entry.id}`,
              message: `Asset ID ${entry.id} is duplicated in ${seenInCatalog} and ${catalogName}.`,
              severity: 'error',
            });
          } else {
            globalAssetIds.set(entry.id, catalogName);
          }

          if (entry.sourceDataStatus === 'authorized' && entry.sourceReference === undefined) {
            errors.push({
              code: 'MISSING_AUTHORIZED_SOURCE_REFERENCE',
              path: `assetCatalog.${catalogName}.${entry.id}.sourceReference`,
              message: `Authorized asset ${entry.id} must include a source reference.`,
              severity: 'error',
            });
          }
        }
      }
    }

    for (const block of pack.teachingBlocks) {
      const requiredStimulusForPack = PER_PACK_REQUIRED_STIMULUS[pack.id];
      if (requiredStimulusForPack?.has(block.id) === true) {
        if (block.stimulus === undefined) {
          errors.push({
            code: 'STIMULUS_REQUIRED',
            path: `teachingBlocks.${block.id}.stimulus`,
            message:
              'Challenge prompt references an external artifact, but no stimulus is attached.',
            severity: 'error',
          });
        }
      } else if (block.stimulus === undefined) {
        const isExempt = Array.from(GENERIC_STIMULUS_EXEMPT).some((fragment) =>
          block.id.includes(fragment)
        );
        if (!isExempt) {
          const surfacePrompts: string[] = [];
          for (const variant of block.surfaceVariants) {
            const data = variant.data;
            if (!isRecord(data)) {
              continue;
            }

            const prompt = getRecordValue(data, 'prompt');
            if (typeof prompt === 'string') {
              surfacePrompts.push(prompt);
            }
          }

          const promptText = [
            block.concept,
            block.canonicalSolution,
            block.explanation,
            ...block.hints,
            ...surfacePrompts,
          ].join(' ');
          if (STIMULUS_KEYWORDS.some((pattern) => pattern.test(promptText))) {
            errors.push({
              code: 'STIMULUS_REQUIRED',
              path: `teachingBlocks.${block.id}.stimulus`,
              message:
                'Prompt appears to reference ticket/station/huddle/menu artifacts but no stimulus is attached.',
              severity: 'error',
            });
          }
        }
      }

      if (pack.assetCatalog !== undefined) {
        if (block.title === undefined) {
          errors.push({
            code: 'MISSING_BLOCK_TITLE',
            path: `teachingBlocks.${block.id}.title`,
            message: 'Structured content packs must provide a block title.',
            severity: 'error',
          });
        }

        if (block.objective === undefined) {
          errors.push({
            code: 'MISSING_BLOCK_OBJECTIVE',
            path: `teachingBlocks.${block.id}.objective`,
            message: 'Structured content packs must provide a block objective.',
            severity: 'error',
          });
        }

        if (block.deviceConstraints === undefined) {
          errors.push({
            code: 'MISSING_DEVICE_CONSTRAINTS',
            path: `teachingBlocks.${block.id}.deviceConstraints`,
            message: 'Structured content packs must declare device constraints per block.',
            severity: 'error',
          });
        }

        if (block.moduleLinks === undefined) {
          errors.push({
            code: 'MISSING_MODULE_LINKS',
            path: `teachingBlocks.${block.id}.moduleLinks`,
            message: 'Structured content packs must provide structured module links.',
            severity: 'error',
          });
        }
      }

      // Check surface variants have unique IDs
      const variantIds = new Set<string>();
      for (const variant of block.surfaceVariants) {
        if (variantIds.has(variant.id)) {
          errors.push({
            code: 'DUPLICATE_VARIANT_ID',
            path: `teachingBlocks.${block.id}.surfaceVariants.${variant.id}`,
            message: `Duplicate surface variant ID: ${variant.id}`,
            severity: 'error',
          });
        }
        variantIds.add(variant.id);

        const sourceDataStatus = isRecord(variant.data)
          ? getRecordValue(variant.data, 'sourceDataStatus')
          : undefined;
        if (
          sourceDataStatus !== undefined &&
          sourceDataStatus !== 'demo' &&
          sourceDataStatus !== 'authorized' &&
          sourceDataStatus !== 'requires-client-source' &&
          sourceDataStatus !== 'deprecated'
        ) {
          let sourceDataStatusLabel: string;
          if (typeof sourceDataStatus === 'string') {
            sourceDataStatusLabel = sourceDataStatus;
          } else if (typeof sourceDataStatus === 'object') {
            sourceDataStatusLabel = JSON.stringify(sourceDataStatus);
          } else if (
            typeof sourceDataStatus === 'number' ||
            typeof sourceDataStatus === 'boolean' ||
            typeof sourceDataStatus === 'bigint' ||
            typeof sourceDataStatus === 'symbol'
          ) {
            sourceDataStatusLabel = sourceDataStatus.toString();
          } else {
            sourceDataStatusLabel = typeof sourceDataStatus;
          }
          errors.push({
            code: 'INVALID_SOURCE_DATA_STATUS',
            path: `teachingBlocks.${block.id}.surfaceVariants.${variant.id}.data.sourceDataStatus`,
            message: `Unsupported sourceDataStatus value: ${sourceDataStatusLabel}`,
            severity: 'error',
          });
        }
      }

      // Check hints are not empty
      for (let i = 0; i < block.hints.length; i++) {
        // eslint-disable-next-line security/detect-object-injection
        const hint = block.hints[i];
        if (hint?.trim().length === 0) {
          errors.push({
            code: 'EMPTY_HINT',
            path: `teachingBlocks.${block.id}.hints[${i}]`,
            message: 'Hint cannot be empty',
            severity: 'error',
          });
        }
      }

      // Check time budget is reasonable for difficulty
      const minTimeByDifficulty = {
        beginner: 30,
        intermediate: 60,
        advanced: 120,
        expert: 180,
      };
      const minTime = minTimeByDifficulty[block.difficulty];
      if (block.timeBudgetSeconds < minTime) {
        warnings.push({
          code: 'SHORT_TIME_BUDGET',
          path: `teachingBlocks.${block.id}.timeBudgetSeconds`,
          message: `Time budget ${block.timeBudgetSeconds}s may be too short for ${block.difficulty} difficulty`,
          severity: 'warning',
        });
      }

      if (block.deviceConstraints !== undefined) {
        const maxResponseChars = block.deviceConstraints.maxResponseChars;
        if (block.explanation.length > maxResponseChars) {
          errors.push({
            code: 'RESPONSE_CAP_EXCEEDED',
            path: `teachingBlocks.${block.id}.explanation`,
            message: `Explanation exceeds maxResponseChars (${maxResponseChars}).`,
            severity: 'error',
          });
        }

        for (let i = 0; i < block.hints.length; i++) {
          // eslint-disable-next-line security/detect-object-injection
          const hint = block.hints[i];
          if (hint !== undefined && hint.length > maxResponseChars) {
            errors.push({
              code: 'RESPONSE_CAP_EXCEEDED',
              path: `teachingBlocks.${block.id}.hints[${i}]`,
              message: `Hint exceeds maxResponseChars (${maxResponseChars}).`,
              severity: 'error',
            });
          }
        }

        if (block.content !== undefined && block.content.length > maxResponseChars) {
          errors.push({
            code: 'RESPONSE_CAP_EXCEEDED',
            path: `teachingBlocks.${block.id}.content`,
            message: `Content exceeds maxResponseChars (${maxResponseChars}).`,
            severity: 'error',
          });
        }

        for (let i = 0; i < block.surfaceVariants.length; i++) {
          // eslint-disable-next-line security/detect-object-injection
          const variant = block.surfaceVariants[i];
          const data = variant?.data;
          if (!isRecord(data)) {
            continue;
          }

          for (const key of ['expected', 'passingCriteria', 'expectedResponse']) {
            const candidate = getRecordValue(data, key);
            for (const responseText of collectReferencedResponseStrings(candidate)) {
              if (responseText.length > maxResponseChars) {
                errors.push({
                  code: 'RESPONSE_CAP_EXCEEDED',
                  path: `teachingBlocks.${block.id}.surfaceVariants[${i}].data.${key}`,
                  message: `${key} exceeds maxResponseChars (${maxResponseChars}).`,
                  severity: 'error',
                });
              }
            }
          }
        }
      }

      if (block.moduleLinks !== undefined) {
        if (
          (block.moduleLinks.externalAssessmentId === null ||
            block.moduleLinks.externalAssessmentId === undefined) &&
          !blockHasInlineAssessment(block)
        ) {
          errors.push({
            code: 'MISSING_ASSESSMENT_LINK',
            path: `teachingBlocks.${block.id}.moduleLinks.externalAssessmentId`,
            message:
              'Each structured module must provide an external assessment or inline assessment.',
            severity: 'error',
          });
        }

        for (const [i, rule] of block.moduleLinks.triggerRules.entries()) {
          if (rule.type === 'repeated_errors' && rule.threshold === undefined) {
            errors.push({
              code: 'INVALID_TRIGGER_RULE',
              path: `teachingBlocks.${block.id}.moduleLinks.triggerRules[${i}]`,
              message: 'repeated_errors trigger rules require a numeric threshold.',
              severity: 'error',
            });
          }

          if (
            rule.type === 'stuck_time' &&
            (rule.threshold === undefined || rule.unit !== 'seconds')
          ) {
            errors.push({
              code: 'INVALID_TRIGGER_RULE',
              path: `teachingBlocks.${block.id}.moduleLinks.triggerRules[${i}]`,
              message: 'stuck_time trigger rules require a numeric threshold and unit "seconds".',
              severity: 'error',
            });
          }

          if (rule.type === 'help_requested' && rule.threshold !== 1) {
            errors.push({
              code: 'INVALID_TRIGGER_RULE',
              path: `teachingBlocks.${block.id}.moduleLinks.triggerRules[${i}]`,
              message: 'help_requested trigger rules must use threshold 1.',
              severity: 'error',
            });
          }
        }

        if (catalogMaps !== undefined) {
          for (const config of STRUCTURED_ASSET_FIELDS) {
            const referencedIds = block.moduleLinks[config.linkKey];
            for (const assetId of referencedIds) {
              const asset = catalogMaps[config.catalogKey].get(assetId);
              if (asset === undefined) {
                errors.push({
                  code: config.unresolvedCode,
                  path: `teachingBlocks.${block.id}.moduleLinks.${config.linkKey}`,
                  message: `Referenced asset ${assetId} is not defined in assetCatalog.${config.catalogKey}.`,
                  severity: 'error',
                });
              } else {
                const count = referencedAssets[config.catalogKey].get(asset.id) ?? 0;
                referencedAssets[config.catalogKey].set(asset.id, count + 1);
              }
            }
          }

          const externalAssessmentId = block.moduleLinks.externalAssessmentId;
          if (externalAssessmentId !== null && externalAssessmentId !== undefined) {
            if (!catalogMaps.assessments.has(externalAssessmentId)) {
              errors.push({
                code: 'MISSING_ASSESSMENT_REFERENCE',
                path: `teachingBlocks.${block.id}.moduleLinks.externalAssessmentId`,
                message: `Referenced assessment ${externalAssessmentId} is not defined in assetCatalog.assessments.`,
                severity: 'error',
              });
            } else {
              const count = referencedAssets.assessments.get(externalAssessmentId) ?? 0;
              referencedAssets.assessments.set(externalAssessmentId, count + 1);
            }
          }
        }
      }
    }

    if (pack.assetCatalog !== undefined) {
      for (const config of STRUCTURED_ASSET_FIELDS) {
        for (const entry of pack.assetCatalog[config.catalogKey]) {
          if ((referencedAssets[config.catalogKey].get(entry.id) ?? 0) === 0) {
            errors.push({
              code: config.orphanCode,
              path: `assetCatalog.${config.catalogKey}.${entry.id}`,
              message: `Asset ${entry.id} is not referenced by any module.`,
              severity: 'error',
            });
          }
        }
      }

      for (const entry of pack.assetCatalog.assessments) {
        if ((referencedAssets.assessments.get(entry.id) ?? 0) === 0) {
          errors.push({
            code: 'ORPHAN_ASSESSMENT',
            path: `assetCatalog.assessments.${entry.id}`,
            message: `Assessment ${entry.id} is not referenced by any module.`,
            severity: 'error',
          });
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate content pack signature
   */
  private validateSignature(pack: ContentPackManifest): {
    valid: boolean;
    errors: ValidationError[];
  } {
    // In production, verify signature against KMS/HSM
    // For now, just check signature format
    if (!pack.signature.startsWith('sig-')) {
      return {
        valid: false,
        errors: [
          {
            code: 'INVALID_SIGNATURE_FORMAT',
            path: 'signature',
            message: 'Invalid signature format',
            severity: 'error',
          },
        ],
      };
    }

    if (pack.signingKeyId.length === 0) {
      return {
        valid: false,
        errors: [
          {
            code: 'MISSING_SIGNING_KEY',
            path: 'signingKeyId',
            message: 'Missing signing key ID',
            severity: 'error',
          },
        ],
      };
    }

    return { valid: true, errors: [] };
  }
}

/**
 * Quick validation function for CI
 */
export function validateContentPack(
  pack: unknown,
  options?: ValidationOptions
): ContentPackValidationResult {
  const validator = new ContentPackValidator();
  return validator.validate(pack, options);
}
