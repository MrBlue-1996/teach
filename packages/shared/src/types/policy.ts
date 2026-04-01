/**
 * Policy Engine Types (TS-POLICY-005)
 *
 * Types for the layered policy model, promotion rules,
 * and evaluation decisions.
 */

import type { LearningMode, LearnerId, SkillDomain } from './learner.js';
import type { BadgeId } from './content.js';

/** Policy version identifier */
export type PolicyVersion = `${number}-${number}-${number}`;

/** Signal type for multi-signal evaluation */
export type SignalType =
  | 'benchmark_passes'
  | 'transfer_score'
  | 'time_efficiency'
  | 'retention'
  | 'explainability'
  | 'robustness'
  | 'correctness';

/** Policy evaluation result */
export type PolicyDecision = 'promote' | 'demote' | 'hold' | 'defer' | 'remediate';

/** Multi-signal promotion configuration */
export interface MultiSignalConfig {
  /** Required signals that must be present */
  readonly requiredSignals: readonly SignalType[];
  /** Time window for signal collection in minutes */
  readonly windowMinutes: number;
  /** Consecutive passes required for promotion */
  readonly consecutivePasses: number;
  /** Minimum transfer score threshold [0, 1] */
  readonly transferThreshold: number;
  /** Minimum time efficiency percentile [0, 1] */
  readonly timePercentileThreshold: number;
  /** Number of tasks in probation window after promotion */
  readonly probationTasks: number;
  /** Failure rate that triggers rollback [0, 1] */
  readonly rollbackOnFailureRate: number;
}

/** Promotion policy definition (TS-POLICY-005) */
export interface PromotionPolicy {
  /** Policy version */
  readonly policyVersion: PolicyVersion;
  /** Multi-signal configuration */
  readonly multiSignal: MultiSignalConfig;
  /** Domain-specific overrides */
  readonly domainOverrides?: Readonly<Record<SkillDomain, Partial<MultiSignalConfig>>>;
  /** Employer-mandated requirements */
  readonly employerRequirements?: EmployerRequirements;
}

/** Employer-specific requirements that override learner preferences */
export interface EmployerRequirements {
  /** Required badges for role */
  readonly requiredBadges: readonly BadgeId[];
  /** Minimum retention period in days */
  readonly minRetentionDays: number;
  /** Whether proctored capstone is required */
  readonly requiresProctoredCapstone: boolean;
  /** Custom promotion thresholds */
  readonly promotionThresholds?: Partial<MultiSignalConfig>;
}

/** Signal value with metadata */
export interface SignalValue {
  /** Signal type */
  readonly type: SignalType;
  /** Numeric value [0, 1] for thresholds, count for passes */
  readonly value: number;
  /** Confidence in the signal [0, 1] */
  readonly confidence: number;
  /** ISO 8601 timestamp of measurement */
  readonly measuredAt: string;
  /** Evidence IDs supporting this signal */
  readonly evidenceIds: readonly string[];
}

/** Policy evaluation input */
export interface PolicyEvaluationInput {
  /** Learner identifier */
  readonly learnerId: LearnerId;
  /** Skill domain being evaluated */
  readonly domain: SkillDomain;
  /** Current learning mode */
  readonly currentMode: LearningMode;
  /** Collected signals */
  readonly signals: readonly SignalValue[];
  /** Applicable policy */
  readonly policy: PromotionPolicy;
  /** Whether in probation window */
  readonly inProbation: boolean;
  /** Tasks completed in current probation */
  readonly probationTasksCompleted: number;
}

/** Policy evaluation output */
export interface PolicyEvaluationOutput {
  /** Decision reached */
  readonly decision: PolicyDecision;
  /** Target mode if promoting/demoting */
  readonly targetMode?: LearningMode;
  /** Reasoning for decision */
  readonly reasoning: string;
  /** Signals that contributed to decision */
  readonly contributingSignals: readonly SignalValue[];
  /** Missing signals that caused defer */
  readonly missingSignals?: readonly SignalType[];
  /** Recommended next action */
  readonly recommendedAction: RecommendedAction;
  /** ISO 8601 timestamp of evaluation */
  readonly evaluatedAt: string;
  /** Signature of the evaluation (for audit) */
  readonly signature: string;
}

/** Recommended action following policy evaluation */
export interface RecommendedAction {
  /** Action type */
  readonly type: 'continue' | 'probe' | 'remediate' | 'review';
  /** Specific task or probe to administer */
  readonly taskId?: string;
  /** Probe type if applicable */
  readonly probeType?: ProbeType;
  /** Remediation teaching block if applicable */
  readonly remediationBlockId?: string;
}

/** Probe types for targeted assessment */
export type ProbeType =
  | 'replication'
  | 'variation'
  | 'recovery'
  | 'time_boxed'
  | 'retention_24h'
  | 'retention_7d'
  | 'retention_30d'
  | 'far_transfer'
  | 'explainability';

/** Policy layer for layered evaluation */
export interface PolicyLayer {
  /** Layer name */
  readonly name: 'safety' | 'employer' | 'learner' | 'system';
  /** Priority (lower = higher priority) */
  readonly priority: number;
  /** Rules in this layer */
  readonly rules: readonly PolicyRule[];
}

/** Individual policy rule */
export interface PolicyRule {
  /** Rule identifier */
  readonly id: string;
  /** Human-readable description */
  readonly description: string;
  /** Condition expression (evaluated against signals) */
  readonly condition: string;
  /** Action if condition is true */
  readonly action: PolicyDecision;
  /** Whether this rule is terminal (stops further evaluation) */
  readonly terminal: boolean;
}

/** Audit record for policy evaluation */
export interface PolicyAuditRecord {
  /** Unique audit record ID */
  readonly auditId: string;
  /** Evaluation input (redacted for PII) */
  readonly input: PolicyEvaluationInput;
  /** Evaluation output */
  readonly output: PolicyEvaluationOutput;
  /** Policy version used */
  readonly policyVersion: PolicyVersion;
  /** ISO 8601 timestamp */
  readonly timestamp: string;
  /** Server node that performed evaluation */
  readonly nodeId: string;
  /** Cryptographic signature */
  readonly signature: string;
}
