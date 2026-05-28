/**
 * TopShelf Teaching - Shared Schemas
 *
 * Re-exports all Zod schemas for runtime validation.
 */

// Learner schemas
export {
  learnerIdSchema,
  skillDomainSchema,
  learningModeSchema,
  skillEstimateSchema,
  timeEfficiencySchema,
  retentionRecordSchema,
  promotionRecordSchema,
  masteryScoreSchema,
  learnerStateSchema,
  learnerEventTypeSchema,
  learnerEventSchema,
  calibrationResultSchema,
} from './learner.schema.js';

export type {
  LearnerIdSchema,
  LearningModeSchema,
  SkillEstimateSchema,
  TimeEfficiencySchema,
  RetentionRecordSchema,
  PromotionRecordSchema,
  MasteryScoreSchema,
  LearnerStateSchema,
  LearnerEventSchema,
  CalibrationResultSchema,
} from './learner.schema.js';

// Content schemas
export {
  contentPackIdSchema,
  teachingBlockIdSchema,
  badgeIdSchema,
  roleIdSchema,
  difficultyLevelSchema,
  contentTagSchema,
  sourceDataStatusSchema,
  challengeStimulusSchema,
  kitchenImageManifestEntrySchema,
  kitchenImageManifestSchema,
  minDeviceProfileSchema,
  surfaceVariantSchema,
  successCriteriaSchema,
  commonErrorSchema,
  teachingBlockSchema,
  semanticVersionSchema,
  contentPackManifestSchema,
  validationErrorSchema,
  validationWarningSchema,
  parityDivergenceSchema,
  parityTestResultSchema,
  contentPackValidationResultSchema,
  contentPackRevocationSchema,
} from './content.schema.js';

export type {
  ContentPackIdSchema,
  TeachingBlockIdSchema,
  BadgeIdSchema,
  TeachingBlockSchema,
  ContentPackManifestSchema,
  ContentPackValidationResultSchema,
  KitchenImageManifestSchema,
} from './content.schema.js';

// Policy schemas
export {
  policyVersionSchema,
  signalTypeSchema,
  policyDecisionSchema,
  multiSignalConfigSchema,
  employerRequirementsSchema,
  promotionPolicySchema,
  signalValueSchema,
  policyEvaluationInputSchema,
  probeTypeSchema,
  recommendedActionSchema,
  policyEvaluationOutputSchema,
  policyLayerSchema,
  policyAuditRecordSchema,
} from './policy.schema.js';

export type {
  PolicyVersionSchema,
  SignalTypeSchema,
  PolicyDecisionSchema,
  MultiSignalConfigSchema,
  PromotionPolicySchema,
  SignalValueSchema,
  PolicyEvaluationInputSchema,
  PolicyEvaluationOutputSchema,
  PolicyAuditRecordSchema,
} from './policy.schema.js';

// Device schemas
export {
  deviceTierSchema,
  networkQualitySchema,
  batteryStateSchema,
  webGLCapabilitiesSchema,
  webGPUCapabilitiesSchema,
  wasmCapabilitiesSchema,
  networkInfoSchema,
  storageEstimateSchema,
  deviceCapabilitiesSchema,
  deviceFeaturesSchema,
  deviceProfileSchema,
  cacheStrategySchema,
  cacheConfigSchema,
  performanceBudgetSchema,
  tieredPerformanceBudgetsSchema,
} from './device.schema.js';

export type {
  DeviceTierSchema,
  NetworkQualitySchema,
  DeviceCapabilitiesSchema,
  DeviceProfileSchema,
  CacheConfigSchema,
  PerformanceBudgetSchema,
} from './device.schema.js';
