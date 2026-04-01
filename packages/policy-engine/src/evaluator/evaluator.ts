/**
 * Policy Evaluator (TS-POLICY-005)
 *
 * Core policy evaluation engine implementing multi-signal
 * promotion rules with layered policy model.
 */

import { nowISO, hashSHA256, LEARNING_MODE_ORDER } from '@topshelf/shared';

import type {
  PolicyEvaluationInput,
  PolicyEvaluationOutput,
  PolicyDecision,
  SignalValue,
  SignalType,
  LearningMode,
  MultiSignalConfig,
  RecommendedAction,
  ProbeType,
} from '@topshelf/shared';

/** Evaluation context for internal use */
interface EvaluationContext {
  readonly input: PolicyEvaluationInput;
  readonly config: MultiSignalConfig;
  readonly signalMap: Map<SignalType, SignalValue>;
}

/**
 * Policy evaluator implementing multi-signal promotion rules
 */
export class PolicyEvaluator {
  private readonly nodeId: string;
  private readonly signingKey: string;

  constructor(nodeId: string, signingKey: string) {
    this.nodeId = nodeId;
    this.signingKey = signingKey;
  }

  /**
   * Evaluate policy for a learner in a specific domain
   */
  evaluate(input: PolicyEvaluationInput): PolicyEvaluationOutput {
    // Build evaluation context
    const config = this.resolveConfig(input);
    const signalMap = new Map(input.signals.map((s) => [s.type, s]));
    const context: EvaluationContext = { input, config, signalMap };

    // Check for missing required signals first
    const missingSignals = this.getMissingSignals(context);
    if (missingSignals.length > 0) {
      return this.buildDeferOutput(context, missingSignals);
    }

    // Check probation window
    if (input.inProbation) {
      return this.evaluateProbation(context);
    }

    // Evaluate promotion criteria
    const promotionResult = this.evaluatePromotion(context);
    if (promotionResult !== null) {
      return promotionResult;
    }

    // Evaluate rollback criteria
    const rollbackResult = this.evaluateRollback(context);
    if (rollbackResult !== null) {
      return rollbackResult;
    }

    // Default: hold current position
    return this.buildHoldOutput(context);
  }

  /**
   * Resolve effective configuration with domain overrides
   */
  private resolveConfig(input: PolicyEvaluationInput): MultiSignalConfig {
    const baseConfig = input.policy.multiSignal;
    const domainOverride = input.policy.domainOverrides?.[input.domain];

    if (domainOverride === undefined) {
      return baseConfig;
    }

    return {
      ...baseConfig,
      ...domainOverride,
    };
  }

  /**
   * Get list of missing required signals
   */
  private getMissingSignals(context: EvaluationContext): SignalType[] {
    const missing: SignalType[] = [];

    for (const requiredSignal of context.config.requiredSignals) {
      const signal = context.signalMap.get(requiredSignal);
      if (signal === undefined || signal.confidence < 0.5) {
        missing.push(requiredSignal);
      }
    }

    return missing;
  }

  /**
   * Evaluate learner during probation window
   */
  private evaluateProbation(context: EvaluationContext): PolicyEvaluationOutput {
    const { input, config } = context;

    // Check if probation is complete
    if (input.probationTasksCompleted >= config.probationTasks) {
      // Calculate failure rate during probation
      const benchmarkSignal = context.signalMap.get('benchmark_passes');
      if (benchmarkSignal !== undefined) {
        const passRate = benchmarkSignal.value / config.probationTasks;
        const failureRate = 1 - passRate;

        if (failureRate >= config.rollbackOnFailureRate) {
          // Rollback due to probation failure
          return this.buildRollbackOutput(
            context,
            `Probation failed: ${(failureRate * 100).toFixed(0)}% failure rate exceeds threshold`
          );
        }
      }

      // Probation passed - return hold to exit probation
      return this.buildOutput(context, {
        decision: 'hold',
        reasoning: `Probation completed successfully after ${config.probationTasks} tasks`,
        recommendedAction: { type: 'continue' },
      });
    }

    // Still in probation
    return this.buildOutput(context, {
      decision: 'hold',
      reasoning: `In probation: ${input.probationTasksCompleted}/${config.probationTasks} tasks completed`,
      recommendedAction: { type: 'continue' },
    });
  }

  /**
   * Evaluate promotion criteria
   */
  private evaluatePromotion(context: EvaluationContext): PolicyEvaluationOutput | null {
    const { config } = context;

    // Check benchmark passes
    const benchmarkSignal = context.signalMap.get('benchmark_passes');
    if (benchmarkSignal === undefined || benchmarkSignal.value < config.consecutivePasses) {
      return null;
    }

    // Check transfer score
    const transferSignal = context.signalMap.get('transfer_score');
    if (transferSignal === undefined || transferSignal.value < config.transferThreshold) {
      return null;
    }

    // Check time efficiency
    const timeSignal = context.signalMap.get('time_efficiency');
    if (timeSignal === undefined || timeSignal.value < config.timePercentileThreshold) {
      return null;
    }

    // Check retention
    const retentionSignal = context.signalMap.get('retention');
    if (retentionSignal === undefined || retentionSignal.value < 0.7) {
      return null;
    }

    // All criteria met - promote
    const targetMode = this.getNextHigherMode(context.input.currentMode);
    if (targetMode === null) {
      // Already at highest mode
      return this.buildOutput(context, {
        decision: 'hold',
        reasoning: 'Already at highest learning mode (L4)',
        recommendedAction: { type: 'continue' },
      });
    }

    return this.buildPromoteOutput(context, targetMode);
  }

  /**
   * Evaluate rollback criteria
   */
  private evaluateRollback(context: EvaluationContext): PolicyEvaluationOutput | null {
    const { config } = context;

    // Check for sustained poor performance
    const benchmarkSignal = context.signalMap.get('benchmark_passes');
    const correctnessSignal = context.signalMap.get('correctness');

    // Rollback if recent correctness is very low
    if (correctnessSignal !== undefined && correctnessSignal.value < 0.4) {
      return this.buildRollbackOutput(
        context,
        `Low correctness score: ${(correctnessSignal.value * 100).toFixed(0)}%`
      );
    }

    // Rollback if consecutive failures exceed threshold
    if (benchmarkSignal !== undefined && benchmarkSignal.confidence >= 0.7) {
      const recentAttempts = benchmarkSignal.evidenceIds.length;
      const failureRate = recentAttempts > 0 ? 1 - benchmarkSignal.value / recentAttempts : 0;

      if (failureRate >= config.rollbackOnFailureRate && recentAttempts >= 3) {
        return this.buildRollbackOutput(
          context,
          `High failure rate: ${(failureRate * 100).toFixed(0)}% in recent ${recentAttempts} attempts`
        );
      }
    }

    return null;
  }

  /**
   * Get the next higher learning mode
   */
  private getNextHigherMode(currentMode: LearningMode): LearningMode | null {
    const currentIndex = LEARNING_MODE_ORDER.indexOf(currentMode);
    if (currentIndex <= 0) {
      return null; // Already at L4 or invalid
    }
    return LEARNING_MODE_ORDER[currentIndex - 1] as LearningMode;
  }

  /**
   * Get the next lower learning mode
   */
  private getNextLowerMode(currentMode: LearningMode): LearningMode | null {
    const currentIndex = LEARNING_MODE_ORDER.indexOf(currentMode);
    if (currentIndex < 0 || currentIndex >= LEARNING_MODE_ORDER.length - 1) {
      return null; // Already at L0 or invalid
    }
    return LEARNING_MODE_ORDER[currentIndex + 1] as LearningMode;
  }

  /**
   * Determine the best probe type for missing signals
   */
  private determineProbeType(missingSignals: SignalType[]): ProbeType {
    // Prioritize by signal importance
    if (missingSignals.includes('retention')) {
      return 'retention_24h';
    }
    if (missingSignals.includes('transfer_score')) {
      return 'far_transfer';
    }
    if (missingSignals.includes('benchmark_passes')) {
      return 'variation';
    }
    if (missingSignals.includes('explainability')) {
      return 'explainability';
    }
    return 'replication';
  }

  /**
   * Build defer output when signals are missing
   */
  private buildDeferOutput(
    context: EvaluationContext,
    missingSignals: SignalType[]
  ): PolicyEvaluationOutput {
    const probeType = this.determineProbeType(missingSignals);

    return this.buildOutput(context, {
      decision: 'defer',
      reasoning: `Insufficient data: missing signals [${missingSignals.join(', ')}]`,
      missingSignals,
      recommendedAction: {
        type: 'probe',
        probeType,
      },
    });
  }

  /**
   * Build promote output
   */
  private buildPromoteOutput(
    context: EvaluationContext,
    targetMode: LearningMode
  ): PolicyEvaluationOutput {
    const contributingSignals = Array.from(context.signalMap.values()).filter((s) =>
      context.config.requiredSignals.includes(s.type)
    );

    return this.buildOutput(context, {
      decision: 'promote',
      targetMode,
      reasoning: `All promotion criteria met. Promoting from ${context.input.currentMode} to ${targetMode}`,
      contributingSignals,
      recommendedAction: { type: 'continue' },
    });
  }

  /**
   * Build rollback (demote) output
   */
  private buildRollbackOutput(context: EvaluationContext, reason: string): PolicyEvaluationOutput {
    const targetMode = this.getNextLowerMode(context.input.currentMode);
    const contributingSignals = Array.from(context.signalMap.values());

    if (targetMode === null) {
      // Already at lowest mode
      return this.buildOutput(context, {
        decision: 'remediate',
        reasoning: `${reason}. Already at lowest mode (L0), recommending remediation.`,
        contributingSignals,
        recommendedAction: {
          type: 'remediate',
        },
      });
    }

    return this.buildOutput(context, {
      decision: 'demote',
      targetMode,
      reasoning: `${reason}. Demoting from ${context.input.currentMode} to ${targetMode}`,
      contributingSignals,
      recommendedAction: { type: 'continue' },
    });
  }

  /**
   * Build hold output
   */
  private buildHoldOutput(context: EvaluationContext): PolicyEvaluationOutput {
    return this.buildOutput(context, {
      decision: 'hold',
      reasoning: 'Criteria for promotion not yet met. Continue current learning mode.',
      recommendedAction: { type: 'continue' },
    });
  }

  /**
   * Build final output with signature
   */
  private buildOutput(
    context: EvaluationContext,
    partial: {
      decision: PolicyDecision;
      targetMode?: LearningMode;
      reasoning: string;
      contributingSignals?: readonly SignalValue[];
      missingSignals?: readonly SignalType[];
      recommendedAction: RecommendedAction;
    }
  ): PolicyEvaluationOutput {
    const evaluatedAt = nowISO();
    const contributingSignals = partial.contributingSignals ?? [];

    // Create signature payload
    const signaturePayload = JSON.stringify({
      learnerId: context.input.learnerId,
      domain: context.input.domain,
      decision: partial.decision,
      targetMode: partial.targetMode,
      evaluatedAt,
      policyVersion: context.input.policy.policyVersion,
    });

    const signature = this.sign(signaturePayload);

    const result: PolicyEvaluationOutput = {
      decision: partial.decision,
      reasoning: partial.reasoning,
      contributingSignals,
      recommendedAction: partial.recommendedAction,
      evaluatedAt,
      signature,
    };

    if (partial.targetMode !== undefined) {
      return { ...result, targetMode: partial.targetMode };
    }
    if (partial.missingSignals !== undefined) {
      return { ...result, missingSignals: partial.missingSignals };
    }

    return result;
  }

  /**
   * Sign data (placeholder - use actual crypto in production)
   */
  private sign(data: string): string {
    // In production, use proper ECDSA signing with KMS/HSM
    return `sig-${this.nodeId}-${hashSHA256(data + this.signingKey).slice(0, 32)}`;
  }
}
