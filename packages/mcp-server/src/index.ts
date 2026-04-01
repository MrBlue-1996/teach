/**
 * TopShelf Teaching - MCP Server
 *
 * Stateless orchestration server for policy evaluation,
 * content delivery, and audit logging.
 */

// Core orchestrator
export { MCPOrchestrator, createDefaultOrchestratorConfig } from './services/orchestrator.js';
export type { ContentStore, EventStore, OrchestratorConfig } from './services/orchestrator.js';

// Re-export commonly used types
export type {
  LearnerId,
  DeviceProfile,
  ContentPackManifest,
  TeachingBlock,
  PolicyEvaluationInput,
  PolicyEvaluationOutput,
  GetNextTaskResponse,
  TaskCompletionRequest,
  CalibrationResult,
  LearnerEvent,
  PromotionPolicy,
  LearningMode,
} from '@topshelf/shared';

// Re-export policy engine components
export {
  PolicyEvaluator,
  PolicyAuditLogger,
  SignalCollector,
  InMemoryAuditStorage,
} from '@topshelf/policy-engine';

// Re-export NLP components
export { LearnerStateManager, InMemoryLearnerStateStorage } from '@topshelf/nlp';
