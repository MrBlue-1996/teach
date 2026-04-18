/**
 * TopShelf Service LLC - Shadow Validator
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * The Shadow Validator runs silently during SOLVE phase, detecting infractions
 * without interrupting the cook's flow. This is the "Trojan Horse Learning" core:
 * the cook thinks they're playing a speed game, but the system is secretly
 * evaluating sanitation, FIFO, safety, math, sequencing, and judgment.
 */

import {
  ChallengeEvent,
  EventType,
  HiddenInfraction,
  InfractionType,
  InfractionSeverity,
  MasteryDomain,
  ShadowValidatorRule,
  Ingredient,
  ChallengeState,
} from './types.js';

// =============================================================================
// BUILT-IN VALIDATION RULES
// =============================================================================

const BUILTIN_RULES: ShadowValidatorRule[] = [
  // --- SANITATION ---
  {
    id: 'handwash_neglect',
    domain: MasteryDomain.SANITATION,
    triggerEvents: [
      EventType.INGREDIENT_SELECTED,
      EventType.COOKING_ACTION,
      EventType.PLATE_SUBMITTED,
    ],
    validatorFn: 'validateHandwash',
    params: { maxIntervalMs: 30_000 },
    infractionType: InfractionType.HANDWASH_NEGLECT,
    severity: InfractionSeverity.HIGH,
    costPerOccurrence: 0,
  },
  {
    id: 'cross_contamination',
    domain: MasteryDomain.FOOD_SAFETY,
    triggerEvents: [EventType.INGREDIENT_SELECTED, EventType.STATION_ITEM_PLACED],
    validatorFn: 'validateCrossContamination',
    params: {},
    infractionType: InfractionType.CROSS_CONTAMINATION,
    severity: InfractionSeverity.CRITICAL,
    costPerOccurrence: 50,
  },
  {
    id: 'raw_cooked_contact',
    domain: MasteryDomain.FOOD_SAFETY,
    triggerEvents: [EventType.STATION_ITEM_PLACED, EventType.STATION_ITEM_MOVED],
    validatorFn: 'validateRawCookedSeparation',
    params: {},
    infractionType: InfractionType.RAW_COOKED_CONTACT,
    severity: InfractionSeverity.CRITICAL,
    costPerOccurrence: 75,
  },

  // --- FIFO / INVENTORY ---
  {
    id: 'fifo_violation',
    domain: MasteryDomain.INVENTORY,
    triggerEvents: [EventType.INGREDIENT_SELECTED],
    validatorFn: 'validateFIFO',
    params: {},
    infractionType: InfractionType.FIFO_VIOLATION,
    severity: InfractionSeverity.MEDIUM,
    costPerOccurrence: 8,
  },
  {
    id: 'spoiled_ingredient',
    domain: MasteryDomain.FOOD_SAFETY,
    triggerEvents: [EventType.INGREDIENT_SELECTED],
    validatorFn: 'validateSpoilage',
    params: {},
    infractionType: InfractionType.SPOILED_INGREDIENT_USED,
    severity: InfractionSeverity.CRITICAL,
    costPerOccurrence: 25,
  },

  // --- TEMPERATURE SAFETY ---
  {
    id: 'temp_danger_zone',
    domain: MasteryDomain.FOOD_SAFETY,
    triggerEvents: [EventType.TEMP_ESTIMATED, EventType.COOKING_ACTION],
    validatorFn: 'validateTemperature',
    params: { dangerZoneMin: 40, dangerZoneMax: 140 },
    infractionType: InfractionType.TEMP_DANGER_ZONE,
    severity: InfractionSeverity.HIGH,
    costPerOccurrence: 30,
  },

  // --- SEQUENCING ---
  {
    id: 'wrong_sequence',
    domain: MasteryDomain.SEQUENCING,
    triggerEvents: [EventType.SEQUENCE_STEP_DONE],
    validatorFn: 'validateSequence',
    params: {},
    infractionType: InfractionType.WRONG_SEQUENCE,
    severity: InfractionSeverity.MEDIUM,
    costPerOccurrence: 5,
  },
  {
    id: 'station_overcrowded',
    domain: MasteryDomain.EFFICIENCY,
    triggerEvents: [EventType.STATION_ITEM_PLACED],
    validatorFn: 'validateStationCapacity',
    params: {},
    infractionType: InfractionType.STATION_OVERCROWDED,
    severity: InfractionSeverity.LOW,
    costPerOccurrence: 3,
  },

  // --- MATH ---
  {
    id: 'conversion_error',
    domain: MasteryDomain.KITCHEN_MATH,
    triggerEvents: [EventType.CONVERSION_ATTEMPTED, EventType.RECIPE_SCALED],
    validatorFn: 'validateConversion',
    params: { tolerancePercent: 5 },
    infractionType: InfractionType.CONVERSION_ERROR,
    severity: InfractionSeverity.MEDIUM,
    costPerOccurrence: 4,
  },
  {
    id: 'portion_error',
    domain: MasteryDomain.KITCHEN_MATH,
    triggerEvents: [EventType.QUANTITY_ENTERED],
    validatorFn: 'validatePortion',
    params: { tolerancePercent: 10 },
    infractionType: InfractionType.PORTION_ERROR,
    severity: InfractionSeverity.MEDIUM,
    costPerOccurrence: 6,
  },

  // --- SAFETY / OSHA ---
  {
    id: 'unsafe_order_accepted',
    domain: MasteryDomain.JUDGMENT,
    triggerEvents: [EventType.TICKET_COMPLETED],
    validatorFn: 'validateOrderSafety',
    params: {},
    infractionType: InfractionType.IMPOSSIBLE_ORDER_ACCEPTED,
    severity: InfractionSeverity.CRITICAL,
    costPerOccurrence: 100,
  },

  // --- WASTE ---
  {
    id: 'excessive_waste',
    domain: MasteryDomain.WASTE_MANAGEMENT,
    triggerEvents: [EventType.INGREDIENT_DISCARDED],
    validatorFn: 'validateWaste',
    params: { maxWastePercentage: 15 },
    infractionType: InfractionType.EXCESSIVE_WASTE,
    severity: InfractionSeverity.MEDIUM,
    costPerOccurrence: 10,
  },
];

// =============================================================================
// SHADOW VALIDATOR
// =============================================================================

export class ShadowValidator {
  private readonly rules: ShadowValidatorRule[];
  private readonly availableIngredients: Ingredient[];
  private readonly idealSequence: string[];
  private currentSequenceIndex: number;
  private totalIngredientsUsed: number;
  private totalIngredientsDiscarded: number;
  /** Recent ingredient categories touched (for cross-contamination detection) */
  private readonly recentTouched: Array<{ category: string; timestamp: number }>;
  /** Items placed at station positions (for capacity/separation checks) */
  private readonly stationItems: Map<string, { itemId: string; zone: string; category?: string }>;
  /** Maximum station capacity */
  private readonly maxStationCapacity: number;

  constructor(
    availableIngredients: Ingredient[] = [],
    idealSequence: string[] = [],
    maxStationCapacity: number = 8,
    additionalRules: ShadowValidatorRule[] = []
  ) {
    this.rules = [...BUILTIN_RULES, ...additionalRules];
    this.availableIngredients = availableIngredients;
    this.idealSequence = idealSequence;
    this.currentSequenceIndex = 0;
    this.totalIngredientsUsed = 0;
    this.totalIngredientsDiscarded = 0;
    this.recentTouched = [];
    this.stationItems = new Map();
    this.maxStationCapacity = maxStationCapacity;
  }

  /**
   * Evaluate an event against all applicable rules.
   * Returns any infractions detected — silently, without interrupting the cook.
   */
  evaluate(event: ChallengeEvent, state: ChallengeState): HiddenInfraction[] {
    const infractions: HiddenInfraction[] = [];

    // Track ingredient touches for cross-contamination
    if (event.type === EventType.INGREDIENT_SELECTED) {
      const ingredient = this.findIngredient(event.data['ingredientId'] as string);
      if (ingredient) {
        this.recentTouched.push({
          category: ingredient.category,
          timestamp: event.timestamp,
        });
        this.totalIngredientsUsed++;
      }
    }

    if (event.type === EventType.INGREDIENT_DISCARDED) {
      this.totalIngredientsDiscarded++;
    }

    if (event.type === EventType.STATION_ITEM_PLACED) {
      const slotId = event.data['slotId'] as string;
      const itemId = event.data['itemId'] as string;
      const zone = event.data['zone'] as string;
      const category = event.data['category'] as string | undefined;
      const entry: { itemId: string; zone: string; category?: string } = { itemId, zone };
      if (category !== undefined) entry.category = category;
      this.stationItems.set(slotId, entry);
    }

    // Run each applicable rule
    for (const rule of this.rules) {
      if (!rule.triggerEvents.includes(event.type)) continue;

      const result = this.runValidator(rule, event, state);
      if (result) {
        infractions.push(result);
      }
    }

    return infractions;
  }

  /**
   * Run periodic checks (e.g., handwash timer) independent of specific events.
   */
  runPeriodicChecks(state: ChallengeState): HiddenInfraction[] {
    const infractions: HiddenInfraction[] = [];

    // Check handwash timer
    if (state.lastHandwashAt !== null || state.events.length > 0) {
      const lastWash = state.lastHandwashAt ?? state.phaseStartedAt;
      const timeSinceWash = Date.now() - lastWash;
      if (timeSinceWash > 30_000) {
        // Only trigger once per interval — check if already flagged recently
        const recentHandwashInfraction = state.infractions.find(
          (i) => i.type === InfractionType.HANDWASH_NEGLECT && Date.now() - i.timestamp < 30_000
        );
        if (!recentHandwashInfraction) {
          infractions.push(
            this.createInfraction(
              InfractionType.HANDWASH_NEGLECT,
              InfractionSeverity.HIGH,
              MasteryDomain.SANITATION,
              `evt_periodic_${Date.now()}`,
              0,
              'Handwashing interval exceeded. You handled food for over 30 seconds without washing.',
              'In a real kitchen, this is a health code violation. Cross-contamination from unwashed hands is the #1 cause of foodborne illness outbreaks.',
              'Professional cooks wash hands every time they switch tasks, touch raw protein, or handle different ingredient categories.'
            )
          );
        }
      }
    }

    return infractions;
  }

  // ---------------------------------------------------------------------------
  // Individual Validators
  // ---------------------------------------------------------------------------

  private runValidator(
    rule: ShadowValidatorRule,
    event: ChallengeEvent,
    state: ChallengeState
  ): HiddenInfraction | null {
    switch (rule.validatorFn) {
      case 'validateHandwash':
        return this.validateHandwash(rule, event, state);
      case 'validateCrossContamination':
        return this.validateCrossContamination(rule, event);
      case 'validateRawCookedSeparation':
        return this.validateRawCookedSeparation(rule, event);
      case 'validateFIFO':
        return this.validateFIFO(rule, event);
      case 'validateSpoilage':
        return this.validateSpoilage(rule, event);
      case 'validateTemperature':
        return this.validateTemperature(rule, event);
      case 'validateSequence':
        return this.validateSequence(rule, event);
      case 'validateStationCapacity':
        return this.validateStationCapacity(rule);
      case 'validateConversion':
        return this.validateConversion(rule, event);
      case 'validatePortion':
        return this.validatePortion(rule, event);
      case 'validateOrderSafety':
        return this.validateOrderSafety(rule, event);
      case 'validateWaste':
        return this.validateWaste(rule, event);
      default:
        return null;
    }
  }

  private validateHandwash(
    rule: ShadowValidatorRule,
    event: ChallengeEvent,
    state: ChallengeState
  ): HiddenInfraction | null {
    const maxInterval = rule.params['maxIntervalMs'] as number;
    const lastWash = state.lastHandwashAt ?? state.phaseStartedAt;
    const elapsed = event.timestamp - lastWash;

    if (elapsed > maxInterval) {
      return this.createInfraction(
        rule.infractionType,
        rule.severity,
        rule.domain,
        event.id,
        rule.costPerOccurrence,
        `Handled food without washing hands for ${Math.round(elapsed / 1000)}s.`,
        'Cross-contamination from unwashed hands causes 40% of foodborne illness outbreaks in restaurants.',
        'Wash hands between every task switch, after touching raw proteins, and before plating.'
      );
    }
    return null;
  }

  private validateCrossContamination(
    rule: ShadowValidatorRule,
    event: ChallengeEvent
  ): HiddenInfraction | null {
    const ingredientId = event.data['ingredientId'] as string;
    const ingredient = this.findIngredient(ingredientId);
    if (!ingredient) return null;

    // Check if raw protein was touched recently and now touching produce/dairy
    const recentProtein = this.recentTouched.find(
      (t) => t.category === 'protein' && Date.now() - t.timestamp < 10_000
    );

    if (recentProtein && (ingredient.category === 'produce' || ingredient.category === 'dairy')) {
      return this.createInfraction(
        rule.infractionType,
        rule.severity,
        rule.domain,
        event.id,
        rule.costPerOccurrence,
        `Touched ${ingredient.name} (${ingredient.category}) immediately after handling raw protein without washing.`,
        'Cross-contamination between raw proteins and ready-to-eat foods can cause salmonella, E. coli, and listeria outbreaks.',
        'Always wash hands and sanitize surfaces between raw protein and any produce, dairy, or ready-to-eat ingredients.'
      );
    }
    return null;
  }

  private validateRawCookedSeparation(
    rule: ShadowValidatorRule,
    event: ChallengeEvent
  ): HiddenInfraction | null {
    const zone = event.data['zone'] as string;
    const category = event.data['category'] as string | undefined;

    if (category !== 'protein') return null;

    // Check if raw protein is placed in a cooked/plating zone
    if (zone === 'plating' || zone === 'cold') {
      return this.createInfraction(
        rule.infractionType,
        rule.severity,
        rule.domain,
        event.id,
        rule.costPerOccurrence,
        'Raw protein placed in a ready-to-eat or plating zone.',
        'Health codes require strict physical separation between raw proteins and ready-to-eat areas to prevent foodborne illness.',
        'Raw proteins go in the designated raw prep area only. Never above or beside cooked/ready items.'
      );
    }
    return null;
  }

  private validateFIFO(rule: ShadowValidatorRule, event: ChallengeEvent): HiddenInfraction | null {
    const ingredientId = event.data['ingredientId'] as string;
    const ingredient = this.findIngredient(ingredientId);
    if (!ingredient) return null;

    // Find the oldest available ingredient of the same name
    const sameIngredients = this.availableIngredients
      .filter((i) => i.name === ingredient.name && !i.isSpoiled)
      .sort((a, b) => a.receivedAt - b.receivedAt);

    if (sameIngredients.length > 1) {
      const oldest = sameIngredients[0];
      if (oldest !== undefined && oldest.id !== ingredient.id) {
        return this.createInfraction(
          rule.infractionType,
          rule.severity,
          rule.domain,
          event.id,
          rule.costPerOccurrence,
          `Used newer ${ingredient.name} when older stock was available (FIFO violation).`,
          'FIFO (First In, First Out) prevents spoilage and waste. Using newer stock first means older product expires unused, costing money.',
          'Always check dates and use the oldest product first. Rotate stock during every delivery and every prep session.'
        );
      }
    }
    return null;
  }

  private validateSpoilage(
    rule: ShadowValidatorRule,
    event: ChallengeEvent
  ): HiddenInfraction | null {
    const ingredientId = event.data['ingredientId'] as string;
    const ingredient = this.findIngredient(ingredientId);
    if (!ingredient) return null;

    if (ingredient.isSpoiled || Date.now() > ingredient.useByDate) {
      return this.createInfraction(
        rule.infractionType,
        rule.severity,
        rule.domain,
        event.id,
        rule.costPerOccurrence,
        `Used ${ingredient.name} that is past its use-by date or visibly spoiled.`,
        'Serving spoiled food can cause severe foodborne illness and carries massive legal liability for the restaurant.',
        'Check dates before every use. When in doubt, throw it out. Report spoiled product to management immediately.'
      );
    }
    return null;
  }

  private validateTemperature(
    rule: ShadowValidatorRule,
    event: ChallengeEvent
  ): HiddenInfraction | null {
    const value = event.data['value'] as number | undefined;
    const target = event.data['target'] as { min: number; max: number } | undefined;
    if (value === undefined) return null;

    const dangerMin = (rule.params['dangerZoneMin'] as number | undefined) ?? 40;
    const dangerMax = (rule.params['dangerZoneMax'] as number | undefined) ?? 140;

    if (value >= dangerMin && value <= dangerMax) {
      return this.createInfraction(
        rule.infractionType,
        rule.severity,
        rule.domain,
        event.id,
        rule.costPerOccurrence,
        `Temperature ${value}°F is in the danger zone (${dangerMin}–${dangerMax}°F).`,
        'The temperature danger zone (40–140°F) allows rapid bacterial growth.',
        'Always verify internal temps with a calibrated thermometer. Hot food above 140°F, cold food below 40°F.'
      );
    }

    if (target && (value < target.min || value > target.max)) {
      return this.createInfraction(
        rule.infractionType,
        rule.severity,
        rule.domain,
        event.id,
        rule.costPerOccurrence,
        `Temperature ${value}°F is outside acceptable range (${target.min}–${target.max}°F).`,
        'Equipment outside safe range risks spoilage or unsafe food.',
        'Adjust equipment immediately and re-check in 15 minutes.'
      );
    }

    return null;
  }

  private validateSequence(
    rule: ShadowValidatorRule,
    event: ChallengeEvent
  ): HiddenInfraction | null {
    const stepId = event.data['stepId'] as string;
    if (!stepId || this.idealSequence.length === 0) return null;
    if (this.currentSequenceIndex >= this.idealSequence.length) return null;

    const expectedStep = this.idealSequence[this.currentSequenceIndex];
    this.currentSequenceIndex++;

    if (stepId !== expectedStep) {
      return this.createInfraction(
        rule.infractionType,
        rule.severity,
        rule.domain,
        event.id,
        rule.costPerOccurrence,
        `Step "${stepId}" executed out of order. Expected "${expectedStep}".`,
        'Correct sequencing prevents timing mistakes, temperature errors, and quality loss. In a rush, wrong order = late tickets.',
        'Follow the recipe sequence precisely. Each step is ordered to optimize timing, safety, and quality.'
      );
    }
    return null;
  }

  private validateStationCapacity(rule: ShadowValidatorRule): HiddenInfraction | null {
    if (this.stationItems.size > this.maxStationCapacity) {
      return this.createInfraction(
        rule.infractionType,
        rule.severity,
        rule.domain,
        `evt_capacity_${Date.now()}`,
        rule.costPerOccurrence,
        `Station is overcrowded (${this.stationItems.size}/${this.maxStationCapacity} items).`,
        'An overcrowded station leads to cross-contamination, accidents, and slower execution.',
        'Keep your station clean and organized. Only what you need for the current ticket should be on the board.'
      );
    }
    return null;
  }

  private validateConversion(
    rule: ShadowValidatorRule,
    event: ChallengeEvent
  ): HiddenInfraction | null {
    const userAnswer = event.data['userAnswer'] as number | undefined;
    const correctAnswer = event.data['correctAnswer'] as number | undefined;
    const tolerance = rule.params['tolerancePercent'] as number;

    if (userAnswer === undefined || correctAnswer === undefined) return null;

    const error = Math.abs(userAnswer - correctAnswer) / correctAnswer;
    if (error > tolerance / 100) {
      return this.createInfraction(
        rule.infractionType,
        rule.severity,
        rule.domain,
        event.id,
        rule.costPerOccurrence,
        `Conversion error: entered ${userAnswer}, correct was ${correctAnswer} (${Math.round(error * 100)}% off).`,
        'Math errors in the kitchen mean wrong portions, wasted product, and inconsistent quality. A 10% error on 100 covers = massive waste.',
        'Master basic kitchen conversions: 3 tsp = 1 tbsp, 16 tbsp = 1 cup, 8 oz = 1 cup. Practice scaling recipes by 1.5x and 0.5x.'
      );
    }
    return null;
  }

  private validatePortion(
    rule: ShadowValidatorRule,
    event: ChallengeEvent
  ): HiddenInfraction | null {
    const entered = event.data['quantity'] as number | undefined;
    const expected = event.data['expectedQuantity'] as number | undefined;
    const tolerance = rule.params['tolerancePercent'] as number;

    if (entered === undefined || expected === undefined) return null;

    const error = Math.abs(entered - expected) / expected;
    if (error > tolerance / 100) {
      return this.createInfraction(
        rule.infractionType,
        rule.severity,
        rule.domain,
        event.id,
        rule.costPerOccurrence,
        `Portion error: ${entered} entered, expected ${expected} (${Math.round(error * 100)}% off).`,
        'Portion control directly affects food cost. Over-portioning 1 oz of protein across 200 plates = $500+ lost per week.',
        'Use scales, measuring cups, and portion scoops consistently. Muscle memory develops over time, but always verify.'
      );
    }
    return null;
  }

  private validateOrderSafety(
    rule: ShadowValidatorRule,
    event: ChallengeEvent
  ): HiddenInfraction | null {
    const isImpossible = event.data['isImpossible'] as boolean | undefined;
    const wasRejected = event.data['wasRejected'] as boolean | undefined;

    if (isImpossible === true && wasRejected !== true) {
      return this.createInfraction(
        rule.infractionType,
        rule.severity,
        rule.domain,
        event.id,
        rule.costPerOccurrence,
        `Served an unsafe or impossible order (e.g., medium-rare chicken).`,
        'Serving undercooked poultry can cause salmonella poisoning. A single incident can close a restaurant and result in lawsuits.',
        'Always reject orders that violate food safety standards. Communicate with FOH: "We cannot serve chicken below 165°F internal."'
      );
    }
    return null;
  }

  private validateWaste(rule: ShadowValidatorRule, event: ChallengeEvent): HiddenInfraction | null {
    const total = this.totalIngredientsUsed + this.totalIngredientsDiscarded;
    if (total === 0) return null;

    const wasteRate = this.totalIngredientsDiscarded / total;
    const maxWaste = (rule.params['maxWastePercentage'] as number) / 100;

    if (wasteRate > maxWaste) {
      return this.createInfraction(
        rule.infractionType,
        rule.severity,
        rule.domain,
        event.id,
        rule.costPerOccurrence,
        `Waste rate is ${Math.round(wasteRate * 100)}% — above the ${Math.round(maxWaste * 100)}% threshold.`,
        'Food waste directly reduces profit margin. The average restaurant wastes 4–10% of purchased food. Every point above that is lost money.',
        'Plan prep quantities carefully, use trim for stocks/sauces, and communicate with the team about what needs to be used first.'
      );
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private findIngredient(id: string): Ingredient | undefined {
    return this.availableIngredients.find((i) => i.id === id);
  }

  private createInfraction(
    type: InfractionType,
    severity: InfractionSeverity,
    domain: MasteryDomain,
    triggerEventId: string,
    costImpact: number,
    explanation: string,
    whyItMatters: string,
    expertApproach: string
  ): HiddenInfraction {
    return {
      id: `inf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type,
      severity,
      domain,
      timestamp: Date.now(),
      triggerEventId,
      costImpact,
      explanation,
      whyItMatters,
      expertApproach,
      silent: true,
    };
  }

  /**
   * Get all registered rules.
   */
  getRules(): readonly ShadowValidatorRule[] {
    return this.rules;
  }
}
