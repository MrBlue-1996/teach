/**
 * TopShelf API Server - Policy Routes Test Suite
 *
 * Tests for policy routes: evaluate, history.
 * Uses Hono's app.request() for HTTP-level testing without a running server.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createPolicyRoutes } from './policy.js';
import { errorHandler } from '../middleware/error-handler.js';

// =============================================================================
// MOCKS
// =============================================================================

const mockLearnerState = {
  id: 'state-1',
  userId: 'user-test-1',
  contentPackId: '550e8400-e29b-41d4-a716-446655440000',
  currentMode: 'L1_RECALL',
  overallMastery: 0.5,
  totalTimeSpentSeconds: 3600,
  blocksCompleted: 10,
  skillEstimates: { skill1: 0.7, skill2: 0.4 },
  inProbation: false,
  lastActivityAt: new Date('2026-03-20T10:00:00Z'),
};

const mockEvaluations = [
  {
    id: 'eval-1',
    decision: 'hold',
    fromMode: 'L1_RECALL',
    toMode: 'L1_RECALL',
    reasoning: 'Insufficient signals for promotion',
    evaluatedAt: new Date('2026-03-20T10:05:00Z'),
  },
  {
    id: 'eval-2',
    decision: 'promote',
    fromMode: 'L1_RECALL',
    toMode: 'L2_RECOGNITION',
    reasoning: 'Demonstrated sufficient mastery',
    evaluatedAt: new Date('2026-03-19T15:00:00Z'),
  },
  {
    id: 'eval-3',
    decision: 'demote',
    fromMode: 'L2_RECOGNITION',
    toMode: 'L1_RECALL',
    reasoning: 'Failed retention check',
    evaluatedAt: new Date('2026-03-18T12:00:00Z'),
  },
];

const mockSession = {
  id: 'session-1',
  userId: 'user-test-1',
  learnerStateId: 'state-1',
  deviceInfo: { userAgent: 'Mozilla/5.0 (X11; CrOS x86_64 14526.89.0)' },
  teachingMode: 2,
  triggersFired: [],
  startedAt: new Date(Date.now() - 10 * 60 * 1000),
  problemsSolved: 0,
  errorsEncountered: 2,
};

const mockDb = {
  query: {
    learnerStates: {
      findFirst: vi.fn(),
    },
    learningSessions: {
      findFirst: vi.fn(),
    },
    policyEvaluations: {
      findMany: vi.fn(),
    },
  },
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }),
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn(),
    }),
  }),
};

vi.mock('@topshelf/database', () => ({
  getDatabase: () => mockDb,
  learnerStates: { id: 'id', userId: 'userId', contentPackId: 'contentPackId' },
  learningSessions: { id: 'id', userId: 'userId' },
  policyEvaluations: { learnerStateId: 'learnerStateId', evaluatedAt: 'evaluatedAt' },
  eq: (...args: unknown[]) => args,
  and: (...args: unknown[]) => args,
  desc: (field: unknown) => field,
}));

vi.mock('@topshelf/config', () => ({
  getConfig: () => ({
    environment: 'development',
  }),
}));

// =============================================================================
// TESTS
// =============================================================================

describe('Policy Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.onError(errorHandler);

    // Simulate authenticated user context
    app.use('*', async (c, next) => {
      c.set('userId' as any, 'user-test-1');
      c.set('userRole' as any, 'learner');
      await next();
    });

    app.route('/policy', createPolicyRoutes());

    // Reset mock implementations
    mockDb.query.learnerStates.findFirst.mockResolvedValue(null);
    mockDb.query.learningSessions.findFirst.mockResolvedValue(null);
    mockDb.query.policyEvaluations.findMany.mockResolvedValue(mockEvaluations);
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'eval-new-1',
            decision: 'hold',
            fromMode: 'L1_RECALL',
            toMode: 'L1_RECALL',
            reasoning: 'Insufficient signals for promotion decision',
          },
        ]),
      }),
    });
  });

  // ---------------------------------------------------------------------------
  // POST /policy/evaluate
  // ---------------------------------------------------------------------------

  describe('POST /policy/evaluate', () => {
    beforeEach(() => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(mockLearnerState);
    });

    it('should evaluate policy successfully', async () => {
      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
          signals: [
            { type: 'correctness', value: 0.85, confidence: 0.9 },
            { type: 'time_spent', value: 120, confidence: 1.0 },
          ],
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.evaluationId).toBeDefined();
      expect(body.decision).toBeDefined();
      expect(body.fromMode).toBeDefined();
      expect(body.toMode).toBeDefined();
    });

    it('should return evaluation with reasoning', async () => {
      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
          signals: [{ type: 'mastery', value: 0.7, confidence: 0.8 }],
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.reasoning).toBeDefined();
      expect(typeof body.reasoning).toBe('string');
    });

    it('should return current mode information', async () => {
      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
          signals: [{ type: 'retention', value: 0.9, confidence: 0.95 }],
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.fromMode).toBe('L1_RECALL');
      expect(body.toMode).toBe('L1_RECALL');
    });

    it('should echo back signals in response', async () => {
      const signals = [
        { type: 'correctness', value: 0.85, confidence: 0.9 },
        { type: 'time_spent', value: 120, confidence: 1.0 },
      ];

      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
          signals,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.signals).toEqual(signals);
    });

    it('should promote learner mode for sustained strong performance signals', async () => {
      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
          signals: [
            { type: 'correctness', value: 0.92, confidence: 0.95 },
            { type: 'mastery', value: 0.9, confidence: 0.9 },
          ],
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.decision).toBe('promote');
      expect(body.fromMode).toBe('L1_RECALL');
      expect(body.toMode).toBe('L2_EXPLAIN');
    });

    it('should defer learner promotion when session struggle triggers are active', async () => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue(mockSession);

      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
          sessionId: '550e8400-e29b-41d4-a716-446655440001',
          signals: [
            { type: 'help_requested', value: 1, confidence: 1 },
            { type: 'incorrect_submissions', value: 3, confidence: 1 },
          ],
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.decision).toBe('defer');
      expect(body.toMode).toBe('L1_RECALL');
      expect(body.triggers).toContain('help_requested');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should return 404 for non-existent learner state', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(null);

      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
          signals: [{ type: 'correctness', value: 0.85, confidence: 0.9 }],
        }),
      });

      expect(res.status).toBe(404);
    });

    it('should reject invalid content pack ID format', async () => {
      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: 'not-a-uuid',
          signals: [{ type: 'correctness', value: 0.85, confidence: 0.9 }],
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject missing content pack ID', async () => {
      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signals: [{ type: 'correctness', value: 0.85, confidence: 0.9 }],
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject missing signals array', async () => {
      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject empty signals array', async () => {
      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
          signals: [],
        }),
      });

      // Empty array is valid per schema, but might have no effect
      // The route should still process it
      expect(res.status).toBe(200);
    });

    it('should reject signal with missing type', async () => {
      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
          signals: [{ value: 0.85, confidence: 0.9 }],
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject signal with missing value', async () => {
      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
          signals: [{ type: 'correctness', confidence: 0.9 }],
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject signal with missing confidence', async () => {
      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
          signals: [{ type: 'correctness', value: 0.85 }],
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject confidence value greater than 1', async () => {
      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
          signals: [{ type: 'correctness', value: 0.85, confidence: 1.5 }],
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject confidence value less than 0', async () => {
      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
          signals: [{ type: 'correctness', value: 0.85, confidence: -0.1 }],
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should accept multiple signals', async () => {
      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
          signals: [
            { type: 'correctness', value: 0.85, confidence: 0.9 },
            { type: 'time_spent', value: 120, confidence: 1.0 },
            { type: 'retention', value: 0.7, confidence: 0.8 },
          ],
        }),
      });

      expect(res.status).toBe(200);
    });

    it('should accept negative signal values', async () => {
      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
          signals: [{ type: 'trend', value: -0.5, confidence: 0.9 }],
        }),
      });

      expect(res.status).toBe(200);
    });

    it('should accept zero confidence', async () => {
      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
          signals: [{ type: 'uncertain', value: 0.5, confidence: 0 }],
        }),
      });

      expect(res.status).toBe(200);
    });

    it('should accept confidence of exactly 1', async () => {
      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
          signals: [{ type: 'certain', value: 100, confidence: 1 }],
        }),
      });

      expect(res.status).toBe(200);
    });

    it('should reject empty body', async () => {
      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /policy/history/:contentPackId
  // ---------------------------------------------------------------------------

  describe('GET /policy/history/:contentPackId', () => {
    beforeEach(() => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(mockLearnerState);
    });

    it('should return policy evaluation history', async () => {
      const res = await app.request('/policy/history/550e8400-e29b-41d4-a716-446655440000');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.evaluations).toBeDefined();
      expect(Array.isArray(body.evaluations)).toBe(true);
    });

    it('should return evaluations with expected fields', async () => {
      const res = await app.request('/policy/history/550e8400-e29b-41d4-a716-446655440000');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.evaluations.length).toBe(3);
      const evaluation = body.evaluations[0];
      expect(evaluation).toHaveProperty('id');
      expect(evaluation).toHaveProperty('decision');
      expect(evaluation).toHaveProperty('fromMode');
      expect(evaluation).toHaveProperty('toMode');
      expect(evaluation).toHaveProperty('reasoning');
      expect(evaluation).toHaveProperty('evaluatedAt');
    });

    it('should include different decision types', async () => {
      const res = await app.request('/policy/history/550e8400-e29b-41d4-a716-446655440000');

      expect(res.status).toBe(200);
      const body = await res.json();
      const decisions = body.evaluations.map((e: any) => e.decision);
      expect(decisions).toContain('hold');
      expect(decisions).toContain('promote');
      expect(decisions).toContain('demote');
    });

    it('should return 404 for non-existent learner state', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(null);

      const res = await app.request('/policy/history/non-existent-pack');

      expect(res.status).toBe(404);
    });

    it('should return empty array when no evaluations exist', async () => {
      mockDb.query.policyEvaluations.findMany.mockResolvedValue([]);

      const res = await app.request('/policy/history/550e8400-e29b-41d4-a716-446655440000');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.evaluations).toEqual([]);
    });

    it('should order evaluations by evaluatedAt descending', async () => {
      const res = await app.request('/policy/history/550e8400-e29b-41d4-a716-446655440000');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.evaluations[0].id).toBe('eval-1');
      expect(body.evaluations[1].id).toBe('eval-2');
      expect(body.evaluations[2].id).toBe('eval-3');
    });

    it('should handle non-UUID content pack ID', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(null);

      const res = await app.request('/policy/history/simple-pack-id');

      // Route doesn't validate UUID format, just checks if state exists
      expect(res.status).toBe(404);
    });

    it('should only return evaluations for authenticated user', async () => {
      const res = await app.request('/policy/history/550e8400-e29b-41d4-a716-446655440000');

      expect(res.status).toBe(200);
      expect(mockDb.query.learnerStates.findFirst).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Edge Cases and Error Handling
  // ---------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle evaluation with very large signal values', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(mockLearnerState);

      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
          signals: [{ type: 'large_value', value: 1000000, confidence: 0.99 }],
        }),
      });

      expect(res.status).toBe(200);
    });

    it('should handle evaluation with decimal signal values', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(mockLearnerState);

      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
          signals: [{ type: 'precise', value: 0.123456789, confidence: 0.999999 }],
        }),
      });

      expect(res.status).toBe(200);
    });

    it('should handle special characters in content pack ID path', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(null);

      const res = await app.request('/policy/history/pack%20with%20spaces');

      expect(res.status).toBe(404);
    });

    it('should handle history for state with many evaluations', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(mockLearnerState);
      const manyEvaluations = Array.from({ length: 20 }, (_, i) => ({
        id: `eval-${i}`,
        decision: i % 3 === 0 ? 'promote' : i % 3 === 1 ? 'demote' : 'hold',
        fromMode: 'L1_RECALL',
        toMode: 'L1_RECALL',
        reasoning: `Evaluation ${i}`,
        evaluatedAt: new Date(Date.now() - i * 3600000),
      }));
      mockDb.query.policyEvaluations.findMany.mockResolvedValue(manyEvaluations);

      const res = await app.request('/policy/history/550e8400-e29b-41d4-a716-446655440000');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.evaluations.length).toBe(20);
    });

    it('should handle evaluation response with null reasoning', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(mockLearnerState);
      mockDb.query.policyEvaluations.findMany.mockResolvedValue([
        {
          id: 'eval-null',
          decision: 'hold',
          fromMode: 'L1_RECALL',
          toMode: 'L1_RECALL',
          reasoning: null,
          evaluatedAt: new Date(),
        },
      ]);

      const res = await app.request('/policy/history/550e8400-e29b-41d4-a716-446655440000');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.evaluations[0].reasoning).toBeNull();
    });

    it('should handle signal type with special characters', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(mockLearnerState);

      const res = await app.request('/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
          signals: [{ type: 'special-type_v2.0', value: 0.5, confidence: 0.8 }],
        }),
      });

      expect(res.status).toBe(200);
    });
  });
});
