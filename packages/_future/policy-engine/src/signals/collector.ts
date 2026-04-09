/**
 * Signal Collector (TS-POLICY-005)
 *
 * Collects and aggregates signals for multi-signal policy evaluation.
 */

import {
  isWithinWindow,
  median,
  nowISO,
  type BenchmarkEvaluation,
  type LearnerState,
  type RetentionRecord,
  type SignalType,
  type SignalValue,
} from '@topshelf/shared';

/** Signal collection context */
export interface SignalCollectionContext {
  readonly learnerState: LearnerState;
  readonly recentBenchmarks: readonly BenchmarkEvaluation[];
  readonly recentRetentionChecks: readonly RetentionRecord[];
  readonly windowMinutes: number;
}

/** Signal collector class */
export class SignalCollector {
  /**
   * Collect all available signals from context
   */
  collectSignals(context: SignalCollectionContext): SignalValue[] {
    const signals: SignalValue[] = [];
    const now = nowISO();

    // Collect benchmark passes signal
    const benchmarkSignal = this.collectBenchmarkPassesSignal(context, now);
    if (benchmarkSignal !== null) {
      signals.push(benchmarkSignal);
    }

    // Collect transfer score signal
    const transferSignal = this.collectTransferScoreSignal(context, now);
    if (transferSignal !== null) {
      signals.push(transferSignal);
    }

    // Collect time efficiency signal
    const timeSignal = this.collectTimeEfficiencySignal(context, now);
    if (timeSignal !== null) {
      signals.push(timeSignal);
    }

    // Collect retention signal
    const retentionSignal = this.collectRetentionSignal(context, now);
    if (retentionSignal !== null) {
      signals.push(retentionSignal);
    }

    // Collect explainability signal
    const explainabilitySignal = this.collectExplainabilitySignal(context, now);
    if (explainabilitySignal !== null) {
      signals.push(explainabilitySignal);
    }

    // Collect robustness signal
    const robustnessSignal = this.collectRobustnessSignal(context, now);
    if (robustnessSignal !== null) {
      signals.push(robustnessSignal);
    }

    // Collect correctness signal
    const correctnessSignal = this.collectCorrectnessSignal(context, now);
    if (correctnessSignal !== null) {
      signals.push(correctnessSignal);
    }

    return signals;
  }

  /**
   * Collect benchmark passes signal
   */
  private collectBenchmarkPassesSignal(
    context: SignalCollectionContext,
    now: string
  ): SignalValue | null {
    const recentBenchmarks = context.recentBenchmarks.filter((b) =>
      isWithinWindow(b.evaluatedAt, context.windowMinutes)
    );

    if (recentBenchmarks.length === 0) {
      return null;
    }

    const passes = recentBenchmarks.filter((b) => b.result === 'pass').length;
    const evidenceIds = recentBenchmarks.map((b) => b.evaluatedAt); // Use timestamp as evidence

    return {
      type: 'benchmark_passes' as SignalType,
      value: passes,
      confidence: Math.min(1, recentBenchmarks.length / 5), // More benchmarks = higher confidence
      measuredAt: now,
      evidenceIds,
    };
  }

  /**
   * Collect transfer score signal from learner state
   */
  private collectTransferScoreSignal(
    context: SignalCollectionContext,
    now: string
  ): SignalValue | null {
    const transferScore = context.learnerState.transferScore;

    if (transferScore === 0 && context.recentBenchmarks.length === 0) {
      return null;
    }

    return {
      type: 'transfer_score' as SignalType,
      value: transferScore,
      confidence: context.learnerState.masteryScore.components.transfer > 0 ? 0.8 : 0.5,
      measuredAt: now,
      evidenceIds: [],
    };
  }

  /**
   * Collect time efficiency signal
   */
  private collectTimeEfficiencySignal(
    context: SignalCollectionContext,
    now: string
  ): SignalValue | null {
    const timeEfficiency = context.learnerState.timeEfficiency;

    if (timeEfficiency.sampleSize < 3) {
      return null;
    }

    return {
      type: 'time_efficiency' as SignalType,
      value: timeEfficiency.cohortPercentile,
      confidence: Math.min(1, timeEfficiency.sampleSize / 10),
      measuredAt: now,
      evidenceIds: [],
    };
  }

  /**
   * Collect retention signal from recent checks
   */
  private collectRetentionSignal(
    context: SignalCollectionContext,
    now: string
  ): SignalValue | null {
    const recentRetention = context.recentRetentionChecks.filter((r) =>
      isWithinWindow(r.date, context.windowMinutes)
    );

    if (recentRetention.length === 0) {
      // Fall back to learner state retention history
      const retentionHistory = context.learnerState.retentionHistory;
      if (retentionHistory.length === 0) {
        return null;
      }

      const passRate = retentionHistory.filter((r) => r.pass).length / retentionHistory.length;
      return {
        type: 'retention' as SignalType,
        value: passRate,
        confidence: Math.min(1, retentionHistory.length / 5),
        measuredAt: now,
        evidenceIds: retentionHistory.map((r) => r.taskId),
      };
    }

    const passRate = recentRetention.filter((r) => r.pass).length / recentRetention.length;

    return {
      type: 'retention' as SignalType,
      value: passRate,
      confidence: Math.min(1, recentRetention.length / 3),
      measuredAt: now,
      evidenceIds: recentRetention.map((r) => r.taskId),
    };
  }

  /**
   * Collect explainability signal from benchmark explanations
   */
  private collectExplainabilitySignal(
    context: SignalCollectionContext,
    now: string
  ): SignalValue | null {
    const benchmarksWithExplanation = context.recentBenchmarks.filter(
      (b) => b.componentScores.explanation > 0
    );

    if (benchmarksWithExplanation.length === 0) {
      return null;
    }

    const avgExplanation =
      benchmarksWithExplanation.reduce((sum, b) => sum + b.componentScores.explanation, 0) /
      benchmarksWithExplanation.length;

    return {
      type: 'explainability' as SignalType,
      value: avgExplanation,
      confidence: Math.min(1, benchmarksWithExplanation.length / 3),
      measuredAt: now,
      evidenceIds: [],
    };
  }

  /**
   * Collect robustness signal (performance across variants)
   */
  private collectRobustnessSignal(
    context: SignalCollectionContext,
    now: string
  ): SignalValue | null {
    if (context.recentBenchmarks.length < 2) {
      return null;
    }

    const scores = context.recentBenchmarks.map((b) => b.score);
    const medianScore = median(scores);
    const variance =
      scores.reduce((sum, s) => sum + Math.pow(s - medianScore, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    // Lower variance = higher robustness
    const robustness = Math.max(0, 1 - standardDeviation * 2);

    return {
      type: 'robustness' as SignalType,
      value: robustness,
      confidence: Math.min(1, context.recentBenchmarks.length / 5),
      measuredAt: now,
      evidenceIds: [],
    };
  }

  /**
   * Collect correctness signal
   */
  private collectCorrectnessSignal(
    context: SignalCollectionContext,
    now: string
  ): SignalValue | null {
    if (context.recentBenchmarks.length === 0) {
      return null;
    }

    const avgCorrectness =
      context.recentBenchmarks.reduce((sum, b) => sum + b.componentScores.correctness, 0) /
      context.recentBenchmarks.length;

    return {
      type: 'correctness' as SignalType,
      value: avgCorrectness,
      confidence: Math.min(1, context.recentBenchmarks.length / 3),
      measuredAt: now,
      evidenceIds: [],
    };
  }

  /**
   * Get signals by type
   */
  getSignalByType(signals: readonly SignalValue[], type: SignalType): SignalValue | undefined {
    return signals.find((s) => s.type === type);
  }

  /**
   * Check if all required signals are present and meet minimum confidence
   */
  hasRequiredSignals(
    signals: readonly SignalValue[],
    requiredTypes: readonly SignalType[],
    minConfidence: number = 0.5
  ): { complete: boolean; missing: SignalType[] } {
    const missing: SignalType[] = [];

    for (const type of requiredTypes) {
      const signal = this.getSignalByType(signals, type);
      if (signal === undefined || signal.confidence < minConfidence) {
        missing.push(type);
      }
    }

    return {
      complete: missing.length === 0,
      missing,
    };
  }
}
