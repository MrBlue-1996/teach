/**
 * Learner State Types (TS-NLP-008)
 *
 * Core types for tracking learner progress, skill estimates,
 * promotion history, and multi-signal evaluation data.
 */

/** Unique identifier for a learner */
export type LearnerId = `u-${string}`;

/** Skill domain identifier (e.g., "networking.subnetting") */
export type SkillDomain = string;

/** Learning mode levels - L0 is canonical solution, L1-L4 are teaching layers */
export type LearningMode = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

/** Skill estimate with confidence interval */
export interface SkillEstimate {
  /** Normalized score [0, 1] */
  readonly score: number;
  /** Standard error of the estimate [0, 1] */
  readonly confidence: number;
  /** ISO 8601 timestamp of last update */
  readonly lastUpdated: string;
  /** Number of observations contributing to estimate */
  readonly observationCount: number;
}

/** Time efficiency metrics relative to cohort */
export interface TimeEfficiency {
  /** Median task completion time in milliseconds */
  readonly medianMs: number;
  /** Percentile rank within cohort [0, 1] */
  readonly cohortPercentile: number;
  /** Sample size for percentile calculation */
  readonly sampleSize: number;
}

/** Single retention check record */
export interface RetentionRecord {
  /** Task identifier that was retested */
  readonly taskId: string;
  /** ISO 8601 date of retention check */
  readonly date: string;
  /** Whether learner passed the retention check */
  readonly pass: boolean;
  /** Days since original completion */
  readonly daysSinceOriginal: number;
  /** Response latency in milliseconds */
  readonly latencyMs: number;
}

/** Promotion history entry */
export interface PromotionRecord {
  /** Mode before promotion */
  readonly from: LearningMode;
  /** Mode after promotion */
  readonly to: LearningMode;
  /** ISO 8601 timestamp */
  readonly timestamp: string;
  /** Skill domain affected */
  readonly domain: SkillDomain;
  /** Evidence that triggered promotion */
  readonly evidenceIds: readonly string[];
  /** Whether this was a rollback (demotion) */
  readonly isRollback: boolean;
}

/** Composite mastery score with weighted components */
export interface MasteryScore {
  /** Overall composite score [0, 1] */
  readonly composite: number;
  /** Individual component scores */
  readonly components: {
    readonly transfer: number;
    readonly robustness: number;
    readonly retention: number;
    readonly benchmarkPasses: number;
    readonly timeEfficiency: number;
    readonly explainability: number;
  };
  /** Weights used for calculation */
  readonly weights: {
    readonly transfer: number;
    readonly robustness: number;
    readonly retention: number;
    readonly benchmarkPasses: number;
    readonly timeEfficiency: number;
    readonly explainability: number;
  };
}

/** Complete learner state (TS-NLP-008) */
export interface LearnerState {
  /** Unique learner identifier */
  readonly learnerId: LearnerId;
  /** Skill estimates by domain */
  readonly skillEstimates: Readonly<Record<SkillDomain, SkillEstimate>>;
  /** Time efficiency metrics */
  readonly timeEfficiency: TimeEfficiency;
  /** Transfer score - ability to apply to novel situations */
  readonly transferScore: number;
  /** Historical retention check results */
  readonly retentionHistory: readonly RetentionRecord[];
  /** Promotion and rollback history */
  readonly promotionHistory: readonly PromotionRecord[];
  /** ISO 8601 timestamp of last activity */
  readonly lastActivity: string;
  /** Current learning modes by domain */
  readonly currentModes: Readonly<Record<SkillDomain, LearningMode>>;
  /** Active probation windows (domain -> remaining tasks) */
  readonly probationWindows: Readonly<Record<SkillDomain, number>>;
  /** Computed mastery score */
  readonly masteryScore: MasteryScore;
}

/** Learner event for audit trail */
export interface LearnerEvent {
  /** Unique event identifier */
  readonly eventId: string;
  /** Learner identifier */
  readonly learnerId: LearnerId;
  /** Event type */
  readonly eventType:
    | 'task_started'
    | 'task_completed'
    | 'task_abandoned'
    | 'promotion'
    | 'rollback'
    | 'retention_check'
    | 'benchmark_attempt'
    | 'calibration';
  /** ISO 8601 timestamp */
  readonly timestamp: string;
  /** Event-specific payload */
  readonly payload: Record<string, unknown>;
  /** Client-generated nonce for replay protection */
  readonly nonce: string;
  /** Signature of the event (server-side) */
  readonly signature?: string;
}

/** Calibration probe result */
export interface CalibrationResult {
  /** Time to complete probe in milliseconds */
  readonly completionTimeMs: number;
  /** First action type */
  readonly firstAction: 'view_solution' | 'attempt_direct' | 'request_hint';
  /** Number of retries */
  readonly retryCount: number;
  /** Whether logs/code were pasted */
  readonly pastedContent: boolean;
  /** Recommended initial mode */
  readonly recommendedMode: LearningMode;
  /** Confidence in recommendation [0, 1] */
  readonly confidence: number;
}
