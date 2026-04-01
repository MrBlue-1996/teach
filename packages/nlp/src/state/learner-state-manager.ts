/**
 * Learner State Manager (TS-NLP-008)
 *
 * Manages learner state including skill estimates, time efficiency,
 * retention history, and promotion tracking.
 */

import {
  nowISO,
  generateLearnerId,
  calculateWeightedScore,
  DEFAULT_MASTERY_WEIGHTS,
} from '@topshelf/shared';

import type {
  LearnerId,
  LearnerState,
  SkillDomain,
  SkillEstimate,
  LearningMode,
  RetentionRecord,
  PromotionRecord,
  MasteryScore,
  TimeEfficiency,
} from '@topshelf/shared';

/** Learner state storage interface */
export interface LearnerStateStorage {
  get(learnerId: LearnerId): Promise<LearnerState | null>;
  set(state: LearnerState): Promise<void>;
  delete(learnerId: LearnerId): Promise<void>;
}

/** In-memory state storage for development/testing */
export class InMemoryLearnerStateStorage implements LearnerStateStorage {
  private readonly states: Map<LearnerId, LearnerState> = new Map();

  get(learnerId: LearnerId): Promise<LearnerState | null> {
    return Promise.resolve(this.states.get(learnerId) ?? null);
  }

  set(state: LearnerState): Promise<void> {
    this.states.set(state.learnerId, state);
    return Promise.resolve();
  }

  delete(learnerId: LearnerId): Promise<void> {
    this.states.delete(learnerId);
    return Promise.resolve();
  }

  // For testing
  clear(): void {
    this.states.clear();
  }

  getAll(): LearnerState[] {
    return Array.from(this.states.values());
  }
}

/**
 * Learner state manager
 */
export class LearnerStateManager {
  private readonly storage: LearnerStateStorage;
  private readonly weights: typeof DEFAULT_MASTERY_WEIGHTS;

  constructor(storage: LearnerStateStorage, weights: Partial<typeof DEFAULT_MASTERY_WEIGHTS> = {}) {
    this.storage = storage;
    this.weights = { ...DEFAULT_MASTERY_WEIGHTS, ...weights };
  }

  /**
   * Create a new learner with initial state
   */
  async createLearner(_initialMode: LearningMode = 'L2'): Promise<LearnerState> {
    const learnerId = generateLearnerId();
    const now = nowISO();

    const state: LearnerState = {
      learnerId,
      skillEstimates: {},
      timeEfficiency: {
        medianMs: 0,
        cohortPercentile: 0.5,
        sampleSize: 0,
      },
      transferScore: 0,
      retentionHistory: [],
      promotionHistory: [],
      lastActivity: now,
      currentModes: {},
      probationWindows: {},
      masteryScore: this.calculateMasteryScore({
        transfer: 0,
        robustness: 0,
        retention: 0,
        benchmarkPasses: 0,
        timeEfficiency: 0.5,
        explainability: 0,
      }),
    };

    await this.storage.set(state);
    return state;
  }

  /**
   * Get learner state
   */
  async getState(learnerId: LearnerId): Promise<LearnerState | null> {
    return this.storage.get(learnerId);
  }

  /**
   * Update skill estimate for a domain
   */
  async updateSkillEstimate(
    learnerId: LearnerId,
    domain: SkillDomain,
    score: number,
    confidence: number
  ): Promise<LearnerState> {
    const state = await this.getStateOrThrow(learnerId);
    const now = nowISO();

    const existingEstimate = state.skillEstimates[domain];
    const observationCount = (existingEstimate?.observationCount ?? 0) + 1;

    // Bayesian update - weight new observation by confidence
    const existingWeight = existingEstimate?.confidence ?? 0;
    const newWeight = confidence;
    const totalWeight = existingWeight + newWeight;

    const updatedScore =
      totalWeight > 0
        ? ((existingEstimate?.score ?? 0) * existingWeight + score * newWeight) / totalWeight
        : score;

    const updatedEstimate: SkillEstimate = {
      score: updatedScore,
      confidence: Math.min(1, totalWeight),
      lastUpdated: now,
      observationCount,
    };

    const updatedState: LearnerState = {
      ...state,
      skillEstimates: {
        ...state.skillEstimates,
        [domain]: updatedEstimate,
      },
      lastActivity: now,
    };

    // Recalculate mastery score
    const finalState = this.recalculateMastery(updatedState);
    await this.storage.set(finalState);
    return finalState;
  }

  /**
   * Record task completion and update time efficiency
   */
  async recordTaskCompletion(
    learnerId: LearnerId,
    taskTimeMs: number,
    cohortMedianMs: number
  ): Promise<LearnerState> {
    const state = await this.getStateOrThrow(learnerId);
    const now = nowISO();

    // Update time efficiency
    const newSampleSize = state.timeEfficiency.sampleSize + 1;
    const newMedianMs =
      (state.timeEfficiency.medianMs * state.timeEfficiency.sampleSize + taskTimeMs) /
      newSampleSize;
    const newPercentile = cohortMedianMs > 0 ? Math.min(1, cohortMedianMs / taskTimeMs) : 0.5;

    const updatedTimeEfficiency: TimeEfficiency = {
      medianMs: Math.round(newMedianMs),
      cohortPercentile:
        (state.timeEfficiency.cohortPercentile * state.timeEfficiency.sampleSize + newPercentile) /
        newSampleSize,
      sampleSize: newSampleSize,
    };

    const updatedState: LearnerState = {
      ...state,
      timeEfficiency: updatedTimeEfficiency,
      lastActivity: now,
    };

    const finalState = this.recalculateMastery(updatedState);
    await this.storage.set(finalState);
    return finalState;
  }

  /**
   * Record retention check result
   */
  async recordRetentionCheck(
    learnerId: LearnerId,
    taskId: string,
    pass: boolean,
    daysSinceOriginal: number,
    latencyMs: number
  ): Promise<LearnerState> {
    const state = await this.getStateOrThrow(learnerId);
    const now = nowISO();

    const retentionRecord: RetentionRecord = {
      taskId,
      date: now,
      pass,
      daysSinceOriginal,
      latencyMs,
    };

    const updatedState: LearnerState = {
      ...state,
      retentionHistory: [...state.retentionHistory, retentionRecord],
      lastActivity: now,
    };

    const finalState = this.recalculateMastery(updatedState);
    await this.storage.set(finalState);
    return finalState;
  }

  /**
   * Record promotion or rollback
   */
  async recordPromotion(
    learnerId: LearnerId,
    domain: SkillDomain,
    fromMode: LearningMode,
    toMode: LearningMode,
    evidenceIds: readonly string[],
    isRollback: boolean
  ): Promise<LearnerState> {
    const state = await this.getStateOrThrow(learnerId);
    const now = nowISO();

    const promotionRecord: PromotionRecord = {
      from: fromMode,
      to: toMode,
      timestamp: now,
      domain,
      evidenceIds,
      isRollback,
    };

    // Update current mode for domain
    const updatedModes = {
      ...state.currentModes,
      [domain]: toMode,
    };

    // Set probation window if this is a promotion (not rollback)
    const updatedProbationWindows = isRollback
      ? state.probationWindows
      : {
          ...state.probationWindows,
          [domain]: 3, // 3 tasks in probation
        };

    const updatedState: LearnerState = {
      ...state,
      promotionHistory: [...state.promotionHistory, promotionRecord],
      currentModes: updatedModes,
      probationWindows: updatedProbationWindows,
      lastActivity: now,
    };

    await this.storage.set(updatedState);
    return updatedState;
  }

  /**
   * Decrement probation counter for domain
   */
  async decrementProbation(learnerId: LearnerId, domain: SkillDomain): Promise<LearnerState> {
    const state = await this.getStateOrThrow(learnerId);
    const currentProbation = state.probationWindows[domain] ?? 0;

    if (currentProbation <= 0) {
      return state;
    }

    const newCount = currentProbation - 1;

    // Build updated probation windows, omitting domain if count is 0
    const updatedProbationWindows = Object.fromEntries(
      Object.entries(state.probationWindows)
        .map(([key, value]) => (key === domain ? [key, newCount] : [key, value]))
        .filter(([, value]) => value !== 0)
    ) as Record<SkillDomain, number>;

    const updatedState: LearnerState = {
      ...state,
      probationWindows: updatedProbationWindows,
      lastActivity: nowISO(),
    };

    await this.storage.set(updatedState);
    return updatedState;
  }

  /**
   * Update transfer score
   */
  async updateTransferScore(learnerId: LearnerId, score: number): Promise<LearnerState> {
    const state = await this.getStateOrThrow(learnerId);
    const now = nowISO();

    // Exponential moving average
    const alpha = 0.3;
    const updatedTransferScore = alpha * score + (1 - alpha) * state.transferScore;

    const updatedState: LearnerState = {
      ...state,
      transferScore: updatedTransferScore,
      lastActivity: now,
    };

    const finalState = this.recalculateMastery(updatedState);
    await this.storage.set(finalState);
    return finalState;
  }

  /**
   * Get learner's current mode for a domain
   */
  async getCurrentMode(learnerId: LearnerId, domain: SkillDomain): Promise<LearningMode> {
    const state = await this.getStateOrThrow(learnerId);
    return state.currentModes[domain] ?? 'L2'; // Default to L2
  }

  /**
   * Check if learner is in probation for a domain
   */
  async isInProbation(
    learnerId: LearnerId,
    domain: SkillDomain
  ): Promise<{ inProbation: boolean; tasksRemaining: number }> {
    const state = await this.getStateOrThrow(learnerId);
    const tasksRemaining = state.probationWindows[domain] ?? 0;
    return {
      inProbation: tasksRemaining > 0,
      tasksRemaining,
    };
  }

  /**
   * Calculate mastery score from components
   */
  private calculateMasteryScore(components: Record<string, number>): MasteryScore {
    const composite = calculateWeightedScore(components, this.weights);

    return {
      composite,
      components: {
        transfer: components['transfer'] ?? 0,
        robustness: components['robustness'] ?? 0,
        retention: components['retention'] ?? 0,
        benchmarkPasses: components['benchmarkPasses'] ?? 0,
        timeEfficiency: components['timeEfficiency'] ?? 0,
        explainability: components['explainability'] ?? 0,
      },
      weights: this.weights,
    };
  }

  /**
   * Recalculate mastery score from state
   */
  private recalculateMastery(state: LearnerState): LearnerState {
    // Calculate retention rate
    const recentRetention = state.retentionHistory.slice(-10);
    const retentionRate =
      recentRetention.length > 0
        ? recentRetention.filter((r) => r.pass).length / recentRetention.length
        : 0;

    // Calculate average skill score (as robustness proxy)
    const skillScores = Object.values(state.skillEstimates).map((e) => e.score);
    const avgSkill =
      skillScores.length > 0 ? skillScores.reduce((a, b) => a + b, 0) / skillScores.length : 0;

    const components = {
      transfer: state.transferScore,
      robustness: avgSkill,
      retention: retentionRate,
      benchmarkPasses: avgSkill, // Proxy
      timeEfficiency: state.timeEfficiency.cohortPercentile,
      explainability: 0, // Would come from benchmark evaluations
    };

    return {
      ...state,
      masteryScore: this.calculateMasteryScore(components),
    };
  }

  /**
   * Get state or throw error
   */
  private async getStateOrThrow(learnerId: LearnerId): Promise<LearnerState> {
    const state = await this.storage.get(learnerId);
    if (state === null) {
      throw new Error(`Learner not found: ${learnerId}`);
    }
    return state;
  }
}
