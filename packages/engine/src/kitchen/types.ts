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
  /** Expert standard this challenge is measured against */
  recipeId: string;
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
  RECIPE_RECALLED = 'recipe_recalled',
  QUANTITY_ENTERED = 'quantity_entered',
  SEQUENCE_STEP_DONE = 'sequence_step_done',

  // Sanitation events
  HAND_WASH = 'hand_wash',
  SURFACE_SANITIZED = 'surface_sanitized',
  GLOVES_CHANGED = 'gloves_changed',
  CROSS_CONTACT_RISK = 'cross_contact_risk',

  // Safety events
  HAZARD_IDENTIFIED = 'hazard_identified',
  HAZARD_MISSED = 'hazard_missed',
  UNSAFE_ORDER_ACCEPTED = 'unsafe_order_accepted',
  UNSAFE_ORDER_REJECTED = 'unsafe_order_rejected',
  SAFETY_CHECK_PERFORMED = 'safety_check_performed',

  // Inventory events
  FIFO_CORRECT = 'fifo_correct',
  FIFO_VIOLATION = 'fifo_violation',
  SPOILAGE_DETECTED = 'spoilage_detected',
  WALK_IN_ORGANIZED = 'walk_in_organized',

  // Math/scaling events
  RECIPE_SCALED = 'recipe_scaled',
  CONVERSION_ATTEMPTED = 'conversion_attempted',
  MATH_ERROR = 'math_error',

  // Voice events
  VOICE_COMMAND = 'voice_command',

  // Teach phase events
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
  // Sanitation
  HANDWASH_NEGLECT = 'handwash_neglect',
  CROSS_CONTAMINATION = 'cross_contamination',
  SURFACE_NOT_SANITIZED = 'surface_not_sanitized',
  RAW_COOKED_CONTACT = 'raw_cooked_contact',

  // Food Safety
  TEMP_DANGER_ZONE = 'temp_danger_zone',
  UNDERCOOKED = 'undercooked',
  OVERCOOKED = 'overcooked',
  ALLERGEN_CROSS_CONTACT = 'allergen_cross_contact',
  UNSAFE_ORDER_SERVED = 'unsafe_order_served',

  // FIFO / Waste
  FIFO_VIOLATION = 'fifo_violation',
  SPOILED_INGREDIENT_USED = 'spoiled_ingredient_used',
  EXCESSIVE_WASTE = 'excessive_waste',
  PRODUCT_MISHANDLED = 'product_mishandled',

  // Sequencing & Efficiency
  WRONG_SEQUENCE = 'wrong_sequence',
  STATION_OVERCROWDED = 'station_overcrowded',
  MISE_EN_PLACE_FAILURE = 'mise_en_place_failure',
  BATCHING_MISSED = 'batching_missed',

  // Math
  CONVERSION_ERROR = 'conversion_error',
  SCALING_ERROR = 'scaling_error',
  PORTION_ERROR = 'portion_error',

  // Safety / OSHA
  BLOCKED_EXIT = 'blocked_exit',
  WET_FLOOR_IGNORED = 'wet_floor_ignored',
  KNIFE_SAFETY_VIOLATION = 'knife_safety_violation',
  BURN_HAZARD_IGNORED = 'burn_hazard_ignored',
  PPE_MISSING = 'ppe_missing',

  // Judgment
  IMPOSSIBLE_ORDER_ACCEPTED = 'impossible_order_accepted',
  QUALITY_STANDARD_MISSED = 'quality_standard_missed',
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
  OSHA_SAFETY = 'osha_safety',
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
