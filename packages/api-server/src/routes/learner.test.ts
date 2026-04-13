/**
 * TopShelf API Server - Learner Routes Test Suite
 *
 * Tests for learner routes: state, progress, session management, events.
 * Uses Hono's app.request() for HTTP-level testing without a running server.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createLearnerRoutes } from './learner.js';
import { errorHandler } from '../middleware/error-handler.js';

// =============================================================================
// MOCKS
// =============================================================================

const mockLearnerState = {
  id: 'state-1',
  userId: 'user-test-1',
  contentPackId: 'pack-1',
  currentMode: 'L1_RECALL',
  overallMastery: 0.5,
  totalTimeSpentSeconds: 3600,
  blocksCompleted: 10,
  currentBlockId: 'block-5',
  skillEstimates: { skill1: 0.7, skill2: 0.4 },
  inProbation: false,
  lastActivityAt: new Date('2026-03-20T10:00:00Z'),
  retentionHistory: [],
};

const mockLearnerStates = [
  {
    id: 'state-1',
    userId: 'user-test-1',
    contentPackId: 'pack-1',
    currentMode: 'L1_RECALL',
    overallMastery: 0.5,
    blocksCompleted: 10,
    lastActivityAt: new Date('2026-03-20T10:00:00Z'),
    contentPack: {
      id: 'pack-1',
      title: 'Linux Fundamentals',
      slug: 'linux-fundamentals',
      certificationTarget: 'CompTIA Linux+',
    },
  },
  {
    id: 'state-2',
    userId: 'user-test-1',
    contentPackId: 'pack-2',
    currentMode: 'L2_RECOGNITION',
    overallMastery: 0.75,
    blocksCompleted: 20,
    lastActivityAt: new Date('2026-03-19T15:00:00Z'),
    contentPack: {
      id: 'pack-2',
      title: 'AWS Cloud Practitioner',
      slug: 'aws-cloud-practitioner',
      certificationTarget: 'AWS Certified Cloud Practitioner',
    },
  },
];

const mockSession = {
  id: 'session-1',
  userId: 'user-test-1',
  learnerStateId: 'state-1',
  status: 'active',
  deviceInfo: { userAgent: 'Mozilla/5.0 (X11; CrOS x86_64 14526.89.0)' },
  teachingMode: 2,
  deviceProfile: 'chromebook_standard',
  errorsEncountered: 2,
  problemsSolved: 0,
  triggersFired: [],
  averageCorrectness: 0.5,
  blocksCompleted: 5,
  blocksAttempted: 6,
  startedAt: new Date('2026-03-20T10:00:00Z'),
  endedAt: null,
};

const mockProgressEvents = [
  {
    id: 'event-1',
    blockId: 'block-1',
    eventType: 'completed',
    correctness: 0.9,
    occurredAt: new Date('2026-03-20T10:05:00Z'),
  },
  {
    id: 'event-2',
    blockId: 'block-2',
    eventType: 'started',
    correctness: null,
    occurredAt: new Date('2026-03-20T10:10:00Z'),
  },
];

const mockDb = {
  query: {
    learnerStates: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    learningSessions: {
      findFirst: vi.fn(),
    },
    learnerProgressEvents: {
      findMany: vi.fn(),
    },
  },
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn(),
    }),
  }),
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn(),
    }),
  }),
};

vi.mock('@topshelf/database', () => ({
  getDatabase: () => mockDb,
  learnerStates: {
    id: 'id',
    userId: 'userId',
    contentPackId: 'contentPackId',
    lastActivityAt: 'lastActivityAt',
  },
  learnerProgressEvents: { learnerStateId: 'learnerStateId', occurredAt: 'occurredAt' },
  learningSessions: {
    id: 'id',
    userId: 'userId',
    status: 'status',
    learnerStateId: 'learnerStateId',
  },
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

describe('Learner Routes', () => {
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

    app.route('/learner', createLearnerRoutes());

    // Reset mock implementations
    mockDb.query.learnerStates.findFirst.mockResolvedValue(null);
    mockDb.query.learnerStates.findMany.mockResolvedValue(mockLearnerStates);
    mockDb.query.learningSessions.findFirst.mockResolvedValue(null);
    mockDb.query.learnerProgressEvents.findMany.mockResolvedValue(mockProgressEvents);
  });

  // ---------------------------------------------------------------------------
  // GET /learner/state/:contentPackId
  // ---------------------------------------------------------------------------

  describe('GET /learner/state/:contentPackId', () => {
    it('should return learner state for a content pack', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(mockLearnerState);

      const res = await app.request('/learner/state/pack-1');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.state).toBeDefined();
      expect(body.state.id).toBe('state-1');
      expect(body.state.currentMode).toBe('L1_RECALL');
    });

    it('should return expected state fields', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(mockLearnerState);

      const res = await app.request('/learner/state/pack-1');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.state).toHaveProperty('id');
      expect(body.state).toHaveProperty('currentMode');
      expect(body.state).toHaveProperty('overallMastery');
      expect(body.state).toHaveProperty('totalTimeSpentSeconds');
      expect(body.state).toHaveProperty('blocksCompleted');
      expect(body.state).toHaveProperty('currentBlockId');
      expect(body.state).toHaveProperty('skillEstimates');
      expect(body.state).toHaveProperty('inProbation');
      expect(body.state).toHaveProperty('lastActivityAt');
    });

    it('should return 404 for non-existent learner state', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(null);

      const res = await app.request('/learner/state/non-existent-pack');

      expect(res.status).toBe(404);
    });

    it('should handle UUID-formatted content pack IDs', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      mockDb.query.learnerStates.findFirst.mockResolvedValue({
        ...mockLearnerState,
        contentPackId: uuid,
      });

      const res = await app.request(`/learner/state/${uuid}`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.state).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // GET /learner/states
  // ---------------------------------------------------------------------------

  describe('GET /learner/states', () => {
    it('should return all learner states for current user', async () => {
      const res = await app.request('/learner/states');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.states).toBeDefined();
      expect(Array.isArray(body.states)).toBe(true);
      expect(body.states.length).toBe(2);
    });

    it('should include content pack information', async () => {
      const res = await app.request('/learner/states');

      expect(res.status).toBe(200);
      const body = await res.json();
      const state = body.states[0];
      expect(state.contentPack).toBeDefined();
      expect(state.contentPack.title).toBe('Linux Fundamentals');
    });

    it('should return expected state fields', async () => {
      const res = await app.request('/learner/states');

      expect(res.status).toBe(200);
      const body = await res.json();
      const state = body.states[0];
      expect(state).toHaveProperty('id');
      expect(state).toHaveProperty('contentPack');
      expect(state).toHaveProperty('currentMode');
      expect(state).toHaveProperty('overallMastery');
      expect(state).toHaveProperty('blocksCompleted');
      expect(state).toHaveProperty('lastActivityAt');
    });

    it('should return empty array when no states exist', async () => {
      mockDb.query.learnerStates.findMany.mockResolvedValue([]);

      const res = await app.request('/learner/states');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.states).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /learner/session/start
  // ---------------------------------------------------------------------------

  describe('POST /learner/session/start', () => {
    beforeEach(() => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'new-session-1',
              userId: 'user-test-1',
              learnerStateId: 'state-1',
              status: 'active',
              startedAt: new Date(),
            },
          ]),
        }),
      });
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
    });

    it('should start a new session with existing learner state', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(mockLearnerState);

      const res = await app.request('/learner/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.sessionId).toBeDefined();
      expect(body.state).toBeDefined();
      expect(body.state.currentMode).toBe('L1_RECALL');
    });

    it('should create new learner state if none exists', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(null);

      // Mock the insert for new learner state
      let insertCallCount = 0;
      mockDb.insert.mockImplementation(() => ({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockImplementation(() => {
            insertCallCount++;
            if (insertCallCount === 1) {
              // First insert is for learner state
              return Promise.resolve([
                {
                  id: 'new-state-1',
                  userId: 'user-test-1',
                  contentPackId: '550e8400-e29b-41d4-a716-446655440000',
                  currentMode: 'L1_RECALL',
                  overallMastery: 0,
                  currentBlockId: null,
                },
              ]);
            }
            // Second insert is for session
            return Promise.resolve([
              {
                id: 'new-session-1',
                userId: 'user-test-1',
                learnerStateId: 'new-state-1',
                status: 'active',
                startedAt: new Date(),
              },
            ]);
          }),
        }),
      }));

      const res = await app.request('/learner/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.sessionId).toBeDefined();
    });

    it('should accept optional device info', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(mockLearnerState);

      const res = await app.request('/learner/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
          deviceInfo: { browser: 'Chrome', os: 'Windows' },
        }),
      });

      expect(res.status).toBe(201);
    });

    it('should reject invalid content pack ID format', async () => {
      const res = await app.request('/learner/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: 'not-a-uuid',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject missing content pack ID', async () => {
      const res = await app.request('/learner/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it('should reject empty body', async () => {
      const res = await app.request('/learner/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(null),
      });

      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /learner/session/:sessionId/event
  // ---------------------------------------------------------------------------

  describe('POST /learner/session/:sessionId/event', () => {
    beforeEach(() => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue(mockSession);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'event-new-1',
              blockId: 'block-1',
              eventType: 'completed',
            },
          ]),
        }),
      });
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
    });

    it('should record a progress event successfully', async () => {
      const res = await app.request('/learner/session/session-1/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-1',
          eventType: 'completed',
          correctness: 0.85,
          timeSpentSeconds: 120,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.eventId).toBeDefined();
      expect(body.recorded).toBe(true);
    });

    it('should record started event', async () => {
      const res = await app.request('/learner/session/session-1/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-2',
          eventType: 'started',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.recorded).toBe(true);
    });

    it('should record hint_used event', async () => {
      const res = await app.request('/learner/session/session-1/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-3',
          eventType: 'hint_used',
        }),
      });

      expect(res.status).toBe(200);
    });

    it('should persist trigger state and elevated teaching mode after repeated struggle', async () => {
      const setSpy = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      mockDb.update.mockReturnValue({ set: setSpy });

      const res = await app.request('/learner/session/session-1/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-3',
          eventType: 'hint_used',
        }),
      });

      expect(res.status).toBe(200);
      expect(setSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          teachingMode: 3,
          triggersFired: expect.arrayContaining(['error_repeated', 'stuck_detected']),
        })
      );
    });

    it('should record skipped event', async () => {
      const res = await app.request('/learner/session/session-1/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-4',
          eventType: 'skipped',
        }),
      });

      expect(res.status).toBe(200);
    });

    it('should record paused event', async () => {
      const res = await app.request('/learner/session/session-1/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-5',
          eventType: 'paused',
        }),
      });

      expect(res.status).toBe(200);
    });

    it('should record resumed event', async () => {
      const res = await app.request('/learner/session/session-1/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-6',
          eventType: 'resumed',
        }),
      });

      expect(res.status).toBe(200);
    });

    it('should accept optional response data', async () => {
      const res = await app.request('/learner/session/session-1/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-1',
          eventType: 'completed',
          responseData: { answer: 'user input', attempts: 2 },
        }),
      });

      expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent session', async () => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue(null);

      const res = await app.request('/learner/session/non-existent/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-1',
          eventType: 'completed',
        }),
      });

      expect(res.status).toBe(404);
    });

    it('should return 404 for inactive session', async () => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue(null); // Query includes status: 'active' filter

      const res = await app.request('/learner/session/completed-session/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-1',
          eventType: 'completed',
        }),
      });

      expect(res.status).toBe(404);
    });

    it('should reject invalid event type', async () => {
      const res = await app.request('/learner/session/session-1/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-1',
          eventType: 'invalid_type',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject missing block ID', async () => {
      const res = await app.request('/learner/session/session-1/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'completed',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject missing event type', async () => {
      const res = await app.request('/learner/session/session-1/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-1',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject correctness value out of range (> 1)', async () => {
      const res = await app.request('/learner/session/session-1/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-1',
          eventType: 'completed',
          correctness: 1.5,
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject correctness value out of range (< 0)', async () => {
      const res = await app.request('/learner/session/session-1/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-1',
          eventType: 'completed',
          correctness: -0.1,
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject negative time spent', async () => {
      const res = await app.request('/learner/session/session-1/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-1',
          eventType: 'completed',
          timeSpentSeconds: -10,
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /learner/session/:sessionId/end
  // ---------------------------------------------------------------------------

  describe('POST /learner/session/:sessionId/end', () => {
    beforeEach(() => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue(mockSession);
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
    });

    it('should end a session successfully', async () => {
      const res = await app.request('/learner/session/session-1/end', {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe('Session ended successfully');
      expect(body.sessionId).toBe('session-1');
      expect(body.blocksCompleted).toBe(5);
    });

    it('should return 404 for non-existent session', async () => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue(null);

      const res = await app.request('/learner/session/non-existent/end', {
        method: 'POST',
      });

      expect(res.status).toBe(404);
    });

    it('should return 404 for session belonging to another user', async () => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue(null);

      const res = await app.request('/learner/session/other-user-session/end', {
        method: 'POST',
      });

      expect(res.status).toBe(404);
    });

    it('should handle session with null blocksCompleted', async () => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue({
        ...mockSession,
        blocksCompleted: null,
      });

      const res = await app.request('/learner/session/session-1/end', {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.blocksCompleted).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // GET /learner/progress/:contentPackId
  // ---------------------------------------------------------------------------

  describe('GET /learner/progress/:contentPackId', () => {
    it('should return detailed progress for a content pack', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(mockLearnerState);

      const res = await app.request('/learner/progress/pack-1');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.progress).toBeDefined();
      expect(body.recentActivity).toBeDefined();
    });

    it('should include expected progress fields', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(mockLearnerState);

      const res = await app.request('/learner/progress/pack-1');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.progress).toHaveProperty('currentMode');
      expect(body.progress).toHaveProperty('overallMastery');
      expect(body.progress).toHaveProperty('totalTimeSpentSeconds');
      expect(body.progress).toHaveProperty('blocksCompleted');
      expect(body.progress).toHaveProperty('skillEstimates');
      expect(body.progress).toHaveProperty('retentionHistory');
      expect(body.progress).toHaveProperty('inProbation');
    });

    it('should include recent activity events', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(mockLearnerState);
      mockDb.query.learnerProgressEvents.findMany.mockResolvedValue(mockProgressEvents);

      const res = await app.request('/learner/progress/pack-1');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.recentActivity)).toBe(true);
      expect(body.recentActivity.length).toBe(2);
    });

    it('should return expected activity event fields', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(mockLearnerState);
      mockDb.query.learnerProgressEvents.findMany.mockResolvedValue(mockProgressEvents);

      const res = await app.request('/learner/progress/pack-1');

      expect(res.status).toBe(200);
      const body = await res.json();
      const event = body.recentActivity[0];
      expect(event).toHaveProperty('blockId');
      expect(event).toHaveProperty('eventType');
      expect(event).toHaveProperty('correctness');
      expect(event).toHaveProperty('occurredAt');
    });

    it('should return 404 for non-existent progress', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(null);

      const res = await app.request('/learner/progress/non-existent-pack');

      expect(res.status).toBe(404);
    });

    it('should handle empty recent activity', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue(mockLearnerState);
      mockDb.query.learnerProgressEvents.findMany.mockResolvedValue([]);

      const res = await app.request('/learner/progress/pack-1');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.recentActivity).toEqual([]);
    });

    it('should handle UUID-formatted content pack IDs', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      mockDb.query.learnerStates.findFirst.mockResolvedValue({
        ...mockLearnerState,
        contentPackId: uuid,
      });

      const res = await app.request(`/learner/progress/${uuid}`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.progress).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Edge Cases and Error Handling
  // ---------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle special characters in session ID gracefully', async () => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue(null);

      const res = await app.request('/learner/session/invalid%20session/end', {
        method: 'POST',
      });

      expect(res.status).toBe(404);
    });

    it('should handle learner state with null skill estimates', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue({
        ...mockLearnerState,
        skillEstimates: null,
      });

      const res = await app.request('/learner/state/pack-1');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.state.skillEstimates).toBeNull();
    });

    it('should handle learner state with null current block ID', async () => {
      mockDb.query.learnerStates.findFirst.mockResolvedValue({
        ...mockLearnerState,
        currentBlockId: null,
      });

      const res = await app.request('/learner/state/pack-1');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.state.currentBlockId).toBeNull();
    });
  });
});
