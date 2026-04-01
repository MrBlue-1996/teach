/**
 * Badge and Employer Artifact Types (TS-BADGE-011)
 *
 * Types for employer-facing proof artifacts, badges,
 * signed reports, and verification.
 */

import type { LearnerId } from './learner.js';
import type { BadgeId, ContentPackId } from './content.js';
import type { PolicyVersion } from './policy.js';

/** Evidence identifier */
export type EvidenceId = `evidence-${string}`;

/** Artifact identifier */
export type ArtifactId = `artifact-${string}`;

/** Badge status */
export type BadgeStatus = 'pending' | 'issued' | 'revoked' | 'expired';

/** Evidence type */
export type EvidenceType =
  | 'capstone_completion'
  | 'retention_check'
  | 'proctored_assessment'
  | 'benchmark_pass'
  | 'transfer_demonstration';

/** Single piece of evidence supporting a badge */
export interface Evidence {
  /** Unique evidence identifier */
  readonly id: EvidenceId;
  /** Type of evidence */
  readonly type: EvidenceType;
  /** ISO 8601 timestamp of evidence collection */
  readonly collectedAt: string;
  /** Score achieved [0, 1] */
  readonly score: number;
  /** Whether evidence was from proctored session */
  readonly proctored: boolean;
  /** Content pack that generated this evidence */
  readonly contentPackId: ContentPackId;
  /** Task or block identifier */
  readonly taskId: string;
  /** Cryptographic hash of raw evidence data */
  readonly evidenceHash: string;
}

/** Badge metadata (TS-BADGE-011) */
export interface Badge {
  /** Unique badge identifier */
  readonly badgeId: BadgeId;
  /** Human-readable badge name */
  readonly name: string;
  /** Badge description */
  readonly description: string;
  /** Learner who earned the badge */
  readonly learnerId: LearnerId;
  /** ISO 8601 issuance timestamp */
  readonly issuedAt: string;
  /** ISO 8601 expiration timestamp (if applicable) */
  readonly expiresAt?: string;
  /** Current status */
  readonly status: BadgeStatus;
  /** Evidence IDs supporting this badge */
  readonly evidence: readonly EvidenceId[];
  /** Content packs contributing to this badge */
  readonly contentPackIds: readonly ContentPackId[];
  /** Policy version used for issuance decision */
  readonly policyVersion: PolicyVersion;
  /** Cryptographic signature */
  readonly signature: string;
  /** Signing key identifier */
  readonly signingKeyId: string;
}

/** Timed simulation report for employers */
export interface TimedSimulationReport {
  /** Unique report identifier */
  readonly reportId: ArtifactId;
  /** Badge this report is for */
  readonly badgeId: BadgeId;
  /** Learner identifier */
  readonly learnerId: LearnerId;
  /** Simulation details */
  readonly simulation: {
    /** Simulation name */
    readonly name: string;
    /** Time limit in seconds */
    readonly timeLimitSeconds: number;
    /** Actual completion time in seconds */
    readonly completionTimeSeconds: number;
    /** Tasks completed */
    readonly tasksCompleted: number;
    /** Tasks attempted */
    readonly tasksAttempted: number;
    /** Correctness score [0, 1] */
    readonly correctnessScore: number;
    /** Whether proctored */
    readonly proctored: boolean;
  };
  /** ISO 8601 generation timestamp */
  readonly generatedAt: string;
  /** Cryptographic signature */
  readonly signature: string;
}

/** Cohort comparison report */
export interface CohortComparisonReport {
  /** Unique report identifier */
  readonly reportId: ArtifactId;
  /** Badge this report is for */
  readonly badgeId: BadgeId;
  /** Learner identifier */
  readonly learnerId: LearnerId;
  /** Cohort metrics */
  readonly cohortMetrics: {
    /** Cohort size */
    readonly cohortSize: number;
    /** Learner's percentile rank */
    readonly percentileRank: number;
    /** Time to completion vs cohort median */
    readonly timeVsMedianRatio: number;
    /** Error rate vs cohort median */
    readonly errorRateVsMedianRatio: number;
    /** Retention score vs cohort median */
    readonly retentionVsMedianRatio: number;
  };
  /** ISO 8601 generation timestamp */
  readonly generatedAt: string;
  /** Cohort definition (anonymized) */
  readonly cohortDefinition: string;
  /** Cryptographic signature */
  readonly signature: string;
}

/** Complete employer artifact package */
export interface EmployerArtifact {
  /** Unique artifact identifier */
  readonly artifactId: ArtifactId;
  /** Badge being attested */
  readonly badge: Badge;
  /** Timed simulation report */
  readonly simulationReport: TimedSimulationReport;
  /** Cohort comparison report */
  readonly cohortReport: CohortComparisonReport;
  /** Provenance information */
  readonly provenance: {
    /** TopShelf platform version */
    readonly platformVersion: string;
    /** Content pack IDs and versions used */
    readonly contentPacks: readonly { id: ContentPackId; version: string }[];
    /** Policy version */
    readonly policyVersion: PolicyVersion;
    /** Signing key identifier */
    readonly signingKeyId: string;
    /** Key algorithm */
    readonly keyAlgorithm: string;
  };
  /** ISO 8601 generation timestamp */
  readonly generatedAt: string;
  /** Overall artifact signature */
  readonly signature: string;
  /** Learner consent record */
  readonly consent: {
    /** ISO 8601 consent timestamp */
    readonly consentedAt: string;
    /** Consent scope */
    readonly scope: readonly string[];
    /** Consent signature from learner */
    readonly learnerSignature: string;
  };
}

/** Badge verification request */
export interface BadgeVerificationRequest {
  /** Badge ID to verify */
  readonly badgeId: BadgeId;
  /** Signature to verify */
  readonly signature: string;
  /** Requesting employer identifier */
  readonly requesterId: string;
}

/** Badge verification response */
export interface BadgeVerificationResponse {
  /** Whether badge is valid */
  readonly valid: boolean;
  /** Verification status */
  readonly status: 'verified' | 'invalid_signature' | 'revoked' | 'expired' | 'not_found';
  /** Badge metadata if valid */
  readonly badge?: Badge;
  /** Verification timestamp */
  readonly verifiedAt: string;
  /** Verification signature */
  readonly verificationSignature: string;
}
