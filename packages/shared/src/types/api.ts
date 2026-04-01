/**
 * API Types (TS-ARCH-003)
 *
 * Types for MCP server endpoints, request/response contracts,
 * and error handling.
 */

import type { LearnerId, LearnerState, CalibrationResult, LearnerEvent } from './learner.js';
import type { ContentPackId, TeachingBlockId, BadgeId } from './content.js';
import type { PolicyEvaluationInput, PolicyEvaluationOutput } from './policy.js';
import type { DeviceProfile } from './device.js';
import type { Badge, EmployerArtifact } from './badge.js';
import type { BenchmarkId, BenchmarkAttempt, MicroBenchmark } from './benchmark.js';

/** API version */
export type ApiVersion = 'v1';

/** Request identifier */
export type RequestId = `req-${string}`;

/** Standard API response wrapper */
export interface ApiResponse<T> {
  /** Whether request succeeded */
  readonly success: boolean;
  /** Response data (if success) */
  readonly data?: T;
  /** Error information (if failure) */
  readonly error?: ApiError;
  /** Request metadata */
  readonly meta: {
    readonly requestId: RequestId;
    readonly apiVersion: ApiVersion;
    readonly timestamp: string;
    readonly processingTimeMs: number;
  };
}

/** API error */
export interface ApiError {
  /** Error code */
  readonly code: string;
  /** Human-readable message */
  readonly message: string;
  /** Field-level errors (for validation) */
  readonly fieldErrors?: readonly {
    readonly field: string;
    readonly message: string;
  }[];
  /** Retry information */
  readonly retry?: {
    readonly retryable: boolean;
    readonly retryAfterMs?: number;
  };
}

/** Pagination parameters */
export interface PaginationParams {
  /** Page number (1-indexed) */
  readonly page: number;
  /** Items per page */
  readonly limit: number;
}

/** Paginated response */
export interface PaginatedResponse<T> {
  /** Items on current page */
  readonly items: readonly T[];
  /** Pagination metadata */
  readonly pagination: {
    readonly currentPage: number;
    readonly totalPages: number;
    readonly totalItems: number;
    readonly itemsPerPage: number;
    readonly hasNextPage: boolean;
    readonly hasPreviousPage: boolean;
  };
}

// === Calibration Endpoints ===

/** Calibration probe request */
export interface CalibrationRequest {
  /** Learner identifier */
  readonly learnerId: LearnerId;
  /** Device profile from capability probe */
  readonly deviceProfile: DeviceProfile;
  /** Target skill domain (optional) */
  readonly targetDomain?: string;
}

/** Calibration probe response */
export interface CalibrationResponse {
  /** Probe task to administer */
  readonly probeTask: {
    readonly taskId: string;
    readonly prompt: string;
    readonly canonicalSolution: string;
    readonly timeLimitSeconds: number;
  };
  /** Expected signals to collect */
  readonly signalsToCollect: readonly string[];
}

/** Calibration result submission */
export interface CalibrationResultSubmission {
  /** Learner identifier */
  readonly learnerId: LearnerId;
  /** Calibration result data */
  readonly result: CalibrationResult;
}

// === Content Endpoints ===

/** Get next task request */
export interface GetNextTaskRequest {
  /** Learner identifier */
  readonly learnerId: LearnerId;
  /** Current skill domain */
  readonly domain: string;
  /** Device profile */
  readonly deviceProfile: DeviceProfile;
}

/** Get next task response */
export interface GetNextTaskResponse {
  /** Teaching block to present */
  readonly teachingBlock: {
    readonly id: TeachingBlockId;
    readonly concept: string;
    readonly mode: string;
    readonly canonicalSolution: string;
    readonly explanation: string;
    readonly timeBudgetSeconds: number;
    readonly hints: readonly string[];
  };
  /** Content pack metadata */
  readonly contentPack: {
    readonly id: ContentPackId;
    readonly version: string;
  };
  /** Offline cache instructions */
  readonly cacheInstructions?: {
    readonly preloadBlocks: readonly TeachingBlockId[];
    readonly cacheStrategy: string;
  };
}

/** Task completion submission */
export interface TaskCompletionRequest {
  /** Learner identifier */
  readonly learnerId: LearnerId;
  /** Teaching block completed */
  readonly blockId: TeachingBlockId;
  /** Completion data */
  readonly completion: {
    readonly answer: string;
    readonly timeMs: number;
    readonly retryCount: number;
    readonly hintsUsed: number;
    readonly explanation?: string;
  };
  /** Events collected during task */
  readonly events: readonly LearnerEvent[];
  /** Client nonce for replay protection */
  readonly nonce: string;
}

// === Policy Evaluation Endpoints ===

/** Evaluate promotion request */
export interface EvaluatePromotionRequest {
  /** Policy evaluation input */
  readonly input: PolicyEvaluationInput;
}

/** Evaluate promotion response */
export interface EvaluatePromotionResponse {
  /** Policy evaluation output */
  readonly output: PolicyEvaluationOutput;
  /** Next recommended task (if any) */
  readonly nextTask?: GetNextTaskResponse;
}

// === Benchmark Endpoints ===

/** Start benchmark request */
export interface StartBenchmarkRequest {
  /** Learner identifier */
  readonly learnerId: LearnerId;
  /** Benchmark identifier */
  readonly benchmarkId: BenchmarkId;
  /** Use specific variant */
  readonly variantId?: string;
}

/** Start benchmark response */
export interface StartBenchmarkResponse {
  /** Attempt record */
  readonly attempt: BenchmarkAttempt;
  /** Benchmark details */
  readonly benchmark: MicroBenchmark;
}

/** Submit benchmark response request */
export interface SubmitBenchmarkRequest {
  /** Attempt identifier */
  readonly attemptId: string;
  /** Response data */
  readonly response: {
    readonly answer: string;
    readonly explanation?: string;
    readonly steps: readonly {
      readonly sequence: number;
      readonly content: string;
      readonly relativeTimeMs: number;
    }[];
  };
  /** Client nonce */
  readonly nonce: string;
}

// === Badge Endpoints ===

/** Issue badge request */
export interface IssueBadgeRequest {
  /** Learner identifier */
  readonly learnerId: LearnerId;
  /** Badge type to issue */
  readonly badgeType: string;
  /** Evidence IDs */
  readonly evidenceIds: readonly string[];
}

/** Issue badge response */
export interface IssueBadgeResponse {
  /** Issued badge */
  readonly badge: Badge;
}

/** Generate employer artifact request */
export interface GenerateArtifactRequest {
  /** Badge identifier */
  readonly badgeId: BadgeId;
  /** Learner consent token */
  readonly consentToken: string;
  /** Employer identifier */
  readonly employerId: string;
}

/** Generate employer artifact response */
export interface GenerateArtifactResponse {
  /** Generated artifact */
  readonly artifact: EmployerArtifact;
  /** Download URL (time-limited) */
  readonly downloadUrl: string;
  /** URL expiration timestamp */
  readonly expiresAt: string;
}

/** Verify badge request */
export interface VerifyBadgeRequest {
  /** Badge identifier */
  readonly badgeId: BadgeId;
  /** Signature to verify */
  readonly signature: string;
  /** Requester identity */
  readonly requesterId: string;
}

// === Learner State Endpoints ===

/** Get learner state response */
export interface GetLearnerStateResponse {
  /** Current learner state */
  readonly state: LearnerState;
  /** Recommended actions */
  readonly recommendations: readonly {
    readonly type: string;
    readonly priority: number;
    readonly description: string;
  }[];
}

// === Offline Sync Endpoints ===

/** Sync offline events request */
export interface SyncOfflineEventsRequest {
  /** Learner identifier */
  readonly learnerId: LearnerId;
  /** Buffered events */
  readonly events: readonly LearnerEvent[];
  /** Client timestamp for drift detection */
  readonly clientTimestamp: string;
}

/** Sync offline events response */
export interface SyncOfflineEventsResponse {
  /** Events accepted */
  readonly acceptedCount: number;
  /** Events rejected (duplicates, invalid) */
  readonly rejectedCount: number;
  /** Rejected event IDs with reasons */
  readonly rejections: readonly {
    readonly eventId: string;
    readonly reason: string;
  }[];
  /** Server-side state updates to apply */
  readonly stateUpdates?: Partial<LearnerState>;
}
