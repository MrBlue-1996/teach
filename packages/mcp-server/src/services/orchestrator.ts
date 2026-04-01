/**
 * MCP Orchestrator Service (TS-ARCH-003)
 *
 * Core orchestration layer that coordinates:
 * - Policy evaluation
 * - Content delivery
 * - Learner state updates
 * - Audit logging
 */

import { LearnerStateManager } from '@topshelf/nlp';
import { PolicyEvaluator, PolicyAuditLogger, SignalCollector } from '@topshelf/policy-engine';
import {
  nowISO,
  generateRequestId,
  LEARNING_MODE_ORDER,
  DEFAULT_MULTI_SIGNAL_CONFIG,
} from '@topshelf/shared';

import type { SignalCollectionContext } from '@topshelf/policy-engine';
import type {
  LearnerId,
  DeviceProfile,
  ContentPackManifest,
  TeachingBlock,
  PolicyEvaluationInput,
  PolicyEvaluationOutput,
  GetNextTaskResponse,
  TaskCompletionRequest,
  CalibrationResult,
  LearnerEvent,
  PromotionPolicy,
  LearningMode,
} from '@topshelf/shared';

/** Content store interface */
export interface ContentStore {
  getPackById(packId: string): Promise<ContentPackManifest | null>;
  getPacksForDomain(domain: string): Promise<ContentPackManifest[]>;
  getBlockById(packId: string, blockId: string): Promise<TeachingBlock | null>;
}

/** Event store interface */
export interface EventStore {
  append(event: LearnerEvent): Promise<void>;
  getByLearner(learnerId: LearnerId, limit?: number): Promise<LearnerEvent[]>;
}

/** Orchestrator configuration */
export interface OrchestratorConfig {
  readonly nodeId: string;
  readonly signingKey: string;
  readonly defaultPolicy: PromotionPolicy;
}

/**
 * MCP Orchestrator - main coordination service
 */
export class MCPOrchestrator {
  private readonly config: OrchestratorConfig;
  private readonly policyEvaluator: PolicyEvaluator;
  private readonly signalCollector: SignalCollector;
  private readonly learnerStateManager: LearnerStateManager;
  private readonly auditLogger: PolicyAuditLogger;
  private readonly contentStore: ContentStore;
  private readonly eventStore: EventStore;

  constructor(
    config: OrchestratorConfig,
    learnerStateManager: LearnerStateManager,
    auditLogger: PolicyAuditLogger,
    contentStore: ContentStore,
    eventStore: EventStore
  ) {
    this.config = config;
    this.policyEvaluator = new PolicyEvaluator(config.nodeId, config.signingKey);
    this.signalCollector = new SignalCollector();
    this.learnerStateManager = learnerStateManager;
    this.auditLogger = auditLogger;
    this.contentStore = contentStore;
    this.eventStore = eventStore;
  }

  /**
   * Process calibration and set initial mode
   */
  async processCalibration(
    learnerId: LearnerId,
    result: CalibrationResult,
    deviceProfile: DeviceProfile
  ): Promise<{ mode: LearningMode; confidence: number }> {
    const state = await this.learnerStateManager.getState(learnerId);
    if (state === null) {
      throw new Error(`Learner not found: ${learnerId}`);
    }

    // Log calibration event
    await this.eventStore.append({
      eventId: generateRequestId().replace('req-', 'event-'),
      learnerId,
      eventType: 'calibration',
      timestamp: nowISO(),
      payload: {
        result,
        deviceProfile: {
          tier: deviceProfile.tier,
          networkQuality: deviceProfile.networkQuality,
        },
      },
      nonce: Math.random().toString(36).slice(2),
    });

    return {
      mode: result.recommendedMode,
      confidence: result.confidence,
    };
  }

  /**
   * Get next task for learner
   */
  async getNextTask(
    learnerId: LearnerId,
    domain: string,
    deviceProfile: DeviceProfile
  ): Promise<GetNextTaskResponse | null> {
    const state = await this.learnerStateManager.getState(learnerId);
    if (state === null) {
      throw new Error(`Learner not found: ${learnerId}`);
    }

    // Get current mode for domain
    const currentMode = state.currentModes[domain] ?? 'L2';

    // Find appropriate content pack
    const packs = await this.contentStore.getPacksForDomain(domain);
    if (packs.length === 0) {
      return null;
    }

    // Filter packs compatible with device
    const compatiblePacks = packs.filter(
      (p) => p.minDeviceProfile.ramMb <= (deviceProfile.capabilities.deviceMemory ?? 4) * 1024
    );

    if (compatiblePacks.length === 0) {
      return null;
    }

    // Select pack and block based on mode and progress
    const pack = compatiblePacks[0];
    if (pack === undefined) {
      return null;
    }

    const block = this.selectBlockForMode(pack, currentMode, state.skillEstimates);
    if (block === null) {
      return null;
    }

    return {
      teachingBlock: {
        id: block.id,
        concept: block.concept,
        mode: currentMode,
        canonicalSolution: block.canonicalSolution,
        explanation: block.explanation,
        timeBudgetSeconds: block.timeBudgetSeconds,
        hints: block.hints,
      },
      contentPack: {
        id: pack.id,
        version: pack.version,
      },
      cacheInstructions: {
        preloadBlocks: this.getPreloadBlocks(pack, block),
        cacheStrategy: 'stale-while-revalidate',
      },
    };
  }

  /**
   * Process task completion
   */
  async processTaskCompletion(request: TaskCompletionRequest): Promise<PolicyEvaluationOutput> {
    const { learnerId, blockId, completion, events } = request;

    const state = await this.learnerStateManager.getState(learnerId);
    if (state === null) {
      throw new Error(`Learner not found: ${learnerId}`);
    }

    // Store events
    for (const event of events) {
      await this.eventStore.append(event);
    }

    // Extract domain from block ID (simplified)
    const domain = this.extractDomainFromBlockId(blockId);

    // Update skill estimate based on completion
    const score = this.calculateCompletionScore(completion);
    await this.learnerStateManager.updateSkillEstimate(
      learnerId,
      domain,
      score,
      0.7 // Confidence
    );

    // Update time efficiency
    const cohortMedianMs = 120000; // Would come from cohort data
    await this.learnerStateManager.recordTaskCompletion(
      learnerId,
      completion.timeMs,
      cohortMedianMs
    );

    // Check probation and decrement if needed
    const probation = await this.learnerStateManager.isInProbation(learnerId, domain);
    if (probation.inProbation) {
      await this.learnerStateManager.decrementProbation(learnerId, domain);
    }

    // Get updated state for policy evaluation
    const updatedState = await this.learnerStateManager.getState(learnerId);
    if (updatedState === null) {
      throw new Error(`Learner state lost: ${learnerId}`);
    }

    // Collect signals for policy evaluation
    const signalContext: SignalCollectionContext = {
      learnerState: updatedState,
      recentBenchmarks: [], // Would come from benchmark store
      recentRetentionChecks: updatedState.retentionHistory.slice(-5),
      windowMinutes: this.config.defaultPolicy.multiSignal.windowMinutes,
    };
    const signals = this.signalCollector.collectSignals(signalContext);

    // Build policy evaluation input
    const policyInput: PolicyEvaluationInput = {
      learnerId,
      domain,
      currentMode: updatedState.currentModes[domain] ?? 'L2',
      signals,
      policy: this.config.defaultPolicy,
      inProbation: probation.inProbation,
      probationTasksCompleted: probation.inProbation
        ? this.config.defaultPolicy.multiSignal.probationTasks - probation.tasksRemaining + 1
        : 0,
    };

    // Evaluate policy
    const policyOutput = this.policyEvaluator.evaluate(policyInput);

    // Log audit record
    await this.auditLogger.logEvaluation(policyInput, policyOutput);

    // Apply promotion/demotion if decided
    if (
      (policyOutput.decision === 'promote' || policyOutput.decision === 'demote') &&
      policyOutput.targetMode !== undefined
    ) {
      await this.learnerStateManager.recordPromotion(
        learnerId,
        domain,
        policyInput.currentMode,
        policyOutput.targetMode,
        policyOutput.contributingSignals.map((s) => s.type),
        policyOutput.decision === 'demote'
      );
    }

    return policyOutput;
  }

  /**
   * Select appropriate block based on mode and progress
   */
  private selectBlockForMode(
    pack: ContentPackManifest,
    mode: LearningMode,
    skillEstimates: Record<string, { score: number }>
  ): TeachingBlock | null {
    // Filter blocks by mode compatibility
    const modeIndex = LEARNING_MODE_ORDER.indexOf(mode);
    const eligibleBlocks = pack.teachingBlocks.filter((block) => {
      const blockModeIndex = LEARNING_MODE_ORDER.indexOf(block.mode);
      return blockModeIndex <= modeIndex;
    });

    if (eligibleBlocks.length === 0) {
      return pack.teachingBlocks[0] ?? null;
    }

    // Select block with lowest skill estimate (needs most practice)
    let selectedBlock = eligibleBlocks[0];
    let lowestScore = 1;

    for (const block of eligibleBlocks) {
      const estimate = skillEstimates[block.concept];
      const score = estimate?.score ?? 0;
      if (score < lowestScore) {
        lowestScore = score;
        selectedBlock = block;
      }
    }

    return selectedBlock ?? null;
  }

  /**
   * Get blocks to preload for offline
   */
  private getPreloadBlocks(
    pack: ContentPackManifest,
    currentBlock: TeachingBlock
  ): readonly `tb-${string}`[] {
    const preload: `tb-${string}`[] = [];
    const currentIndex = pack.teachingBlocks.findIndex((b) => b.id === currentBlock.id);

    // Preload next 2 blocks
    for (
      let i = currentIndex + 1;
      i < Math.min(currentIndex + 3, pack.teachingBlocks.length);
      i++
    ) {
      const block = pack.teachingBlocks[i];
      if (block !== undefined) {
        preload.push(block.id);
      }
    }

    return preload;
  }

  /**
   * Extract domain from block ID (simplified)
   */
  private extractDomainFromBlockId(blockId: string): string {
    // In production, would look up block metadata
    if (blockId.includes('linux')) {
      return 'linux';
    }
    if (blockId.includes('net')) {
      return 'networking';
    }
    return 'general';
  }

  /**
   * Calculate completion score from task data
   */
  private calculateCompletionScore(completion: TaskCompletionRequest['completion']): number {
    let score = 0.5; // Base score

    // Adjust for retries (fewer is better)
    score -= completion.retryCount * 0.1;

    // Adjust for hints (fewer is better)
    score -= completion.hintsUsed * 0.05;

    // Bonus for explanation if provided
    if (completion.explanation !== undefined && completion.explanation.length > 50) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }
}

/**
 * Create default orchestrator configuration
 */
export function createDefaultOrchestratorConfig(
  nodeId: string,
  signingKey: string
): OrchestratorConfig {
  return {
    nodeId,
    signingKey,
    defaultPolicy: {
      policyVersion: '2026-01-21',
      multiSignal: DEFAULT_MULTI_SIGNAL_CONFIG,
    },
  };
}
