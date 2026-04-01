/**
 * TopShelf Teaching - Policy Engine
 *
 * Multi-signal promotion policy evaluation with layered rules
 * and auditable decision logging.
 */

// Core evaluator
export { PolicyEvaluator } from './evaluator/index.js';

// Signal collection
export { SignalCollector } from './signals/index.js';
export type { SignalCollectionContext } from './signals/index.js';

// Layered policy model
export {
  LayeredPolicyEvaluator,
  SAFETY_LAYER,
  EMPLOYER_LAYER,
  LEARNER_LAYER,
  SYSTEM_LAYER,
} from './rules/layered-policy.js';
export type { RuleEvaluationContext, RuleEvaluationResult } from './rules/layered-policy.js';

// Audit logging
export {
  PolicyAuditLogger,
  InMemoryAuditStorage,
  AuditChainVerifier,
} from './audit/audit-logger.js';
export type { AuditStorage } from './audit/audit-logger.js';

// Re-export relevant types from shared
export type {
  PolicyEvaluationInput,
  PolicyEvaluationOutput,
  PolicyDecision,
  SignalValue,
  SignalType,
  PromotionPolicy,
  PolicyAuditRecord,
  PolicyLayer,
  PolicyRule,
} from '@topshelf/shared';
