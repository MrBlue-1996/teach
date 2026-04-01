/**
 * Benchmark Types (TS-NLP-008)
 *
 * Types for micro-benchmarks, probes, and assessment
 * used in the multi-signal evaluation system.
 */

import type { LearnerId, SkillDomain } from './learner.js';
import type { TeachingBlockId, DifficultyLevel } from './content.js';
import type { ProbeType } from './policy.js';

/** Benchmark identifier */
export type BenchmarkId = `bench-${string}`;

/** Attempt identifier */
export type AttemptId = `attempt-${string}`;

/** Benchmark status */
export type BenchmarkStatus = 'pending' | 'in_progress' | 'completed' | 'abandoned' | 'timed_out';

/** Benchmark result */
export type BenchmarkResult = 'pass' | 'fail' | 'partial' | 'inconclusive';

/** Micro-benchmark definition */
export interface MicroBenchmark {
  /** Unique benchmark identifier */
  readonly id: BenchmarkId;
  /** Probe type this benchmark implements */
  readonly probeType: ProbeType;
  /** Skill domain being assessed */
  readonly domain: SkillDomain;
  /** Related teaching block */
  readonly teachingBlockId: TeachingBlockId;
  /** Difficulty level */
  readonly difficulty: DifficultyLevel;
  /** Time limit in seconds */
  readonly timeLimitSeconds: number;
  /** Benchmark prompt/task description */
  readonly prompt: string;
  /** Expected response structure */
  readonly expectedResponseSchema: Record<string, unknown>;
  /** Scoring rubric */
  readonly scoringRubric: ScoringRubric;
  /** Randomization seed (for deterministic variants) */
  readonly randomizationSeed?: string;
  /** Surface variants for this benchmark */
  readonly variants: readonly BenchmarkVariant[];
}

/** Benchmark variant */
export interface BenchmarkVariant {
  /** Variant identifier */
  readonly variantId: string;
  /** Modified prompt */
  readonly prompt: string;
  /** Modified expected response */
  readonly expectedResponseSchema: Record<string, unknown>;
  /** Difficulty adjustment factor */
  readonly difficultyFactor: number;
}

/** Scoring rubric for benchmark evaluation */
export interface ScoringRubric {
  /** Correctness weight [0, 1] */
  readonly correctnessWeight: number;
  /** Time efficiency weight [0, 1] */
  readonly timeWeight: number;
  /** Process/approach weight [0, 1] */
  readonly processWeight: number;
  /** Explanation quality weight [0, 1] */
  readonly explanationWeight: number;
  /** Minimum passing score [0, 1] */
  readonly passingThreshold: number;
  /** Criteria for partial credit */
  readonly partialCreditCriteria: readonly PartialCreditCriterion[];
}

/** Criterion for partial credit */
export interface PartialCreditCriterion {
  /** Criterion identifier */
  readonly id: string;
  /** Description */
  readonly description: string;
  /** Credit awarded [0, 1] */
  readonly credit: number;
  /** Condition for awarding credit */
  readonly condition: string;
}

/** Benchmark attempt record */
export interface BenchmarkAttempt {
  /** Unique attempt identifier */
  readonly attemptId: AttemptId;
  /** Benchmark being attempted */
  readonly benchmarkId: BenchmarkId;
  /** Variant used (if any) */
  readonly variantId?: string;
  /** Learner making the attempt */
  readonly learnerId: LearnerId;
  /** Current status */
  readonly status: BenchmarkStatus;
  /** ISO 8601 start timestamp */
  readonly startedAt: string;
  /** ISO 8601 completion timestamp */
  readonly completedAt?: string;
  /** Time taken in milliseconds */
  readonly durationMs?: number;
  /** Learner's response */
  readonly response?: BenchmarkResponse;
  /** Evaluation result */
  readonly evaluation?: BenchmarkEvaluation;
}

/** Learner's response to benchmark */
export interface BenchmarkResponse {
  /** Primary answer/solution */
  readonly answer: string;
  /** Explanation if required */
  readonly explanation?: string;
  /** Intermediate steps captured */
  readonly steps: readonly ResponseStep[];
  /** Metadata about the response process */
  readonly metadata: {
    /** Number of edits/revisions */
    readonly revisionCount: number;
    /** Time to first action in milliseconds */
    readonly timeToFirstActionMs: number;
    /** Whether any content was pasted */
    readonly pastedContent: boolean;
    /** Keystrokes per minute (anonymized) */
    readonly typingSpeedWpm?: number;
  };
}

/** Intermediate step in response */
export interface ResponseStep {
  /** Step sequence number */
  readonly sequence: number;
  /** Step content */
  readonly content: string;
  /** Timestamp relative to start */
  readonly relativeTimeMs: number;
  /** Step type */
  readonly type: 'input' | 'revision' | 'hint_request' | 'undo';
}

/** Benchmark evaluation result */
export interface BenchmarkEvaluation {
  /** Overall result */
  readonly result: BenchmarkResult;
  /** Numeric score [0, 1] */
  readonly score: number;
  /** Component scores */
  readonly componentScores: {
    readonly correctness: number;
    readonly timeEfficiency: number;
    readonly process: number;
    readonly explanation: number;
  };
  /** Feedback for learner */
  readonly feedback: string;
  /** Identified strengths */
  readonly strengths: readonly string[];
  /** Areas for improvement */
  readonly improvements: readonly string[];
  /** Evaluation method */
  readonly evaluationMethod: 'deterministic' | 'llm' | 'hybrid' | 'human';
  /** Confidence in evaluation [0, 1] */
  readonly confidence: number;
  /** ISO 8601 evaluation timestamp */
  readonly evaluatedAt: string;
}

/** Retention probe configuration */
export interface RetentionProbeConfig {
  /** Probe type (24h, 7d, 30d) */
  readonly type: 'retention_24h' | 'retention_7d' | 'retention_30d';
  /** Original task ID being retested */
  readonly originalTaskId: string;
  /** Days since original completion */
  readonly daysSinceOriginal: number;
  /** Acceptable decay factor [0, 1] */
  readonly acceptableDecay: number;
}

/** Transfer probe configuration */
export interface TransferProbeConfig {
  /** Whether this is near or far transfer */
  readonly transferType: 'near' | 'far';
  /** Source domain */
  readonly sourceDomain: SkillDomain;
  /** Target domain */
  readonly targetDomain: SkillDomain;
  /** Similarity to original [0, 1] */
  readonly similarity: number;
}

/** Recovery probe configuration */
export interface RecoveryProbeConfig {
  /** Error scenario to recover from */
  readonly errorScenario: string;
  /** Expected recovery steps */
  readonly expectedSteps: readonly string[];
  /** Whether debugging tools are provided */
  readonly providesTools: boolean;
}
