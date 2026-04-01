/**
 * TopShelf Learner Schema - Test Suite
 *
 * Tests for learner-related schema validation.
 */

import { describe, it, expect } from 'vitest';
import {
  learnerIdSchema,
  learningModeSchema,
  skillEstimateSchema,
  timeEfficiencySchema,
  retentionRecordSchema,
  promotionRecordSchema,
  masteryScoreSchema,
  learnerEventSchema,
  calibrationResultSchema,
} from './learner.schema.js';

// =============================================================================
// LEARNER ID
// =============================================================================

describe('learnerIdSchema', () => {
  it('should accept valid learner IDs', () => {
    expect(learnerIdSchema.safeParse('u-abc123').success).toBe(true);
    expect(learnerIdSchema.safeParse('u-test_user-1').success).toBe(true);
  });

  it('should reject IDs without u- prefix', () => {
    expect(learnerIdSchema.safeParse('user-123').success).toBe(false);
    expect(learnerIdSchema.safeParse('').success).toBe(false);
  });
});

// =============================================================================
// LEARNING MODE
// =============================================================================

describe('learningModeSchema', () => {
  it('should accept all valid modes', () => {
    expect(learningModeSchema.safeParse('L0').success).toBe(true);
    expect(learningModeSchema.safeParse('L1').success).toBe(true);
    expect(learningModeSchema.safeParse('L2').success).toBe(true);
    expect(learningModeSchema.safeParse('L3').success).toBe(true);
    expect(learningModeSchema.safeParse('L4').success).toBe(true);
  });

  it('should reject invalid modes', () => {
    expect(learningModeSchema.safeParse('L5').success).toBe(false);
    expect(learningModeSchema.safeParse('').success).toBe(false);
    expect(learningModeSchema.safeParse('beginner').success).toBe(false);
  });
});

// =============================================================================
// SKILL ESTIMATE
// =============================================================================

describe('skillEstimateSchema', () => {
  it('should accept a valid skill estimate', () => {
    const estimate = {
      score: 0.75,
      confidence: 0.9,
      lastUpdated: '2026-03-01T00:00:00Z',
      observationCount: 10,
    };
    expect(skillEstimateSchema.safeParse(estimate).success).toBe(true);
  });

  it('should reject score above 1', () => {
    const estimate = {
      score: 1.5,
      confidence: 0.9,
      lastUpdated: '2026-03-01T00:00:00Z',
      observationCount: 10,
    };
    expect(skillEstimateSchema.safeParse(estimate).success).toBe(false);
  });

  it('should reject negative observation count', () => {
    const estimate = {
      score: 0.5,
      confidence: 0.5,
      lastUpdated: '2026-03-01T00:00:00Z',
      observationCount: -1,
    };
    expect(skillEstimateSchema.safeParse(estimate).success).toBe(false);
  });
});

// =============================================================================
// TIME EFFICIENCY
// =============================================================================

describe('timeEfficiencySchema', () => {
  it('should accept valid time efficiency', () => {
    const efficiency = { medianMs: 5000, cohortPercentile: 0.75, sampleSize: 20 };
    expect(timeEfficiencySchema.safeParse(efficiency).success).toBe(true);
  });

  it('should reject percentile above 1', () => {
    const efficiency = { medianMs: 5000, cohortPercentile: 1.5, sampleSize: 20 };
    expect(timeEfficiencySchema.safeParse(efficiency).success).toBe(false);
  });
});

// =============================================================================
// RETENTION RECORD
// =============================================================================

describe('retentionRecordSchema', () => {
  it('should accept a valid retention record', () => {
    const record = {
      taskId: 'task-001',
      date: '2026-03-01T00:00:00Z',
      pass: true,
      daysSinceOriginal: 7,
      latencyMs: 3000,
    };
    expect(retentionRecordSchema.safeParse(record).success).toBe(true);
  });

  it('should reject record with empty taskId', () => {
    const record = {
      taskId: '',
      date: '2026-03-01T00:00:00Z',
      pass: true,
      daysSinceOriginal: 7,
      latencyMs: 3000,
    };
    expect(retentionRecordSchema.safeParse(record).success).toBe(false);
  });
});

// =============================================================================
// PROMOTION RECORD
// =============================================================================

describe('promotionRecordSchema', () => {
  it('should accept a valid promotion record', () => {
    const record = {
      from: 'L1',
      to: 'L2',
      timestamp: '2026-03-01T00:00:00Z',
      domain: 'linux',
      evidenceIds: ['ev-001'],
      isRollback: false,
    };
    expect(promotionRecordSchema.safeParse(record).success).toBe(true);
  });

  it('should accept a rollback record', () => {
    const record = {
      from: 'L3',
      to: 'L2',
      timestamp: '2026-03-01T00:00:00Z',
      domain: 'networking',
      evidenceIds: [],
      isRollback: true,
    };
    expect(promotionRecordSchema.safeParse(record).success).toBe(true);
  });
});

// =============================================================================
// MASTERY SCORE
// =============================================================================

describe('masteryScoreSchema', () => {
  it('should accept a valid mastery score', () => {
    const score = {
      composite: 0.75,
      components: {
        transfer: 0.8,
        robustness: 0.7,
        retention: 0.9,
        benchmarkPasses: 0.6,
        timeEfficiency: 0.7,
        explainability: 0.5,
      },
      weights: {
        transfer: 0.25,
        robustness: 0.15,
        retention: 0.2,
        benchmarkPasses: 0.15,
        timeEfficiency: 0.15,
        explainability: 0.1,
      },
    };
    expect(masteryScoreSchema.safeParse(score).success).toBe(true);
  });

  it('should reject composite above 1', () => {
    const score = {
      composite: 1.5,
      components: {
        transfer: 0.8,
        robustness: 0.7,
        retention: 0.9,
        benchmarkPasses: 0.6,
        timeEfficiency: 0.7,
        explainability: 0.5,
      },
      weights: {
        transfer: 0.25,
        robustness: 0.15,
        retention: 0.2,
        benchmarkPasses: 0.15,
        timeEfficiency: 0.15,
        explainability: 0.1,
      },
    };
    expect(masteryScoreSchema.safeParse(score).success).toBe(false);
  });
});

// =============================================================================
// LEARNER EVENT
// =============================================================================

describe('learnerEventSchema', () => {
  it('should accept a valid learner event', () => {
    const event = {
      eventId: 'evt-001',
      learnerId: 'u-test123',
      eventType: 'task_completed',
      timestamp: '2026-03-01T00:00:00Z',
      payload: { score: 0.9 },
      nonce: 'a'.repeat(32),
    };
    expect(learnerEventSchema.safeParse(event).success).toBe(true);
  });

  it('should reject event with short nonce', () => {
    const event = {
      eventId: 'evt-001',
      learnerId: 'u-test123',
      eventType: 'task_completed',
      timestamp: '2026-03-01T00:00:00Z',
      payload: {},
      nonce: 'short', // must be at least 16
    };
    expect(learnerEventSchema.safeParse(event).success).toBe(false);
  });

  it('should reject invalid event type', () => {
    const event = {
      eventId: 'evt-001',
      learnerId: 'u-test123',
      eventType: 'invalid_event',
      timestamp: '2026-03-01T00:00:00Z',
      payload: {},
      nonce: 'a'.repeat(32),
    };
    expect(learnerEventSchema.safeParse(event).success).toBe(false);
  });
});

// =============================================================================
// CALIBRATION RESULT
// =============================================================================

describe('calibrationResultSchema', () => {
  it('should accept a valid calibration result', () => {
    const result = {
      completionTimeMs: 45000,
      firstAction: 'attempt_direct',
      retryCount: 1,
      pastedContent: false,
      recommendedMode: 'L2',
      confidence: 0.85,
    };
    expect(calibrationResultSchema.safeParse(result).success).toBe(true);
  });

  it('should reject invalid first action', () => {
    const result = {
      completionTimeMs: 45000,
      firstAction: 'random_action',
      retryCount: 1,
      pastedContent: false,
      recommendedMode: 'L2',
      confidence: 0.85,
    };
    expect(calibrationResultSchema.safeParse(result).success).toBe(false);
  });

  it('should reject confidence above 1', () => {
    const result = {
      completionTimeMs: 45000,
      firstAction: 'attempt_direct',
      retryCount: 0,
      pastedContent: false,
      recommendedMode: 'L2',
      confidence: 1.5,
    };
    expect(calibrationResultSchema.safeParse(result).success).toBe(false);
  });
});
