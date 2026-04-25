/**
 * TopShelf Service LLC - Kitchen Training Engine Types
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Core type definitions for the "Solve First, Then Teach" kitchen training platform.
 * Covers challenge lifecycle, shadow validation, event sourcing, and mastery tracking.
 */

// =============================================================================
// CHALLENGE STATE MACHINE
// =============================================================================

export enum ChallengePhase {
  /** Setup: briefing shown, timer not started */
  SETUP = 'setup',
  /** Solve: cook is under pressure, instructions withheld */
  SOLVE = 'solve',
  /** Consequence: failures quantified — dollars, time, safety */
  CONSEQUENCE = 'consequence',
  /** Teach: expert instruction unlocked based on actual mistakes */
  TEACH = 'teach',
  /** Verify: cook re-attempts with knowledge, must prove fix */
  VERIFY = 'verify',
  /** Mastery: scored, ranked, progression updated */
  MASTERY = 'mastery',
  /** Cooldown: forced reflection after repeated failures */
  COOLDOWN = 'cooldown',
  /** Completed: challenge finished */
  COMPLETED = 'completed',
}

export enum ChallengeType {
  RUSH_HOUR = 'rush_hour',
  GHOST_RECIPE = 'ghost_recipe',
  STATION_SETUP = 'station_setup',
  TEMP_CHECK = 'temp_check',
  INVENTORY_SCRAMBLE = 'inventory_scramble',
  LABOR_PREP = 'labor_prep',
  HAZARD_SCAN = 'hazard_scan',
  MOCK_IMPOSSIBLE = 'mock_impossible',
}

export interface ChallengeConfig {
  id: string;
  type: ChallengeType;
  title: string;
  briefing: string;
  timeLimitSeconds: number;
  difficultyLevel: 1 | 2 | 3 | 4 | 5;
  /** Domains secretly assessed during this challenge */
  hiddenDomains: MasteryDomain[];
  /** Expert standard this challenge is measured against (DB foreign key) */
  recipeId: string;
  /** Embedded expert recipe for the Teach phase (avoids DB roundtrip in MVP) */
  expertRecipe?: ExpertRecipe;
  /** Whether this contains trap/impossible items */
  containsTraps: boolean;
  /** Equipment focus for failure association */
  equipmentFocus?: EquipmentType[];
  /** Tickets/orders for rush-style challenges */
  tickets?: Ticket[];
  /** Ingredients available in the challenge */
  availableIngredients?: Ingredient[];
  /** Station layout for setup challenges */
  stationLayout?: StationConfig;
}

export interface ChallengeState {
  challengeId: string;
  phase: ChallengePhase;
  startedAt: number;
  phaseStartedAt: number;
  timeRemainingMs: number;
  ticketsCompleted: number;
  ticketsTotal: number;
  events: ChallengeEvent[];
  infractions: HiddenInfraction[];
  /** Consecutive failure count for cooldown logic */
  consecutiveFailures: number;
  /** Whether the cook has washed hands recently */
  lastHandwashAt: number | null;
  /** Accumulated waste in dollars */
  wasteAccumulated: number;
  /** Active safety violations */
  activeSafetyViolations: SafetyViolation[];
  /** Score breakdown by domain */
  domainScores: Record<MasteryDomain, number>;
  /** Whether this is a verification re-attempt */
  isVerification: boolean;
}

// =============================================================================
// EVENT SOURCING
// =============================================================================

export enum EventType {
  // Lifecycle events
  CHALLENGE_STARTED = 'challenge_started',
  CHALLENGE_PAUSED = 'challenge_paused',
  CHALLENGE_RESUMED = 'challenge_resumed',
  PHASE_TRANSITION = 'phase_transition',
  CHALLENGE_COMPLETED = 'challenge_completed',
  CHALLENGE_ABANDONED = 'challenge_abandoned',

  // Cook actions
  INGREDIENT_SELECTED = 'ingredient_selected',
  INGREDIENT_DISCARDED = 'ingredient_discarded',
  TOOL_SELECTED = 'tool_selected',
  TOOL_RETURNED = 'tool_returned',
  STATION_ITEM_PLACED = 'station_item_placed',
  STATION_ITEM_MOVED = 'station_item_moved',
  COOKING_ACTION = 'cooking_action',
  TEMP_ESTIMATED = 'temp_estimated',
  PLATE_SUBMITTED = 'plate_submitted',
  TICKET_STARTED = 'ticket_started',
  TICKET_COMPLETED = 'ticket_completed',
  ORDER_REJECTED = 'order_rejected',
  QUANTITY_ENTERED = 'quantity_entered',
  SEQUENCE_STEP_DONE = 'sequence_step_done',
  HAND_WASH = 'hand_wash',
  UNSAFE_ORDER_ACCEPTED = 'unsafe_order_accepted',
  FIFO_VIOLATION = 'fifo_violation',
  RECIPE_SCALED = 'recipe_scaled',
  CONVERSION_ATTEMPTED = 'conversion_attempted',
  LESSON_VIEWED = 'lesson_viewed',
  WHY_TOOLTIP_OPENED = 'why_tooltip_opened',
  REPLAY_WATCHED = 'replay_watched',
  COACHING_FACT_READ = 'coaching_fact_read',
}

export interface ChallengeEvent {
  id: string;
  type: EventType;
  timestamp: number;
  phase: ChallengePhase;
  data: Record<string, unknown>;
  /** Position in the sequence for ordering */
  sequenceNumber: number;
}

// =============================================================================
// SHADOW VALIDATION (TROJAN HORSE LEARNING)
// =============================================================================

export enum InfractionType {
  HANDWASH_NEGLECT = 'handwash_neglect',
  CROSS_CONTAMINATION = 'cross_contamination',
  RAW_COOKED_CONTACT = 'raw_cooked_contact',
  TEMP_DANGER_ZONE = 'temp_danger_zone',
  UNSAFE_ORDER_SERVED = 'unsafe_order_served',
  FIFO_VIOLATION = 'fifo_violation',
  SPOILED_INGREDIENT_USED = 'spoiled_ingredient_used',
  EXCESSIVE_WASTE = 'excessive_waste',
  PRODUCT_MISHANDLED = 'product_mishandled',
  WRONG_SEQUENCE = 'wrong_sequence',
  STATION_OVERCROWDED = 'station_overcrowded',
  CONVERSION_ERROR = 'conversion_error',
  PORTION_ERROR = 'portion_error',
  IMPOSSIBLE_ORDER_ACCEPTED = 'impossible_order_accepted',
}

export enum InfractionSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface HiddenInfraction {
  id: string;
  type: InfractionType;
  severity: InfractionSeverity;
  domain: MasteryDomain;
  timestamp: number;
  /** The event that triggered this infraction */
  triggerEventId: string;
  /** Dollars lost or at-risk due to this infraction */
  costImpact: number;
  /** Human-readable explanation for the Teach phase */
  explanation: string;
  /** Why this matters in a professional kitchen */
  whyItMatters: string;
  /** How an expert would handle this */
  expertApproach: string;
  /** Was this detected without interrupting the cook? */
  silent: boolean;
}

export interface ShadowValidatorRule {
  id: string;
  domain: MasteryDomain;
  /** Event types that trigger this rule's evaluation */
  triggerEvents: EventType[];
  /** The validation function name (resolved at runtime) */
  validatorFn: string;
  /** Parameters for the validator */
  params: Record<string, unknown>;
  /** Resulting infraction type if rule fails */
  infractionType: InfractionType;
  severity: InfractionSeverity;
  /** Cost per occurrence in dollars */
  costPerOccurrence: number;
}

// =============================================================================
// MASTERY & PROGRESSION
// =============================================================================

export enum MasteryDomain {
  SANITATION = 'sanitation',
  FOOD_SAFETY = 'food_safety',
  EFFICIENCY = 'efficiency',
  SEQUENCING = 'sequencing',
  KITCHEN_MATH = 'kitchen_math',
  WASTE_MANAGEMENT = 'waste_management',
  SPEED = 'speed',
  PLATING = 'plating',
  JUDGMENT = 'judgment',
  INVENTORY = 'inventory',
  LABOR_COST = 'labor_cost',
}

export enum KitchenRank {
  DISHWASHER = 'dishwasher',
  PREP_COOK = 'prep_cook',
  LINE_COOK_III = 'line_cook_iii',
  LINE_COOK_II = 'line_cook_ii',
  LINE_COOK_I = 'line_cook_i',
  COMMIS = 'commis',
  DEMI_CHEF = 'demi_chef',
  CHEF_DE_PARTIE = 'chef_de_partie',
  SOUS_CHEF = 'sous_chef',
  EXECUTIVE_CHEF = 'executive_chef',
}

export const RANK_THRESHOLDS: Record<KitchenRank, number> = {
  [KitchenRank.DISHWASHER]: 0,
  [KitchenRank.PREP_COOK]: 100,
  [KitchenRank.LINE_COOK_III]: 300,
  [KitchenRank.LINE_COOK_II]: 600,
  [KitchenRank.LINE_COOK_I]: 1000,
  [KitchenRank.COMMIS]: 1500,
  [KitchenRank.DEMI_CHEF]: 2200,
  [KitchenRank.CHEF_DE_PARTIE]: 3000,
  [KitchenRank.SOUS_CHEF]: 4000,
  [KitchenRank.EXECUTIVE_CHEF]: 5500,
};

export interface MasteryProfile {
  userId: string;
  overallScore: number;
  rank: KitchenRank;
  domainScores: Record<MasteryDomain, DomainScore>;
  totalChallengesCompleted: number;
  totalInfractions: number;
  streakDays: number;
  /** Domains the cook doesn't know they're weak in yet */
  hiddenWeaknesses: MasteryDomain[];
  /** Unlocked at higher ranks */
  visibleDomains: MasteryDomain[];
  equipmentProficiency: Record<EquipmentType, number>;
  lastActivityAt: number;
}

export interface DomainScore {
  domain: MasteryDomain;
  score: number;
  /** How many infractions in this domain */
  infractionCount: number;
  /** Trend: improving, stable, declining */
  trend: 'improving' | 'stable' | 'declining';
  /** Whether this score is revealed to the cook */
  isRevealed: boolean;
  /** Last 10 challenge scores in this domain */
  recentScores: number[];
}

// =============================================================================
// KITCHEN-SPECIFIC DOMAIN TYPES
// =============================================================================

export interface Ticket {
  id: string;
  orderNumber: number;
  items: TicketItem[];
  submittedAt: number;
  /** Rush, normal, or VIP priority */
  priority: 'rush' | 'normal' | 'vip';
  /** Whether this ticket contains trap items */
  isTrapped: boolean;
  /** Time window for the ticket in seconds */
  timeWindowSeconds: number;
  /** Modifiers like allergies */
  modifiers?: string[];
}

export interface TicketItem {
  id: string;
  name: string;
  recipeId: string;
  /** Special modifiers (e.g., "no gluten", "extra sauce") */
  modifiers: string[];
  /** Is this an impossible/unsafe order? (e.g., medium-rare chicken) */
  isImpossible: boolean;
  /** Reason it's impossible, shown in Teach phase */
  impossibleReason?: string;
  quantity: number;
}

export interface Ingredient {
  id: string;
  name: string;
  category: 'protein' | 'produce' | 'dairy' | 'dry_goods' | 'frozen' | 'prepared';
  /** Receive date for FIFO tracking */
  receivedAt: number;
  /** Use-by date for spoilage */
  useByDate: number;
  /** Whether this ingredient is actually spoiled */
  isSpoiled: boolean;
  /** Cost per unit */
  costPerUnit: number;
  unit: string;
  /** Allergens present */
  allergens: string[];
  /** Current temperature for safety checks */
  currentTemp?: number;
  /** Requires refrigeration */
  requiresRefrigeration: boolean;
  /** C2 image: /kitchen/C2-tools/{ingredient-id}.webp */
  imageRef?: `/kitchen/C2-tools/${string}.webp`;
}

export interface StationConfig {
  id: string;
  name: string;
  positions: StationPosition[];
  /** Ideal layout for comparison */
  idealLayout: StationPosition[];
  maxCapacity: number;
  requiredTools: string[];
  requiredIngredients: string[];
  /** C3 image: /kitchen/C3-stations/{id}.webp */
  imageRef?: `/kitchen/C3-stations/${string}.webp`;
}

export interface StationPosition {
  slotId: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** What should ideally be placed here */
  idealItemId?: string;
  /** What is currently placed here */
  currentItemId?: string;
  /** Zone type affects validation rules */
  zone: 'hot' | 'cold' | 'prep' | 'plating' | 'storage';
}

export enum EquipmentType {
  GRILL = 'grill',
  FRYER = 'fryer',
  OVEN = 'oven',
  SAUTE = 'saute',
  FLAT_TOP = 'flat_top',
  COLD_STATION = 'cold_station',
  PREP_TABLE = 'prep_table',
  EXPEDITER = 'expediter',
}

// =============================================================================
// IMAGE ASSET CLASSES
// Image assets are grouped into four numbered classes for quick identification.
//
//   C1 · Equipment  — station-level equipment, served from /kitchen/C1-equipment/
//   C2 · Tools      — handheld tools shown in step cards, /kitchen/C2-tools/
//   C3 · Stations   — layout diagram photos, /kitchen/C3-stations/
//   C4 · Recipes    — plated-dish reference photos, /kitchen/C4-recipes/
//
// Filename convention:
//   C1 → {EquipmentType value}.webp          e.g. cold_station.webp
//   C2 → {tool id from RecipeStep.tools}.webp  e.g. thermometer.webp
//   C3 → {StationConfig.id}.webp             e.g. brunch-station.webp
//   C4 → {ExpertRecipe.id}.webp              e.g. recipe-hollandaise-v1.webp
// =============================================================================

/** Discriminated union of all valid kitchen image paths (relative to /public). */
export type KitchenImageRef =
  | `/kitchen/C1-equipment/${string}.webp`
  | `/kitchen/C2-tools/${string}.webp`
  | `/kitchen/C3-stations/${string}.webp`
  | `/kitchen/C4-recipes/${string}.webp`;

/** Lookup map from tool id → its C2 image path. Optional per-step override. */
export type ToolImageMap = Partial<Record<string, `/kitchen/C2-tools/${string}.webp`>>;

export interface SafetyViolation {
  id: string;
  type: InfractionType;
  description: string;
  startedAt: number;
  /** Whether this triggers a full-screen alert */
  isCritical: boolean;
}

// =============================================================================
// CONSEQUENCE & TEACH PAYLOADS
// =============================================================================

export interface ConsequencePayload {
  totalCostLost: number;
  laborCostWasted: number;
  productWasted: number;
  ticketDelaySeconds: number;
  safetyRisks: SafetyRiskSummary[];
  infractions: HiddenInfraction[];
  overallGrade: 'F' | 'D' | 'C' | 'B' | 'A' | 'A+';
  primaryFailureDomain: MasteryDomain;
  headline: string;
}

export interface SafetyRiskSummary {
  type: InfractionType;
  severity: InfractionSeverity;
  realWorldConsequence: string;
  regulatoryReference?: string;
}

export interface TeachPayload {
  /** The expert standard for this recipe */
  expertRecipe: ExpertRecipe;
  /** Side-by-side comparison data */
  comparison: AttemptComparison;
  /** Targeted lessons based on actual mistakes */
  lessons: TargetedLesson[];
  /** Coaching facts unlocked by specific errors */
  coachingFacts: CoachingFact[];
  /** Replay markers for the shadow replay */
  replayMarkers: ReplayMarker[];
}

export interface ExpertRecipe {
  id: string;
  name: string;
  station: EquipmentType;
  /** C4 image: /kitchen/C4-recipes/{id}.webp */
  imageRef?: `/kitchen/C4-recipes/${string}.webp`;
  steps: RecipeStep[];
  criticalControlPoints: CriticalControlPoint[];
  idealSequence: string[];
  wasteValuePerPlate: number;
  targetTimeSeconds: number;
  platingStandard: string;
}

export interface RecipeStep {
  id: string;
  order: number;
  instruction: string;
  /** Why this step matters */
  whyExplanation: string;
  /** Time budget for this step */
  timeSeconds: number;
  /** Is this a critical control point? */
  isCCP: boolean;
  /** Tools needed */
  tools: string[];
  /** C2 images keyed by tool id — falls back to /kitchen/C2-tools/{toolId}.webp */
  toolImages?: ToolImageMap;
  /** Temperature target if applicable */
  targetTemp?: number;
  /** Acceptable temp range */
  tempRange?: { min: number; max: number };
}

export interface CriticalControlPoint {
  id: string;
  stepId: string;
  type: 'temperature' | 'time' | 'sanitation' | 'allergen';
  target: string;
  tolerance: string;
  consequence: string;
}

export interface AttemptComparison {
  userSequence: string[];
  expertSequence: string[];
  sequenceMismatches: SequenceMismatch[];
  userTimeSeconds: number;
  expertTimeSeconds: number;
  userWasteValue: number;
  expertWasteValue: number;
  errorHeatmap: ErrorHeatmapEntry[];
}

export interface SequenceMismatch {
  position: number;
  userStep: string;
  expertStep: string;
  impact: string;
}

export interface ErrorHeatmapEntry {
  stepId: string;
  errorType: InfractionType;
  severity: InfractionSeverity;
}

export interface TargetedLesson {
  id: string;
  domain: MasteryDomain;
  title: string;
  content: string;
  /** Why this matters, not just what to do */
  whyItMatters: string;
  /** Triggered by which infraction */
  triggeredBy: InfractionType;
  /** Estimated read time in seconds */
  readTimeSeconds: number;
}

export interface CoachingFact {
  id: string;
  domain: MasteryDomain;
  fact: string;
  source: string;
  /** Triggered by which event */
  triggeredByEvent: string;
}

export interface ReplayMarker {
  timestamp: number;
  eventId: string;
  label: string;
  severity: InfractionSeverity;
  /** Tap to learn more */
  lessonId: string;
}

// =============================================================================
// REAL-WORLD BRIDGE
// =============================================================================

export interface QRValidation {
  id: string;
  cookUserId: string;
  challengeId: string;
  generatedAt: number;
  expiresAt: number;
  /** QR code payload (encoded challenge + cook info) */
  payload: string;
  /** Has a senior chef scanned and validated? */
  validatedBy?: string;
  validatedAt?: number;
  validationNotes?: string;
  passed?: boolean;
}

export interface DailySpec {
  id: string;
  date: string;
  stationFocus: EquipmentType;
  specialOfTheDay: string;
  challengeId: string;
  /** Quick challenge type for pre-shift */
  quickChallengeType: ChallengeType;
  pushNotificationSent: boolean;
  sentAt?: number;
}

// =============================================================================
// USER ROLES
// =============================================================================

export enum KitchenRole {
  LINE_COOK = 'line_cook',
  PREP_COOK = 'prep_cook',
  SOUS_CHEF = 'sous_chef',
  EXECUTIVE_CHEF = 'executive_chef',
  KITCHEN_MANAGER = 'kitchen_manager',
  TRAINER = 'trainer',
}

export interface KitchenUser {
  id: string;
  role: KitchenRole;
  rank: KitchenRank;
  stationAssignment?: EquipmentType;
  hireDate: string;
  /** Can this user view others' data? */
  canViewTeamData: boolean;
  /** Can this user validate QR codes? */
  canValidate: boolean;
}
