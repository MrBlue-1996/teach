/**
 * TopShelf Service LLC - Kitchen Challenge State Machine
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * State machine driving the SOLVE → CONSEQUENCE → TEACH → VERIFY → MASTERY lifecycle.
 * Each challenge runs through this machine. The cook feels pressure during SOLVE,
 * sees the cost of mistakes in CONSEQUENCE, receives targeted instruction in TEACH,
 * proves the fix in VERIFY, and gets scored in MASTERY.
 */

import {
  ChallengePhase,
  ChallengeState,
  ChallengeConfig,
  ChallengeEvent,
  EventType,
  HiddenInfraction,
  MasteryDomain,
  ConsequencePayload,
  InfractionSeverity,
} from './types.js';

// =============================================================================
// PHASE TRANSITIONS
// =============================================================================

const VALID_TRANSITIONS: Record<ChallengePhase, ChallengePhase[]> = {
  [ChallengePhase.SETUP]: [ChallengePhase.SOLVE],
  [ChallengePhase.SOLVE]: [ChallengePhase.CONSEQUENCE, ChallengePhase.COOLDOWN],
  [ChallengePhase.CONSEQUENCE]: [ChallengePhase.TEACH],
  [ChallengePhase.TEACH]: [ChallengePhase.VERIFY],
  [ChallengePhase.VERIFY]: [ChallengePhase.MASTERY, ChallengePhase.COOLDOWN],
  [ChallengePhase.MASTERY]: [ChallengePhase.COMPLETED],
  [ChallengePhase.COOLDOWN]: [ChallengePhase.TEACH, ChallengePhase.SOLVE],
  [ChallengePhase.COMPLETED]: [],
};

/** Max consecutive failures before forced cooldown */
const COOLDOWN_THRESHOLD = 3;
/** Cooldown duration in milliseconds (5 minutes) */
const COOLDOWN_DURATION_MS = 300_000;
/** Handwash interval: silent infraction after 30 seconds of food contact without washing */
const HANDWASH_INTERVAL_MS = 30_000;

// =============================================================================
// STATE MACHINE
// =============================================================================

export class ChallengeMachine {
  private state: ChallengeState;
  private config: ChallengeConfig;
  private sequenceCounter: number;

  constructor(config: ChallengeConfig) {
    this.config = config;
    this.sequenceCounter = 0;
    this.state = this.createInitialState(config);
  }

  private createInitialState(config: ChallengeConfig): ChallengeState {
    const domainScores: Record<MasteryDomain, number> = {} as Record<MasteryDomain, number>;
    for (const domain of Object.values(MasteryDomain)) {
      domainScores[domain] = 100; // Start at 100, deducted for infractions
    }

    return {
      challengeId: config.id,
      phase: ChallengePhase.SETUP,
      startedAt: Date.now(),
      phaseStartedAt: Date.now(),
      timeRemainingMs: config.timeLimitSeconds * 1000,
      ticketsCompleted: 0,
      ticketsTotal: config.tickets?.length ?? 0,
      events: [],
      infractions: [],
      consecutiveFailures: 0,
      lastHandwashAt: null,
      wasteAccumulated: 0,
      activeSafetyViolations: [],
      domainScores,
      isVerification: false,
    };
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  getState(): Readonly<ChallengeState> {
    return this.state;
  }

  getConfig(): Readonly<ChallengeConfig> {
    return this.config;
  }

  getCurrentPhase(): ChallengePhase {
    return this.state.phase;
  }

  /**
   * Transition to the next valid phase.
   * Throws if the transition is not valid.
   */
  transition(toPhase: ChallengePhase): ChallengeState {
    const validTargets = VALID_TRANSITIONS[this.state.phase];
    if (!validTargets?.includes(toPhase)) {
      throw new Error(
        `Invalid transition: ${this.state.phase} → ${toPhase}. ` +
          `Valid targets: [${validTargets?.join(', ') ?? 'none'}]`
      );
    }

    this.recordEvent(EventType.PHASE_TRANSITION, {
      from: this.state.phase,
      to: toPhase,
    });

    this.state = {
      ...this.state,
      phase: toPhase,
      phaseStartedAt: Date.now(),
    };

    return this.state;
  }

  /**
   * Start the SOLVE phase. Timer begins.
   */
  startSolve(): ChallengeState {
    this.transition(ChallengePhase.SOLVE);
    this.recordEvent(EventType.CHALLENGE_STARTED, {
      challengeId: this.config.id,
      type: this.config.type,
      timeLimitSeconds: this.config.timeLimitSeconds,
    });
    return this.state;
  }

  /**
   * End the SOLVE phase and move to CONSEQUENCE.
   * Called when time runs out or the cook submits.
   */
  endSolve(): ChallengeState {
    if (this.shouldCooldown()) {
      return this.enterCooldown();
    }
    return this.transition(ChallengePhase.CONSEQUENCE);
  }

  /**
   * Build the consequence payload from accumulated infractions and move to TEACH.
   */
  buildConsequence(): ConsequencePayload {
    const infractions = this.state.infractions;
    const totalCostLost = infractions.reduce((sum, inf) => sum + inf.costImpact, 0);

    const safetyInfractions = infractions.filter(
      (inf) => inf.severity === InfractionSeverity.CRITICAL || inf.severity === InfractionSeverity.HIGH
    );

    const primaryDomain = this.findPrimaryFailureDomain(infractions);
    const grade = this.calculateGrade(infractions);

    return {
      totalCostLost: totalCostLost + this.state.wasteAccumulated,
      laborCostWasted: this.estimateLaborCost(),
      productWasted: this.state.wasteAccumulated,
      ticketDelaySeconds: this.calculateTicketDelay(),
      safetyRisks: safetyInfractions.map((inf) => ({
        type: inf.type,
        severity: inf.severity,
        realWorldConsequence: inf.whyItMatters,
      })),
      infractions,
      overallGrade: grade,
      primaryFailureDomain: primaryDomain,
      headline: this.generateHeadline(grade, primaryDomain, totalCostLost),
    };
  }

  /**
   * Move from CONSEQUENCE to TEACH.
   */
  enterTeach(): ChallengeState {
    return this.transition(ChallengePhase.TEACH);
  }

  /**
   * Move from TEACH to VERIFY for re-attempt.
   */
  enterVerify(): ChallengeState {
    this.state = { ...this.state, isVerification: true };
    return this.transition(ChallengePhase.VERIFY);
  }

  /**
   * Complete verification and move to MASTERY scoring.
   */
  completeMastery(): ChallengeState {
    return this.transition(ChallengePhase.MASTERY);
  }

  /**
   * Finalize the challenge.
   */
  complete(): ChallengeState {
    this.recordEvent(EventType.CHALLENGE_COMPLETED, {
      totalEvents: this.state.events.length,
      totalInfractions: this.state.infractions.length,
      wasteAccumulated: this.state.wasteAccumulated,
      domainScores: this.state.domainScores,
    });
    return this.transition(ChallengePhase.COMPLETED);
  }

  // ---------------------------------------------------------------------------
  // Event Recording
  // ---------------------------------------------------------------------------

  /**
   * Record a cook action as an event. This is the core of the event-sourced system.
   * Every meaningful interaction is captured here.
   */
  recordEvent(type: EventType, data: Record<string, unknown> = {}): ChallengeEvent {
    const event: ChallengeEvent = {
      id: `evt_${Date.now()}_${this.sequenceCounter}`,
      type,
      timestamp: Date.now(),
      phase: this.state.phase,
      data,
      sequenceNumber: this.sequenceCounter++,
    };

    this.state = {
      ...this.state,
      events: [...this.state.events, event],
    };

    return event;
  }

  // ---------------------------------------------------------------------------
  // Infraction Management
  // ---------------------------------------------------------------------------

  /**
   * Add a hidden infraction detected by the ShadowValidator.
   * Does NOT interrupt the cook — this is silent tracking.
   */
  addInfraction(infraction: HiddenInfraction): void {
    this.state = {
      ...this.state,
      infractions: [...this.state.infractions, infraction],
    };

    // Deduct from the relevant domain score
    const deduction = this.getDeduction(infraction.severity);
    const currentScore = this.state.domainScores[infraction.domain] ?? 100;
    this.state.domainScores[infraction.domain] = Math.max(0, currentScore - deduction);
  }

  /**
   * Track waste when an ingredient is discarded or mishandled.
   */
  addWaste(costDollars: number): void {
    this.state = {
      ...this.state,
      wasteAccumulated: this.state.wasteAccumulated + costDollars,
    };
  }

  /**
   * Record a hand wash event. Resets the dirty-hand timer.
   */
  recordHandwash(): void {
    this.recordEvent(EventType.HAND_WASH, {});
    this.state = {
      ...this.state,
      lastHandwashAt: Date.now(),
    };
  }

  /**
   * Check if the dirty-hand timer has expired.
   * Returns true if hands are "dirty" (too long since last wash).
   */
  areHandsDirty(currentTime: number = Date.now()): boolean {
    if (this.state.lastHandwashAt === null) {
      // Never washed — dirty if more than HANDWASH_INTERVAL from start
      return currentTime - this.state.phaseStartedAt > HANDWASH_INTERVAL_MS;
    }
    return currentTime - this.state.lastHandwashAt > HANDWASH_INTERVAL_MS;
  }

  /**
   * Record ticket completion.
   */
  completeTicket(ticketId: string): void {
    this.recordEvent(EventType.TICKET_COMPLETED, { ticketId });
    this.state = {
      ...this.state,
      ticketsCompleted: this.state.ticketsCompleted + 1,
    };
  }

  /**
   * Update the time remaining (called by the timer tick).
   */
  tick(elapsedMs: number): ChallengeState {
    const newRemaining = Math.max(0, this.state.timeRemainingMs - elapsedMs);
    this.state = {
      ...this.state,
      timeRemainingMs: newRemaining,
    };

    // Auto-end solve phase when timer hits zero
    if (newRemaining === 0 && this.state.phase === ChallengePhase.SOLVE) {
      return this.endSolve();
    }

    return this.state;
  }

  /**
   * Get the full event log for analysis.
   */
  getEventLog(): readonly ChallengeEvent[] {
    return this.state.events;
  }

  /**
   * Get all infractions for the Teach phase.
   */
  getInfractions(): readonly HiddenInfraction[] {
    return this.state.infractions;
  }

  // ---------------------------------------------------------------------------
  // Cooldown Logic
  // ---------------------------------------------------------------------------

  private shouldCooldown(): boolean {
    return this.state.consecutiveFailures >= COOLDOWN_THRESHOLD;
  }

  private enterCooldown(): ChallengeState {
    this.recordEvent(EventType.PHASE_TRANSITION, {
      from: this.state.phase,
      to: ChallengePhase.COOLDOWN,
      reason: 'consecutive_failures',
      failures: this.state.consecutiveFailures,
    });

    this.state = {
      ...this.state,
      phase: ChallengePhase.COOLDOWN,
      phaseStartedAt: Date.now(),
    };

    return this.state;
  }

  /**
   * Check if cooldown period has elapsed.
   */
  isCooldownComplete(): boolean {
    if (this.state.phase !== ChallengePhase.COOLDOWN) return true;
    return Date.now() - this.state.phaseStartedAt >= COOLDOWN_DURATION_MS;
  }

  /**
   * Increment consecutive failure count (called when Verify fails).
   */
  recordFailure(): void {
    this.state = {
      ...this.state,
      consecutiveFailures: this.state.consecutiveFailures + 1,
    };
  }

  /**
   * Reset consecutive failures (called when Verify succeeds).
   */
  resetFailures(): void {
    this.state = {
      ...this.state,
      consecutiveFailures: 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Scoring & Analysis Helpers
  // ---------------------------------------------------------------------------

  private getDeduction(severity: InfractionSeverity): number {
    switch (severity) {
      case InfractionSeverity.LOW:
        return 5;
      case InfractionSeverity.MEDIUM:
        return 10;
      case InfractionSeverity.HIGH:
        return 20;
      case InfractionSeverity.CRITICAL:
        return 35;
      default:
        return 0;
    }
  }

  private findPrimaryFailureDomain(infractions: HiddenInfraction[]): MasteryDomain {
    const domainCounts: Partial<Record<MasteryDomain, number>> = {};
    for (const inf of infractions) {
      domainCounts[inf.domain] = (domainCounts[inf.domain] ?? 0) + 1;
    }

    let maxDomain = MasteryDomain.EFFICIENCY;
    let maxCount = 0;
    for (const [domain, count] of Object.entries(domainCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxDomain = domain as MasteryDomain;
      }
    }
    return maxDomain;
  }

  private calculateGrade(
    infractions: HiddenInfraction[]
  ): 'F' | 'D' | 'C' | 'B' | 'A' | 'A+' {
    const criticalCount = infractions.filter(
      (i) => i.severity === InfractionSeverity.CRITICAL
    ).length;
    const highCount = infractions.filter(
      (i) => i.severity === InfractionSeverity.HIGH
    ).length;
    const total = infractions.length;

    if (criticalCount > 0) return 'F';
    if (highCount >= 3 || total >= 8) return 'D';
    if (highCount >= 1 || total >= 5) return 'C';
    if (total >= 3) return 'B';
    if (total >= 1) return 'A';
    return 'A+';
  }

  private estimateLaborCost(): number {
    // Assume ~$18/hr line cook rate. Calculate wasted labor time.
    const phaseTimeMs = Date.now() - this.state.phaseStartedAt;
    const phaseTimeHours = phaseTimeMs / 3_600_000;
    const inefficiencyFactor = this.state.infractions.length * 0.05;
    return Math.round(18 * phaseTimeHours * inefficiencyFactor * 100) / 100;
  }

  private calculateTicketDelay(): number {
    if (this.state.ticketsTotal === 0) return 0;
    const expectedTimePerTicket = this.config.timeLimitSeconds / this.state.ticketsTotal;
    const actualTimePerTicket =
      this.state.ticketsCompleted > 0
        ? (Date.now() - this.state.startedAt) / 1000 / this.state.ticketsCompleted
        : this.config.timeLimitSeconds;
    return Math.max(0, Math.round(actualTimePerTicket - expectedTimePerTicket));
  }

  private generateHeadline(
    grade: string,
    primaryDomain: MasteryDomain,
    costLost: number
  ): string {
    if (grade === 'F') {
      return `Critical safety failure. $${costLost.toFixed(2)} at risk. A real kitchen would shut this station down.`;
    }
    if (grade === 'D') {
      return `Major issues in ${primaryDomain.replace('_', ' ')}. $${costLost.toFixed(2)} lost. This round would get you pulled aside by the chef.`;
    }
    if (grade === 'C') {
      return `Needs work. ${primaryDomain.replace('_', ' ')} is your weak spot. $${costLost.toFixed(2)} in waste and errors.`;
    }
    if (grade === 'B') {
      return `Solid effort, but ${this.state.infractions.length} mistakes caught. Review the details.`;
    }
    if (grade === 'A') {
      return `Strong performance with minor corrections needed. Nearly clean execution.`;
    }
    return `Flawless. Zero infractions. This is executive-level execution.`;
  }
}
