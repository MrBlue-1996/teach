/**
 * TopShelf Teaching - Shared Constants
 *
 * Platform-wide constants, thresholds, and configuration values.
 */

// === Learning Mode Constants ===

/** Learning mode progression order */
export const LEARNING_MODE_ORDER = ['L4', 'L3', 'L2', 'L1', 'L0'] as const;

/** Mode descriptions */
export const LEARNING_MODE_DESCRIPTIONS = {
  L0: 'Canonical Solution - Full scaffolding with complete solution shown',
  L1: 'Guided Practice - Solution with guided explanations',
  L2: 'Supported Practice - Hints available on demand',
  L3: 'Independent Practice - Minimal hints, more challenge',
  L4: 'Assessment Mode - No scaffolding, full evaluation',
} as const;

// === Performance Budgets (TS-DEVICE-007) ===

export const PERFORMANCE_BUDGETS = {
  baseline: {
    ttfi: 1500, // 1.5s on 3G
    lcp: 2500,
    fid: 100,
    cls: 0.1,
    tbt: 300,
  },
  enhanced: {
    ttfi: 1000,
    lcp: 2000,
    fid: 75,
    cls: 0.05,
    tbt: 200,
  },
  full: {
    ttfi: 500,
    lcp: 1000,
    fid: 50,
    cls: 0.025,
    tbt: 100,
  },
} as const;

// === Device Tier Thresholds ===

export const DEVICE_TIER_THRESHOLDS = {
  baseline: {
    minRamMb: 1024,
    minCores: 2,
    maxNetworkRtt: 500,
  },
  enhanced: {
    minRamMb: 4096,
    minCores: 4,
    maxNetworkRtt: 100,
    requiresWasm: true,
  },
  full: {
    minRamMb: 8192,
    minCores: 8,
    maxNetworkRtt: 50,
    requiresWasm: true,
    requiresWebGPU: true,
  },
} as const;

// === Caching Configuration ===

export const CACHE_CONFIGS = {
  ui: {
    strategy: 'stale-while-revalidate',
    maxAgeSeconds: 86400, // 1 day
    maxEntries: 100,
  },
  contentPack: {
    strategy: 'cache-first',
    maxAgeSeconds: 604800, // 7 days
    maxEntries: 50,
  },
  eventBuffer: {
    strategy: 'network-first',
    maxAgeSeconds: 3600, // 1 hour
    maxEntries: 1000,
  },
  learnerState: {
    strategy: 'network-first',
    maxAgeSeconds: 300, // 5 minutes
    maxEntries: 10,
  },
  staticAsset: {
    strategy: 'cache-first',
    maxAgeSeconds: 2592000, // 30 days
    maxEntries: 500,
  },
} as const;

// === Policy Defaults (TS-POLICY-005) ===

export const DEFAULT_MULTI_SIGNAL_CONFIG = {
  requiredSignals: ['benchmark_passes', 'transfer_score', 'time_efficiency', 'retention'] as const,
  windowMinutes: 1440, // 24 hours
  consecutivePasses: 3,
  transferThreshold: 0.75,
  timePercentileThreshold: 0.6,
  probationTasks: 3,
  rollbackOnFailureRate: 0.4,
} as const;

export const DEFAULT_MASTERY_WEIGHTS = {
  transfer: 0.25,
  robustness: 0.15,
  retention: 0.2,
  benchmarkPasses: 0.15,
  timeEfficiency: 0.15,
  explainability: 0.1,
} as const;

// === Retention Probe Intervals ===

export const RETENTION_PROBE_DAYS = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
} as const;

export const RETENTION_ACCEPTABLE_DECAY = {
  '24h': 0.95, // Expect 95% retention
  '7d': 0.85,
  '30d': 0.75,
} as const;

// === Calibration Probe ===

export const CALIBRATION_CONFIG = {
  timeLimitSeconds: 120, // 2 minutes
  minConfidenceForMode: 0.7,
  defaultMode: 'L2',
} as const;

// === Anti-Cheat Thresholds (TS-INTEGRITY-012) ===

export const ANTI_CHEAT_THRESHOLDS = {
  timingAnomaly: {
    minExpectedMs: 5000, // Too fast is suspicious
    maxTypingSpeed: 150, // WPM
  },
  pasteDetection: {
    maxPastePercentage: 0.5,
  },
  behavioralAnomaly: {
    minActionsBetweenSubmits: 3,
  },
  responseSimilarity: {
    maxSimilarityWithKnownAnswers: 0.95,
  },
} as const;

// === Rate Limits ===

export const RATE_LIMITS = {
  apiRequests: {
    maxRequests: 100,
    windowSeconds: 60,
  },
  taskSubmissions: {
    maxRequests: 30,
    windowSeconds: 60,
  },
  benchmarkAttempts: {
    maxRequests: 10,
    windowSeconds: 300,
  },
  badgeVerification: {
    maxRequests: 50,
    windowSeconds: 60,
  },
} as const;

// === Content Pack Constraints ===

export const CONTENT_PACK_CONSTRAINTS = {
  maxBlocksPerPack: 100,
  maxPackSizeMb: 50,
  minSurfaceVariants: 2,
  maxHintsPerBlock: 10,
  signatureAlgorithm: 'ECDSA-P256-SHA256',
} as const;

// === Error Codes ===

export const ERROR_CODES = {
  // Validation errors (1xxx)
  INVALID_INPUT: 'ERR_1001',
  SCHEMA_VALIDATION_FAILED: 'ERR_1002',
  MISSING_REQUIRED_FIELD: 'ERR_1003',
  INVALID_SIGNATURE: 'ERR_1004',

  // Authentication/Authorization (2xxx)
  UNAUTHORIZED: 'ERR_2001',
  FORBIDDEN: 'ERR_2002',
  INVALID_TOKEN: 'ERR_2003',
  SESSION_EXPIRED: 'ERR_2004',

  // Content errors (3xxx)
  CONTENT_PACK_NOT_FOUND: 'ERR_3001',
  CONTENT_PACK_REVOKED: 'ERR_3002',
  PARITY_TEST_FAILED: 'ERR_3003',
  CONTENT_QUARANTINED: 'ERR_3004',

  // Policy errors (4xxx)
  POLICY_EVALUATION_FAILED: 'ERR_4001',
  INSUFFICIENT_SIGNALS: 'ERR_4002',
  PROBATION_VIOLATION: 'ERR_4003',

  // System errors (5xxx)
  INTERNAL_ERROR: 'ERR_5001',
  SERVICE_UNAVAILABLE: 'ERR_5002',
  RATE_LIMIT_EXCEEDED: 'ERR_5003',
  TIMEOUT: 'ERR_5004',

  // Integrity errors (6xxx)
  REPLAY_ATTACK_DETECTED: 'ERR_6001',
  TAMPERING_DETECTED: 'ERR_6002',
  CHAIN_INTEGRITY_FAILED: 'ERR_6003',
} as const;

// === Schema Version ===

export const CURRENT_SCHEMA_VERSION = '1.0.0' as const;

// === API Configuration ===

export const API_CONFIG = {
  version: 'v1',
  maxRequestBodySize: 1048576, // 1MB
  requestTimeoutMs: 30000,
  maxRetries: 3,
  retryDelayMs: 1000,
} as const;
