/**
 * TopShelf Teaching - Content Authoring
 *
 * Content pack creation, validation, signing, and publishing.
 */

// Validation
export { ContentPackValidator, validateContentPack } from './validation/content-validator.js';
export type { ValidationOptions } from './validation/content-validator.js';

// Signing
export {
  ContentPackSigner,
  RevocationManager,
  createSignedPack,
} from './signing/content-signer.js';
export type { SigningConfig, SigningResult, VerificationResult } from './signing/content-signer.js';

// Pipeline
export { AuthoringPipeline } from './pipeline/authoring-pipeline.js';
export type {
  PipelineStage,
  PipelineState,
  PipelineStageEvent,
  DraftTeachingBlock,
  DraftContentPack,
} from './pipeline/authoring-pipeline.js';

// Re-export types
export type {
  ContentPackManifest,
  ContentPackValidationResult,
  KitchenImageManifest,
  TeachingBlock,
  ValidationError,
  ValidationWarning,
} from '@topshelf/shared';
