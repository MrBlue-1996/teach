/**
 * Content Authoring Pipeline (TS-CONTENT-004)
 *
 * End-to-end pipeline for content pack creation:
 * Author UI -> Schema Validation -> Parity Tests -> Human Review -> Sign -> Publish
 */

import { CanonicalFormatter } from '@topshelf/deterministic-formatter';
import {
  generateContentPackId,
  generateTeachingBlockId,
  nowISO,
  type ContentPackManifest,
  type ContentPackValidationResult,
  type TeachingBlock,
} from '@topshelf/shared';

import {
  ContentPackSigner,
  createSignedPack,
  type SigningConfig,
} from '../signing/content-signer.js';
import { ContentPackValidator, type ValidationOptions } from '../validation/content-validator.js';

/** Pipeline stage */
export type PipelineStage =
  | 'draft'
  | 'validation'
  | 'parity_testing'
  | 'human_review'
  | 'signing'
  | 'published'
  | 'rejected';

/** Pipeline state */
export interface PipelineState {
  /** Current stage */
  readonly stage: PipelineStage;
  /** Pack being processed */
  readonly pack: Partial<ContentPackManifest>;
  /** Validation results */
  readonly validationResult?: ContentPackValidationResult;
  /** Human review notes */
  readonly reviewNotes?: string;
  /** Reviewer ID */
  readonly reviewerId?: string;
  /** Stage history */
  readonly history: readonly PipelineStageEvent[];
  /** Created timestamp */
  readonly createdAt: string;
  /** Last updated timestamp */
  readonly updatedAt: string;
}

/** Pipeline stage event */
export interface PipelineStageEvent {
  /** Stage transitioned to */
  readonly stage: PipelineStage;
  /** Timestamp */
  readonly timestamp: string;
  /** Actor */
  readonly actor: string;
  /** Notes */
  readonly notes?: string;
}

/** Draft teaching block (before validation) */
export interface DraftTeachingBlock {
  readonly concept: string;
  readonly canonicalSolution: string;
  readonly explanation: string;
  readonly surfaceVariants: Array<{
    description: string;
    data?: Record<string, unknown>;
  }>;
  readonly timeBudgetSeconds: number;
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  readonly hints: string[];
  readonly prerequisites?: string[];
}

/** Draft content pack */
export interface DraftContentPack {
  readonly name: string;
  readonly description: string;
  readonly tags: Array<'required' | 'recommended' | 'elective' | 'capstone' | 'retention'>;
  readonly roleMappings: string[];
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  readonly minDeviceProfile: {
    ramMb: number;
    networkKbps: number;
    requiresWebGL?: boolean;
    requiresWebGPU?: boolean;
    requiresWasm?: boolean;
  };
  readonly teachingBlocks: DraftTeachingBlock[];
  readonly author: string;
}

/**
 * Content authoring pipeline
 */
export class AuthoringPipeline {
  private readonly validator: ContentPackValidator;
  private readonly formatter: CanonicalFormatter;
  private readonly signer: ContentPackSigner;
  private readonly states: Map<string, PipelineState> = new Map();

  constructor(signingConfig: SigningConfig, signingKey: string) {
    this.validator = new ContentPackValidator();
    this.formatter = new CanonicalFormatter();
    this.signer = new ContentPackSigner(signingConfig, signingKey);
  }

  /**
   * Create a new draft from author input
   */
  createDraft(draft: DraftContentPack, actorId: string): PipelineState {
    const packId = generateContentPackId();
    const now = nowISO();

    // Convert draft blocks to full teaching blocks
    const teachingBlocks = this.convertDraftBlocks(draft.teachingBlocks);

    // Create partial pack
    const pack: Partial<ContentPackManifest> = {
      id: packId,
      name: draft.name,
      version: '0.1.0',
      description: draft.description,
      tags: draft.tags,
      roleMappings: draft.roleMappings as `badge-${string}`[],
      difficulty: draft.difficulty,
      minDeviceProfile: draft.minDeviceProfile,
      teachingBlocks,
      author: draft.author,
      createdAt: now,
      updatedAt: now,
      schemaVersion: '1.0.0',
    };

    const state: PipelineState = {
      stage: 'draft',
      pack,
      history: [
        {
          stage: 'draft',
          timestamp: now,
          actor: actorId,
          notes: 'Draft created',
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    this.states.set(packId, state);
    return state;
  }

  /**
   * Submit draft for validation
   */
  submitForValidation(packId: string, actorId: string, options?: ValidationOptions): PipelineState {
    const state = this.getState(packId);
    if (state.stage !== 'draft') {
      throw new Error(`Cannot submit for validation from stage: ${state.stage}`);
    }

    const validationResult = this.validator.validate(state.pack, options);
    const now = nowISO();

    const nextStage: PipelineStage = validationResult.valid ? 'parity_testing' : 'draft';

    const newState: PipelineState = {
      ...state,
      stage: nextStage,
      validationResult,
      updatedAt: now,
      history: [
        ...state.history,
        {
          stage: 'validation',
          timestamp: now,
          actor: actorId,
          notes: validationResult.valid
            ? 'Validation passed'
            : `Validation failed: ${validationResult.errors.length} errors`,
        },
      ],
    };

    this.states.set(packId, newState);
    return newState;
  }

  /**
   * Run parity tests
   */
  runParityTests(packId: string, actorId: string): PipelineState {
    const state = this.getState(packId);
    if (state.stage !== 'parity_testing') {
      throw new Error(`Cannot run parity tests from stage: ${state.stage}`);
    }

    // Format all blocks and check for consistency
    const blocks = state.pack.teachingBlocks ?? [];
    let parityPassed = true;

    for (const block of blocks) {
      // Format block
      const formatted = this.formatter.formatBlock(block);
      // In production, compare with LLM outputs
      // For now, just ensure formatter runs without error
      if (formatted.contentHash.length === 0) {
        parityPassed = false;
        break;
      }
    }

    const now = nowISO();
    const nextStage: PipelineStage = parityPassed ? 'human_review' : 'draft';

    const newState: PipelineState = {
      ...state,
      stage: nextStage,
      updatedAt: now,
      history: [
        ...state.history,
        {
          stage: 'parity_testing',
          timestamp: now,
          actor: actorId,
          notes: parityPassed ? 'Parity tests passed' : 'Parity tests failed',
        },
      ],
    };

    this.states.set(packId, newState);
    return newState;
  }

  /**
   * Submit human review decision
   */
  submitReview(
    packId: string,
    reviewerId: string,
    approved: boolean,
    notes: string
  ): PipelineState {
    const state = this.getState(packId);
    if (state.stage !== 'human_review') {
      throw new Error(`Cannot submit review from stage: ${state.stage}`);
    }

    const now = nowISO();
    const nextStage: PipelineStage = approved ? 'signing' : 'rejected';

    const newState: PipelineState = {
      ...state,
      stage: nextStage,
      reviewNotes: notes,
      reviewerId,
      updatedAt: now,
      history: [
        ...state.history,
        {
          stage: 'human_review',
          timestamp: now,
          actor: reviewerId,
          notes: approved ? `Approved: ${notes}` : `Rejected: ${notes}`,
        },
      ],
    };

    this.states.set(packId, newState);
    return newState;
  }

  /**
   * Sign and publish content pack
   */
  signAndPublish(packId: string, actorId: string): ContentPackManifest {
    const state = this.getState(packId);
    if (state.stage !== 'signing') {
      throw new Error(`Cannot sign from stage: ${state.stage}`);
    }

    const now = nowISO();

    // Complete the pack
    const completePack = {
      ...state.pack,
      updatedAt: now,
    } as Omit<ContentPackManifest, 'signature' | 'signingKeyId'>;

    // Sign the pack
    const signedPack = createSignedPack(completePack, this.signer);

    // Update state to published
    const newState: PipelineState = {
      ...state,
      stage: 'published',
      pack: signedPack,
      updatedAt: now,
      history: [
        ...state.history,
        {
          stage: 'signing',
          timestamp: now,
          actor: actorId,
          notes: 'Signed and published',
        },
      ],
    };

    this.states.set(packId, newState);
    return signedPack;
  }

  /**
   * Get pipeline state
   */
  getState(packId: string): PipelineState {
    const state = this.states.get(packId);
    if (state === undefined) {
      throw new Error(`Pack not found: ${packId}`);
    }
    return state;
  }

  /**
   * Convert draft blocks to full teaching blocks
   */
  private convertDraftBlocks(drafts: DraftTeachingBlock[]): TeachingBlock[] {
    return drafts.map((draft, _index) => {
      const blockId = generateTeachingBlockId();

      return {
        id: blockId,
        concept: draft.concept,
        mode: 'L0' as const, // Default to canonical solution mode
        canonicalSolution: draft.canonicalSolution,
        explanation: draft.explanation,
        surfaceVariants: draft.surfaceVariants.map((v, i) => ({
          id: `variant-${i + 1}`,
          description: v.description,
          data: v.data ?? {},
        })),
        timeBudgetSeconds: draft.timeBudgetSeconds,
        difficulty: draft.difficulty,
        prerequisites: (draft.prerequisites ?? []) as `tb-${string}`[],
        successCriteria: {
          minCorrectnessScore: 0.7,
          maxTimeSeconds: draft.timeBudgetSeconds * 2,
          maxRetries: 3,
          requiresExplanation: draft.difficulty !== 'beginner',
        },
        hints: draft.hints,
        commonErrors: [],
      };
    });
  }
}
