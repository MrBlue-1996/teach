/**
 * TopShelf Teaching - NLP Package
 *
 * Learner state management and NLP processing.
 */

// Learner state management
export { LearnerStateManager, InMemoryLearnerStateStorage } from './state/learner-state-manager.js';
export type { LearnerStateStorage } from './state/learner-state-manager.js';

// Response parsing
export { ResponseParser, extractCorrectnessSignals } from './parsers/response-parser.js';
export type {
  ParsedResponseSignals,
  CausalIndicator,
  CodeAnalysis,
} from './parsers/response-parser.js';

// Re-export types
export type {
  LearnerId,
  LearnerState,
  SkillDomain,
  SkillEstimate,
  LearningMode,
  RetentionRecord,
  PromotionRecord,
  MasteryScore,
} from '@topshelf/shared';
