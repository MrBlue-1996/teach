/**
 * Layered Policy Model (TS-POLICY-005)
 *
 * Implements the layered policy model:
 * Safety > Employer Requirements > Learner Preferences > System Optimizations
 */

import type {
  PolicyLayer,
  PolicyRule,
  PolicyDecision,
  SignalValue,
  PromotionPolicy,
} from '@topshelf/shared';

/** Rule evaluation context */
export interface RuleEvaluationContext {
  readonly signals: ReadonlyMap<string, SignalValue>;
  readonly currentMode: string;
  readonly inProbation: boolean;
  readonly policy: PromotionPolicy;
}

/** Rule evaluation result */
export interface RuleEvaluationResult {
  readonly ruleId: string;
  readonly matched: boolean;
  readonly decision?: PolicyDecision;
  readonly terminal: boolean;
}

/**
 * Default safety layer rules
 */
export const SAFETY_LAYER: PolicyLayer = {
  name: 'safety',
  priority: 0,
  rules: [
    {
      id: 'safety-min-observations',
      description: 'Require minimum observations before any promotion',
      condition: 'signals.benchmark_passes.confidence < 0.3',
      action: 'defer',
      terminal: true,
    },
    {
      id: 'safety-extreme-failure',
      description: 'Block promotion if correctness is critically low',
      condition: 'signals.correctness.value < 0.2',
      action: 'remediate',
      terminal: true,
    },
  ],
};

/**
 * Default employer requirements layer
 */
export const EMPLOYER_LAYER: PolicyLayer = {
  name: 'employer',
  priority: 1,
  rules: [
    {
      id: 'employer-proctoring-required',
      description: 'Require proctored assessment for badge issuance',
      condition:
        'policy.employerRequirements?.requiresProctoredCapstone === true && !context.hasProctored',
      action: 'defer',
      terminal: true,
    },
    {
      id: 'employer-retention-check',
      description: 'Enforce employer retention requirements',
      condition: 'policy.employerRequirements?.minRetentionDays > 0 && !context.meetsRetention',
      action: 'defer',
      terminal: false,
    },
  ],
};

/**
 * Default learner preferences layer
 */
export const LEARNER_LAYER: PolicyLayer = {
  name: 'learner',
  priority: 2,
  rules: [
    {
      id: 'learner-pace-preference',
      description: 'Respect learner pace preferences when possible',
      condition: 'context.learnerPrefersSlowerPace && signals.transfer_score.value < 0.9',
      action: 'hold',
      terminal: false,
    },
  ],
};

/**
 * Default system optimization layer
 */
export const SYSTEM_LAYER: PolicyLayer = {
  name: 'system',
  priority: 3,
  rules: [
    {
      id: 'system-load-balance',
      description: 'Batch promotions during low-load periods',
      condition: 'context.systemLoad > 0.9',
      action: 'defer',
      terminal: false,
    },
  ],
};

/**
 * Layered policy evaluator
 */
export class LayeredPolicyEvaluator {
  private readonly layers: readonly PolicyLayer[];

  constructor(customLayers?: readonly PolicyLayer[]) {
    this.layers = customLayers ?? [SAFETY_LAYER, EMPLOYER_LAYER, LEARNER_LAYER, SYSTEM_LAYER];
  }

  /**
   * Evaluate rules in priority order
   * Returns the first terminal decision or the highest priority non-terminal decision
   */
  evaluate(context: RuleEvaluationContext): RuleEvaluationResult | null {
    // Sort layers by priority
    const sortedLayers = [...this.layers].sort((a, b) => a.priority - b.priority);

    let lastNonTerminalResult: RuleEvaluationResult | null = null;

    for (const layer of sortedLayers) {
      for (const rule of layer.rules) {
        const result = this.evaluateRule(rule, context);

        if (result.matched) {
          if (result.terminal) {
            return result;
          }
          if (lastNonTerminalResult === null) {
            lastNonTerminalResult = result;
          }
        }
      }
    }

    return lastNonTerminalResult;
  }

  /**
   * Evaluate a single rule against context
   * Note: In production, use a proper expression evaluator
   */
  private evaluateRule(rule: PolicyRule, context: RuleEvaluationContext): RuleEvaluationResult {
    try {
      const matched = this.evaluateCondition(rule.condition, context);
      return {
        ruleId: rule.id,
        matched,
        decision: matched ? rule.action : undefined,
        terminal: rule.terminal,
      };
    } catch {
      // If evaluation fails, don't match
      return {
        ruleId: rule.id,
        matched: false,
        terminal: false,
      };
    }
  }

  /**
   * Evaluate condition expression
   * Simplified for demo - use a proper expression parser in production
   */
  private evaluateCondition(condition: string, context: RuleEvaluationContext): boolean {
    // Handle basic signal value comparisons
    const signalValueMatch = condition.match(/signals\.(\w+)\.value\s*([<>=]+)\s*([\d.]+)/);
    if (signalValueMatch !== null) {
      const [, signalType, operator, valueStr] = signalValueMatch;
      if (signalType === undefined || operator === undefined || valueStr === undefined) {
        return false;
      }
      const signal = context.signals.get(signalType);
      if (signal === undefined) {
        return false;
      }
      const threshold = parseFloat(valueStr);
      return this.compareValues(signal.value, operator, threshold);
    }

    // Handle confidence comparisons
    const confidenceMatch = condition.match(/signals\.(\w+)\.confidence\s*([<>=]+)\s*([\d.]+)/);
    if (confidenceMatch !== null) {
      const [, signalType, operator, valueStr] = confidenceMatch;
      if (signalType === undefined || operator === undefined || valueStr === undefined) {
        return false;
      }
      const signal = context.signals.get(signalType);
      if (signal === undefined) {
        return true; // Missing signal means low confidence
      }
      const threshold = parseFloat(valueStr);
      return this.compareValues(signal.confidence, operator, threshold);
    }

    // Default: condition not matched
    return false;
  }

  /**
   * Compare two values with given operator
   */
  private compareValues(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case '<':
        return value < threshold;
      case '<=':
        return value <= threshold;
      case '>':
        return value > threshold;
      case '>=':
        return value >= threshold;
      case '===':
      case '==':
        return value === threshold;
      default:
        return false;
    }
  }

  /**
   * Get all layers for inspection
   */
  getLayers(): readonly PolicyLayer[] {
    return this.layers;
  }
}
