/**
 * TopShelf Service LLC - Kitchen Training Engine
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Public API surface for the kitchen training engine.
 * Exports the state machine, shadow validator, and all types.
 */

export { ChallengeMachine } from './state-machine.js';
export { ShadowValidator } from './shadow-validator.js';

export {
  // Enums
  ChallengePhase,
  ChallengeType,
  EventType,
  InfractionType,
  InfractionSeverity,
  MasteryDomain,
  KitchenRank,
  EquipmentType,
  KitchenRole,
  RANK_THRESHOLDS,

  // Types
  type ChallengeConfig,
  type ChallengeState,
  type ChallengeEvent,
  type HiddenInfraction,
  type ShadowValidatorRule,
  type MasteryProfile,
  type DomainScore,
  type Ticket,
  type TicketItem,
  type Ingredient,
  type StationConfig,
  type StationPosition,
  type SafetyViolation,
  type ConsequencePayload,
  type SafetyRiskSummary,
  type TeachPayload,
  type ExpertRecipe,
  type RecipeStep,
  type CriticalControlPoint,
  type AttemptComparison,
  type SequenceMismatch,
  type ErrorHeatmapEntry,
  type TargetedLesson,
  type CoachingFact,
  type ReplayMarker,
  type QRValidation,
  type DailySpec,
  type KitchenUser,
} from './types.js';
