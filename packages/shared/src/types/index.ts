/**
 * TopShelf Teaching - Shared Types
 *
 * Re-exports all type definitions for the platform.
 */

// Learner types
export type {
  LearnerId,
  SkillDomain,
  LearningMode,
  SkillEstimate,
  TimeEfficiency,
  RetentionRecord,
  PromotionRecord,
  MasteryScore,
  LearnerState,
  LearnerEvent,
  CalibrationResult,
} from './learner.js';

// Content types
export type {
  ContentPackId,
  TeachingBlockId,
  BadgeId,
  RoleId,
  DifficultyLevel,
  ContentTag,
  MinDeviceProfile,
  SurfaceVariant,
  TeachingBlock,
  SuccessCriteria,
  CommonError,
  ContentPackManifest,
  ContentPackValidationResult,
  ValidationError,
  ValidationWarning,
  ParityTestResult,
  ParityDivergence,
  ContentPackRevocation,
} from './content.js';

// Policy types
export type {
  PolicyVersion,
  SignalType,
  PolicyDecision,
  MultiSignalConfig,
  PromotionPolicy,
  EmployerRequirements,
  SignalValue,
  PolicyEvaluationInput,
  PolicyEvaluationOutput,
  RecommendedAction,
  ProbeType,
  PolicyLayer,
  PolicyRule,
  PolicyAuditRecord,
} from './policy.js';

// Device types
export type {
  DeviceTier,
  NetworkQuality,
  BatteryState,
  DeviceCapabilities,
  DeviceProfile,
  DeviceFeatures,
  CacheStrategy,
  CacheConfig,
  PerformanceBudget,
  TieredPerformanceBudgets,
} from './device.js';

// Badge types
export type {
  EvidenceId,
  ArtifactId,
  BadgeStatus,
  EvidenceType,
  Evidence,
  Badge,
  TimedSimulationReport,
  CohortComparisonReport,
  EmployerArtifact,
  BadgeVerificationRequest,
  BadgeVerificationResponse,
} from './badge.js';

// Benchmark types
export type {
  BenchmarkId,
  AttemptId,
  BenchmarkStatus,
  BenchmarkResult,
  MicroBenchmark,
  BenchmarkVariant,
  ScoringRubric,
  PartialCreditCriterion,
  BenchmarkAttempt,
  BenchmarkResponse,
  ResponseStep,
  BenchmarkEvaluation,
  RetentionProbeConfig,
  TransferProbeConfig,
  RecoveryProbeConfig,
} from './benchmark.js';

// Audit types
export type {
  AuditEventId,
  IncidentId,
  Severity,
  AuditCategory,
  AuditEvent,
  IntegrityCheckResult,
  SecurityIncident,
  ContentQuarantine,
  AntiCheatResult,
  ProctoringSession,
  RateLimitConfig,
  HealthCheckResult,
} from './audit.js';

// API types
export type {
  ApiVersion,
  RequestId,
  ApiResponse,
  ApiError,
  PaginationParams,
  PaginatedResponse,
  CalibrationRequest,
  CalibrationResponse,
  CalibrationResultSubmission,
  GetNextTaskRequest,
  GetNextTaskResponse,
  TaskCompletionRequest,
  EvaluatePromotionRequest,
  EvaluatePromotionResponse,
  StartBenchmarkRequest,
  StartBenchmarkResponse,
  SubmitBenchmarkRequest,
  IssueBadgeRequest,
  IssueBadgeResponse,
  GenerateArtifactRequest,
  GenerateArtifactResponse,
  VerifyBadgeRequest,
  GetLearnerStateResponse,
  SyncOfflineEventsRequest,
  SyncOfflineEventsResponse,
} from './api.js';
