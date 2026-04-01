/**
 * Audit and Security Types (TS-SEC-009)
 *
 * Types for audit trails, event logging, security controls,
 * and incident tracking.
 */

import type { ContentPackId } from './content.js';
import type { LearnerId } from './learner.js';

/** Audit event identifier */
export type AuditEventId = `audit-${string}`;

/** Incident identifier */
export type IncidentId = `incident-${string}`;

/** Severity level */
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/** Audit event category */
export type AuditCategory =
  | 'authentication'
  | 'authorization'
  | 'content'
  | 'policy'
  | 'promotion'
  | 'badge'
  | 'integrity'
  | 'system';

/** Audit event (append-only log entry) */
export interface AuditEvent {
  /** Unique event identifier */
  readonly id: AuditEventId;
  /** Event category */
  readonly category: AuditCategory;
  /** Event action */
  readonly action: string;
  /** Actor (learner, system, admin) */
  readonly actor: {
    readonly type: 'learner' | 'system' | 'admin' | 'employer';
    readonly id: string;
  };
  /** Target of the action */
  readonly target?: {
    readonly type: string;
    readonly id: string;
  };
  /** ISO 8601 timestamp */
  readonly timestamp: string;
  /** Event-specific data (PII redacted) */
  readonly data: Record<string, unknown>;
  /** Server node that recorded event */
  readonly nodeId: string;
  /** Request correlation ID */
  readonly correlationId: string;
  /** Client IP (hashed for privacy) */
  readonly clientIpHash: string;
  /** Cryptographic signature */
  readonly signature: string;
  /** Previous event hash (chain integrity) */
  readonly previousEventHash: string;
}

/** Integrity check result */
export interface IntegrityCheckResult {
  /** Check identifier */
  readonly checkId: string;
  /** Type of integrity check */
  readonly checkType:
    | 'content_signature'
    | 'policy_signature'
    | 'event_chain'
    | 'parity'
    | 'revocation';
  /** Whether check passed */
  readonly passed: boolean;
  /** Failure details if applicable */
  readonly failureDetails?: string;
  /** ISO 8601 check timestamp */
  readonly checkedAt: string;
  /** Affected resource */
  readonly resource: {
    readonly type: string;
    readonly id: string;
  };
}

/** Security incident record */
export interface SecurityIncident {
  /** Unique incident identifier */
  readonly id: IncidentId;
  /** Incident severity */
  readonly severity: Severity;
  /** Incident type */
  readonly type:
    | 'signature_failure'
    | 'replay_attack'
    | 'rate_limit_exceeded'
    | 'parity_failure'
    | 'anomalous_behavior'
    | 'unauthorized_access'
    | 'content_tampering';
  /** ISO 8601 detection timestamp */
  readonly detectedAt: string;
  /** Incident description */
  readonly description: string;
  /** Affected entities */
  readonly affected: readonly {
    readonly type: string;
    readonly id: string;
  }[];
  /** Automatic remediation taken */
  readonly autoRemediation?: {
    readonly action: string;
    readonly status: 'success' | 'failed' | 'pending';
    readonly timestamp: string;
  };
  /** Manual investigation required */
  readonly requiresInvestigation: boolean;
  /** Resolution status */
  readonly status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  /** Resolution details */
  readonly resolution?: {
    readonly resolvedAt: string;
    readonly resolvedBy: string;
    readonly notes: string;
  };
}

/** Content quarantine record */
export interface ContentQuarantine {
  /** Content pack ID */
  readonly contentPackId: ContentPackId;
  /** Reason for quarantine */
  readonly reason: string;
  /** Severity */
  readonly severity: Severity;
  /** ISO 8601 quarantine timestamp */
  readonly quarantinedAt: string;
  /** Related incident */
  readonly incidentId?: IncidentId;
  /** Review status */
  readonly reviewStatus: 'pending' | 'approved' | 'rejected';
  /** Reviewer if applicable */
  readonly reviewer?: string;
}

/** Anti-cheat detection result */
export interface AntiCheatResult {
  /** Detection identifier */
  readonly detectionId: string;
  /** Learner under evaluation */
  readonly learnerId: LearnerId;
  /** Assessment session */
  readonly sessionId: string;
  /** Detection type */
  readonly detectionType:
    | 'timing_anomaly'
    | 'paste_detection'
    | 'behavioral_anomaly'
    | 'response_similarity'
    | 'tool_usage';
  /** Confidence in detection [0, 1] */
  readonly confidence: number;
  /** Whether flagged for review */
  readonly flagged: boolean;
  /** Detection details */
  readonly details: Record<string, unknown>;
  /** ISO 8601 detection timestamp */
  readonly detectedAt: string;
}

/** Proctoring session record */
export interface ProctoringSession {
  /** Session identifier */
  readonly sessionId: string;
  /** Learner being proctored */
  readonly learnerId: LearnerId;
  /** Assessment being proctored */
  readonly assessmentId: string;
  /** Proctoring type */
  readonly proctoringType: 'automated' | 'live' | 'hybrid';
  /** Session status */
  readonly status: 'scheduled' | 'in_progress' | 'completed' | 'terminated';
  /** ISO 8601 start timestamp */
  readonly startedAt: string;
  /** ISO 8601 end timestamp */
  readonly endedAt?: string;
  /** Integrity events during session */
  readonly integrityEvents: readonly {
    readonly type: string;
    readonly timestamp: string;
    readonly data: Record<string, unknown>;
  }[];
  /** Final integrity score [0, 1] */
  readonly integrityScore?: number;
  /** Proctor notes (if live/hybrid) */
  readonly proctorNotes?: string;
}

/** Rate limit configuration */
export interface RateLimitConfig {
  /** Resource being rate limited */
  readonly resource: string;
  /** Maximum requests per window */
  readonly maxRequests: number;
  /** Window size in seconds */
  readonly windowSeconds: number;
  /** Action when limit exceeded */
  readonly action: 'block' | 'throttle' | 'flag';
}

/** System health check result */
export interface HealthCheckResult {
  /** Check identifier */
  readonly checkId: string;
  /** Component being checked */
  readonly component: string;
  /** Health status */
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  /** Latency in milliseconds */
  readonly latencyMs: number;
  /** Additional metrics */
  readonly metrics: Record<string, number>;
  /** ISO 8601 check timestamp */
  readonly checkedAt: string;
}
