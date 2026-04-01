/**
 * Content Pack Types (TS-CONTENT-004)
 *
 * Types for content packs, teaching blocks, and the
 * content authoring pipeline.
 */

import type { LearningMode } from './learner.js';

/** Content pack identifier */
export type ContentPackId = `pack-${string}`;

/** Teaching block identifier */
export type TeachingBlockId = `tb-${string}`;

/** Badge identifier */
export type BadgeId = `badge-${string}`;

/** Role identifier */
export type RoleId = `role-${string}`;

/** Difficulty level */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/** Content tag for filtering and routing */
export type ContentTag = 'required' | 'recommended' | 'elective' | 'capstone' | 'retention';

/** Minimum device requirements for content */
export interface MinDeviceProfile {
  /** Minimum RAM in megabytes */
  readonly ramMb: number;
  /** Minimum network speed in kbps */
  readonly networkKbps: number;
  /** Whether WebGL is required */
  readonly requiresWebGL?: boolean;
  /** Whether WebGPU is required */
  readonly requiresWebGPU?: boolean;
  /** Whether WASM is required */
  readonly requiresWasm?: boolean;
}

/** Surface variant for teaching block */
export interface SurfaceVariant {
  /** Variant identifier */
  readonly id: string;
  /** Variant description/context */
  readonly description: string;
  /** Variant-specific data */
  readonly data: Record<string, unknown>;
}

/** Teaching block - atomic unit of instruction (TS-CONTENT-004) */
export interface TeachingBlock {
  /** Unique block identifier */
  readonly id: TeachingBlockId;
  /** Concept being taught */
  readonly concept: string;
  /** Learning mode this block is designed for */
  readonly mode: LearningMode;
  /** Canonical solution shown first (Solve-First pedagogy) */
  readonly canonicalSolution: string;
  /** Explanation of the canonical solution */
  readonly explanation: string;
  /** Surface variants for transfer testing */
  readonly surfaceVariants: readonly SurfaceVariant[];
  /** Time budget in seconds */
  readonly timeBudgetSeconds: number;
  /** Difficulty level */
  readonly difficulty: DifficultyLevel;
  /** Prerequisites - other block IDs */
  readonly prerequisites: readonly TeachingBlockId[];
  /** Success criteria for completion */
  readonly successCriteria: SuccessCriteria;
  /** Hints available (progressively revealed) */
  readonly hints: readonly string[];
  /** Common errors and their remediation */
  readonly commonErrors: readonly CommonError[];
}

/** Success criteria for a teaching block */
export interface SuccessCriteria {
  /** Minimum correctness score [0, 1] */
  readonly minCorrectnessScore: number;
  /** Maximum allowed time in seconds */
  readonly maxTimeSeconds: number;
  /** Maximum retries before remediation */
  readonly maxRetries: number;
  /** Whether explanation is required */
  readonly requiresExplanation: boolean;
  /** Custom validation function identifier */
  readonly customValidator?: string;
}

/** Common error pattern with remediation */
export interface CommonError {
  /** Error pattern identifier */
  readonly pattern: string;
  /** Human-readable description */
  readonly description: string;
  /** Suggested remediation */
  readonly remediation: string;
  /** Related teaching block for deeper remediation */
  readonly relatedBlockId?: TeachingBlockId;
}

/** Content pack manifest (TS-CONTENT-004) */
export interface ContentPackManifest {
  /** Unique pack identifier */
  readonly id: ContentPackId;
  /** Human-readable name */
  readonly name: string;
  /** Semantic version */
  readonly version: string;
  /** Description */
  readonly description: string;
  /** Content tags */
  readonly tags: readonly ContentTag[];
  /** Role mappings (which badges this pack contributes to) */
  readonly roleMappings: readonly BadgeId[];
  /** Overall difficulty */
  readonly difficulty: DifficultyLevel;
  /** Minimum device profile required */
  readonly minDeviceProfile: MinDeviceProfile;
  /** Teaching blocks in this pack */
  readonly teachingBlocks: readonly TeachingBlock[];
  /** Pack author */
  readonly author: string;
  /** ISO 8601 creation timestamp */
  readonly createdAt: string;
  /** ISO 8601 last update timestamp */
  readonly updatedAt: string;
  /** Content pack signature (KMS/HSM signed) */
  readonly signature: string;
  /** Signing key identifier */
  readonly signingKeyId: string;
  /** Schema version for forward compatibility */
  readonly schemaVersion: string;
}

/** Content pack validation result */
export interface ContentPackValidationResult {
  /** Whether validation passed */
  readonly valid: boolean;
  /** Validation errors */
  readonly errors: readonly ValidationError[];
  /** Validation warnings */
  readonly warnings: readonly ValidationWarning[];
  /** Parity test results against deterministic formatter */
  readonly parityResults?: ParityTestResult;
}

/** Validation error */
export interface ValidationError {
  /** Error code */
  readonly code: string;
  /** JSON path to error location */
  readonly path: string;
  /** Error message */
  readonly message: string;
  /** Severity */
  readonly severity: 'error';
}

/** Validation warning */
export interface ValidationWarning {
  /** Warning code */
  readonly code: string;
  /** JSON path to warning location */
  readonly path: string;
  /** Warning message */
  readonly message: string;
  /** Severity */
  readonly severity: 'warning';
}

/** Parity test result */
export interface ParityTestResult {
  /** Whether parity test passed */
  readonly passed: boolean;
  /** Divergence count */
  readonly divergenceCount: number;
  /** Maximum allowed divergence */
  readonly maxAllowedDivergence: number;
  /** Individual divergence details */
  readonly divergences: readonly ParityDivergence[];
}

/** Single parity divergence */
export interface ParityDivergence {
  /** Block ID where divergence occurred */
  readonly blockId: TeachingBlockId;
  /** Field that diverged */
  readonly field: string;
  /** Deterministic formatter output */
  readonly deterministicOutput: string;
  /** LLM output */
  readonly llmOutput: string;
  /** Similarity score [0, 1] */
  readonly similarity: number;
}

/** Content pack revocation entry */
export interface ContentPackRevocation {
  /** Pack ID being revoked */
  readonly packId: ContentPackId;
  /** Version being revoked */
  readonly version: string;
  /** Reason for revocation */
  readonly reason: string;
  /** ISO 8601 revocation timestamp */
  readonly revokedAt: string;
  /** Replacement pack ID if available */
  readonly replacementPackId?: ContentPackId;
}
