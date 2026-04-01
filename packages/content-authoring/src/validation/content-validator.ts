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
    const businessErrors = this.validateBusinessRules(validPack);
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

    const result: ContentPackValidationResult = {
      valid: isValid,
      errors,
      warnings,
    };

    if (parityResults !== undefined) {
      return { ...result, parityResults };
    }

    return result;
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
      const errors: ValidationError[] = zodError.errors.map((issue) => ({
        code: 'SCHEMA_' + issue.code.toUpperCase(),
        path: issue.path.join('.'),
        message: issue.message,
        severity: 'error' as const,
      }));
      return { valid: false, errors };
    }
  }

  /**
   * Validate business rules
   */
  private validateBusinessRules(pack: ContentPackManifest): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

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

    for (const block of pack.teachingBlocks) {
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
      }

      // Check hints are not empty
      for (let i = 0; i < block.hints.length; i++) {
        const hint = block.hints[i];
        if (hint !== undefined && hint.trim().length === 0) {
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
