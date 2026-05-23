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

const mockSelectWhere = vi.fn();
const mockSelectFrom = vi.fn();

const mockDb = {
  query: {
    learnerStates: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    learningSessions: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    learnerProgressEvents: {
      findMany: vi.fn(),
    },
    contentBlocks: {
      findFirst: vi.fn(),
    },
  },
  select: vi.fn(),
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
  getDatabase: (): unknown => mockDb,
  learnerStates: {
    id: 'id',
    userId: 'userId',
    contentPackId: 'contentPackId',
    blocksCompleted: 'blocksCompleted',
    lastActivityAt: 'lastActivityAt',
  },
  contentBlocks: {
    id: 'id',
    packId: 'packId',
    blockId: 'blockId',
    hints: 'hints',
    sequenceOrder: 'sequenceOrder',
  },
  learnerProgressEvents: { learnerStateId: 'learnerStateId', occurredAt: 'occurredAt' },
  learningSessions: {
    id: 'id',
    userId: 'userId',
    status: 'status',
    learnerStateId: 'learnerStateId',
    blocksCompleted: 'blocksCompleted',
    blocksAttempted: 'blocksAttempted',
    problemsSolved: 'problemsSolved',
    errorsEncountered: 'errorsEncountered',
    averageCorrectness: 'averageCorrectness',
  },
  eq: (...args: unknown[]): unknown[] => args,
  and: (...args: unknown[]): unknown[] => args,
  desc: (field: unknown): unknown => field,
  gte: (a: unknown, b: unknown): unknown[] => [a, b],
  sql: (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): { strings: string[]; values: unknown[] } => ({
    strings: Array.from(strings),
    values,
  }),
}));

vi.mock('@topshelf/config', () => ({
  getConfig: (): { environment: string } => ({
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
    mockDb.query.learningSessions.findMany.mockResolvedValue([]);
    mockDb.query.learnerProgressEvents.findMany.mockResolvedValue(mockProgressEvents);
    mockDb.query.contentBlocks.findFirst.mockResolvedValue(null);
    mockDb.select.mockReturnValue({ from: mockSelectFrom });
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelectWhere.mockResolvedValue([{ totalSessions: 0 }]);
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

    it('should persist default teaching context when starting a session', async () => {
      const valuesSpy = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'new-session-1',
            userId: 'user-test-1',
            learnerStateId: 'state-1',
            status: 'active',
            teachingMode: 2,
            deviceProfile: 'chromebook_standard',
            startedAt: new Date(),
          },
        ]),
      });

      mockDb.query.learnerStates.findFirst.mockResolvedValue(mockLearnerState);
      mockDb.insert.mockReturnValue({ values: valuesSpy });

      const res = await app.request('/learner/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPackId: '550e8400-e29b-41d4-a716-446655440000',
          deviceInfo: mockSession.deviceInfo,
        }),
      });

      expect(res.status).toBe(201);
      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          teachingMode: 2,
          deviceProfile: 'chromebook_standard',
          errorsEncountered: 0,
          problemsSolved: 0,
          triggersFired: [],
          deviceInfo: mockSession.deviceInfo,
        })
      );

      const body = await res.json();
      expect(body.teaching).toEqual(
        expect.objectContaining({
          mode: 2,
          deviceProfile: 'chromebook_standard',
        })
      );
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

    it('should update learner and session metrics for a correct completion event', async () => {
      const setSpy = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      mockDb.query.learningSessions.findFirst
        .mockResolvedValueOnce({
          ...mockSession,
          startedAt: new Date(),
          teachingMode: 2,
          errorsEncountered: 0,
          problemsSolved: 1,
          triggersFired: [],
        })
        .mockResolvedValueOnce({
          ...mockSession,
          startedAt: new Date(),
          teachingMode: 2,
          errorsEncountered: 0,
          problemsSolved: 2,
          triggersFired: [],
        });
      mockDb.update.mockReturnValue({ set: setSpy });

      const res = await app.request('/learner/session/session-1/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-7',
          eventType: 'completed',
          correctness: 0.85,
          timeSpentSeconds: 120,
        }),
      });

      expect(res.status).toBe(200);
      const learnerStateUpdate = setSpy.mock.calls[0]?.[0];
      const sessionMetricUpdate = setSpy.mock.calls[1]?.[0];
      const sessionTriggerUpdate = setSpy.mock.calls[2]?.[0];

      expect(learnerStateUpdate).toEqual(
        expect.objectContaining({
          currentBlockId: 'block-7',
          blocksCompleted: expect.objectContaining({
            values: expect.arrayContaining(['blocksCompleted']),
          }),
        })
      );
      expect(sessionMetricUpdate).toEqual(
        expect.objectContaining({
          blocksCompleted: expect.objectContaining({
            values: expect.arrayContaining(['blocksCompleted']),
          }),
          blocksAttempted: expect.objectContaining({
            values: expect.arrayContaining(['blocksAttempted']),
          }),
          problemsSolved: expect.objectContaining({
            values: expect.arrayContaining(['problemsSolved']),
          }),
          averageCorrectness: expect.objectContaining({
            values: expect.arrayContaining(['averageCorrectness', 'blocksAttempted', 0.85]),
          }),
        })
      );
      expect(sessionTriggerUpdate).toEqual(
        expect.objectContaining({
          teachingMode: 2,
          triggersFired: [],
          deviceProfile: 'chromebook_standard',
        })
      );
    });

    it('should persist one completed block through the current user session and learner state', async () => {
      const insertValuesSpy = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'event-one-block',
            blockId: 'block-1',
            eventType: 'completed',
          },
        ]),
      });
      const whereSpy = vi.fn().mockResolvedValue(undefined);
      const setSpy = vi.fn().mockReturnValue({ where: whereSpy });

      mockDb.query.learningSessions.findFirst
        .mockResolvedValueOnce({
          ...mockSession,
          userId: 'user-test-1',
          learnerStateId: 'state-1',
          status: 'active',
        })
        .mockResolvedValueOnce({
          ...mockSession,
          userId: 'user-test-1',
          learnerStateId: 'state-1',
          status: 'active',
          blocksCompleted: 1,
          blocksAttempted: 1,
          problemsSolved: 1,
          errorsEncountered: 0,
        });
      mockDb.query.learnerStates.findFirst.mockResolvedValue({
        ...mockLearnerState,
        id: 'state-1',
        userId: 'user-test-1',
      });
      mockDb.insert.mockReturnValue({ values: insertValuesSpy });
      mockDb.update.mockReturnValue({ set: setSpy });

      const res = await app.request('/learner/session/session-1/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-1',
          eventType: 'completed',
          correctness: 1,
          timeSpentSeconds: 30,
        }),
      });

      expect(res.status).toBe(200);
      expect(mockDb.query.learningSessions.findFirst).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: expect.arrayContaining([
            ['id', 'session-1'],
            ['userId', 'user-test-1'],
            ['status', 'active'],
          ]),
        })
      );
      expect(insertValuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-test-1',
          learnerStateId: 'state-1',
          blockId: 'block-1',
          eventType: 'completed',
          correctness: 1,
          timeSpentSeconds: 30,
        })
      );
      expect(setSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          currentBlockId: 'block-1',
          blocksCompleted: expect.objectContaining({
            values: expect.arrayContaining(['blocksCompleted']),
          }),
        })
      );
      expect(whereSpy).toHaveBeenCalledWith(['id', 'state-1']);
    });

    it('should not record progress when the active session is not owned by the current user', async () => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue(null);

      const res = await app.request('/learner/session/session-other-user/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-1',
          eventType: 'completed',
          correctness: 1,
        }),
      });

      expect(res.status).toBe(404);
      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should append a retention record for completed events using block retention config', async () => {
      const now = new Date('2026-05-10T12:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);

      const setSpy = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      mockDb.query.learnerStates.findFirst.mockResolvedValue({
        ...mockLearnerState,
        id: 'state-1',
        contentPackId: 'pack-1',
        retentionHistory: [],
      });
      mockDb.query.contentBlocks.findFirst.mockResolvedValue({
        content: {
          retention: {
            reassessAfterDays: 5,
            decayHalfLifeDays: 13,
          },
        },
      });
      mockDb.query.learningSessions.findFirst
        .mockResolvedValueOnce({
          ...mockSession,
          startedAt: new Date('2026-05-10T11:00:00.000Z'),
        })
        .mockResolvedValueOnce({
          ...mockSession,
          startedAt: new Date('2026-05-10T11:00:00.000Z'),
        });

      mockDb.update.mockReturnValue({ set: setSpy });

      const res = await app.request('/learner/session/session-1/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-9',
          eventType: 'completed',
          correctness: 0.8,
          timeSpentSeconds: 42,
        }),
      });

      expect(res.status).toBe(200);
      const learnerStateUpdate = setSpy.mock.calls[0]?.[0];
      expect(learnerStateUpdate.retentionHistory).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            taskId: 'block-9',
            pass: true,
            latencyMs: 42000,
            reassessAfterDays: 5,
            decayHalfLifeDays: 13,
            nextReassessAt: '2026-05-15T12:00:00.000Z',
          }),
        ])
      );

      vi.useRealTimers();
    });

    it('should persist trigger state and elevated teaching mode after repeated struggle', async () => {
      const setSpy = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      mockDb.query.learningSessions.findFirst
        .mockResolvedValueOnce(mockSession)
        .mockResolvedValueOnce({
          ...mockSession,
          errorsEncountered: 3,
          problemsSolved: 0,
          teachingMode: 2,
          startedAt: new Date('2026-03-20T10:00:00Z'),
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

    it('should only update session struggle counters for skipped events', async () => {
      const setSpy = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      mockDb.query.learningSessions.findFirst
        .mockResolvedValueOnce({
          ...mockSession,
          startedAt: new Date(),
          errorsEncountered: 1,
          problemsSolved: 2,
          teachingMode: 2,
        })
        .mockResolvedValueOnce({
          ...mockSession,
          startedAt: new Date(),
          errorsEncountered: 2,
          problemsSolved: 2,
          teachingMode: 2,
        });
      mockDb.update.mockReturnValue({ set: setSpy });

      const res = await app.request('/learner/session/session-1/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: 'block-4',
          eventType: 'skipped',
        }),
      });

      expect(res.status).toBe(200);
      expect(setSpy).toHaveBeenCalledTimes(2);
      const sessionMetricUpdate = setSpy.mock.calls[0]?.[0];
      const sessionTriggerUpdate = setSpy.mock.calls[1]?.[0];

      expect(sessionMetricUpdate).toEqual(
        expect.objectContaining({
          errorsEncountered: expect.objectContaining({
            values: expect.arrayContaining(['errorsEncountered']),
          }),
        })
      );
      expect(sessionTriggerUpdate).toEqual(
        expect.objectContaining({
          teachingMode: 2,
          triggersFired: [],
          deviceProfile: 'chromebook_standard',
        })
      );
      expect(sessionMetricUpdate).not.toHaveProperty('blocksCompleted');
      expect(sessionMetricUpdate).not.toHaveProperty('blocksAttempted');
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
      expect(body.progress).toHaveProperty('retentionQueue');
      expect(body.progress).toHaveProperty('inProbation');
    });

    it('should include due retention tasks when reassessment dates are in the past', async () => {
      const now = new Date('2026-05-10T12:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);

      mockDb.query.learnerStates.findFirst.mockResolvedValue({
        ...mockLearnerState,
        retentionHistory: [
          {
            taskId: 'block-due',
            date: '2026-05-01T12:00:00.000Z',
            pass: true,
            daysSinceOriginal: 0,
            latencyMs: 42000,
            reassessAfterDays: 5,
            decayHalfLifeDays: 21,
            nextReassessAt: '2026-05-06T12:00:00.000Z',
          },
          {
            taskId: 'block-future',
            date: '2026-05-08T12:00:00.000Z',
            pass: true,
            daysSinceOriginal: 0,
            latencyMs: 15000,
            reassessAfterDays: 10,
            decayHalfLifeDays: 21,
            nextReassessAt: '2026-05-18T12:00:00.000Z',
          },
        ],
      });

      const res = await app.request('/learner/progress/pack-1');
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.progress.retentionQueue.dueTaskIds).toContain('block-due');
      expect(body.progress.retentionQueue.dueTaskIds).not.toContain('block-future');
      expect(body.progress.retentionQueue.dueCount).toBe(1);
      expect(body.progress.retentionQueue.nextDueAt).toBe('2026-05-18T12:00:00.000Z');

      vi.useRealTimers();
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
  // GET /learner/stats
  // ---------------------------------------------------------------------------

  describe('GET /learner/stats', () => {
    const mockStates = [
      {
        overallMastery: 0.5,
        totalTimeSpentSeconds: 3600,
        blocksCompleted: 10,
        lastActivityAt: new Date(),
      },
      {
        overallMastery: 0.75,
        totalTimeSpentSeconds: 7200,
        blocksCompleted: 20,
        lastActivityAt: new Date(),
      },
    ];

    beforeEach(() => {
      mockDb.query.learnerStates.findMany.mockResolvedValue(mockStates);
      mockSelectWhere.mockResolvedValue([{ totalSessions: 3 }]);
    });

    it('should return aggregated stats for the user', async () => {
      const res = await app.request('/learner/stats');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('totalTimeMinutes');
      expect(body).toHaveProperty('totalBlocksCompleted');
      expect(body).toHaveProperty('averageMastery');
      expect(body).toHaveProperty('packsStarted');
      expect(body).toHaveProperty('packsActive');
      expect(body).toHaveProperty('totalSessions');
    });

    it('should sum time correctly across packs', async () => {
      const res = await app.request('/learner/stats');
      const body = await res.json();
      expect(body.totalTimeMinutes).toBe(180); // (3600 + 7200) / 60
    });

    it('should sum blocks completed across packs', async () => {
      const res = await app.request('/learner/stats');
      const body = await res.json();
      expect(body.totalBlocksCompleted).toBe(30);
    });

    it('should compute average mastery across packs', async () => {
      const res = await app.request('/learner/stats');
      const body = await res.json();
      expect(body.averageMastery).toBe(0.625);
    });

    it('should count packs started', async () => {
      const res = await app.request('/learner/stats');
      const body = await res.json();
      expect(body.packsStarted).toBe(2);
    });

    it('should count active packs (activity within 30 days)', async () => {
      const res = await app.request('/learner/stats');
      const body = await res.json();
      expect(body.packsActive).toBe(2);
    });

    it('should count total sessions', async () => {
      const res = await app.request('/learner/stats');
      const body = await res.json();
      expect(body.totalSessions).toBe(3);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.query.learningSessions.findMany).not.toHaveBeenCalled();
    });

    it('should return zeros when user has no data', async () => {
      mockDb.query.learnerStates.findMany.mockResolvedValue([]);
      mockSelectWhere.mockResolvedValue([{ totalSessions: 0 }]);

      const res = await app.request('/learner/stats');
      const body = await res.json();
      expect(body.totalTimeMinutes).toBe(0);
      expect(body.totalBlocksCompleted).toBe(0);
      expect(body.averageMastery).toBe(0);
      expect(body.packsStarted).toBe(0);
      expect(body.packsActive).toBe(0);
      expect(body.totalSessions).toBe(0);
    });

    it('should not count packs inactive for more than 30 days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);

      mockDb.query.learnerStates.findMany.mockResolvedValue([
        { ...mockStates[0], lastActivityAt: oldDate },
        { ...mockStates[1], lastActivityAt: new Date() },
      ]);

      const res = await app.request('/learner/stats');
      const body = await res.json();
      expect(body.packsActive).toBe(1);
    });

    it('should ignore packs with null last activity timestamps', async () => {
      mockDb.query.learnerStates.findMany.mockResolvedValue([
        { ...mockStates[0], lastActivityAt: null },
        { ...mockStates[1], lastActivityAt: new Date() },
      ]);

      const res = await app.request('/learner/stats');
      const body = await res.json();
      expect(body.packsActive).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /learner/session/:sessionId/teach
  // ---------------------------------------------------------------------------

  describe('POST /learner/session/:sessionId/teach', () => {
    beforeEach(() => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue({
        ...mockSession,
        learnerState: { contentPackId: 'pack-1' },
      });
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
    });

    it('should return 404 for non-existent or inactive session', async () => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue(null);

      const res = await app.request('/learner/session/session-1/teach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(404);
    });

    it('should use client content when blockId is absent', async () => {
      const res = await app.request('/learner/session/session-1/teach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Hint: check the loop bounds.' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('triggers');
      expect(body).toHaveProperty('suggestedMode');
      expect(body).toHaveProperty('currentMode');
      expect(mockDb.query.contentBlocks.findFirst).not.toHaveBeenCalled();
    });

    it('should resolve hints from a content block when blockId is provided', async () => {
      mockDb.query.contentBlocks.findFirst.mockResolvedValue({
        blockId: 'block-abc',
        hints: ['Check your loop bounds.', 'Off-by-one errors are common here.'],
      });

      const res = await app.request('/learner/session/session-1/teach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId: 'block-abc' }),
      });

      expect(res.status).toBe(200);
      expect(mockDb.query.contentBlocks.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            ['packId', 'pack-1'],
            ['blockId', 'block-abc'],
          ],
        })
      );
      const body = await res.json();
      expect(body).toHaveProperty('currentMode');
    });

    it('should fall back to client content when block has no hints', async () => {
      mockDb.query.contentBlocks.findFirst.mockResolvedValue({
        blockId: 'block-no-hints',
        hints: [],
      });

      const res = await app.request('/learner/session/session-1/teach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId: 'block-no-hints', content: 'Fallback hint.' }),
      });

      expect(res.status).toBe(200);
    });

    it('should persist elevated teachingMode when suggestedMode exceeds current mode', async () => {
      const setSpy = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      mockDb.update.mockReturnValue({ set: setSpy });

      // Session with many errors causes TriggerDetector to fire and suggestModeElevation
      mockDb.query.learningSessions.findFirst.mockResolvedValue({
        ...mockSession,
        teachingMode: 1,
        errorsEncountered: 5,
        problemsSolved: 0,
        startedAt: new Date(Date.now() - 10 * 60 * 1000),
      });

      const res = await app.request('/learner/session/session-1/teach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.suggestedMode).toBeGreaterThan(body.currentMode);
      expect(setSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          teachingMode: expect.any(Number),
          triggersFired: expect.any(Array),
        })
      );
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
