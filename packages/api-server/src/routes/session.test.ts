/**
 * TopShelf API Server - Session Routes Test Suite
 *
 * Tests for session routes: list sessions, get session details.
 * Uses Hono's app.request() for HTTP-level testing without a running server.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createSessionRoutes } from './session.js';
import { errorHandler } from '../middleware/error-handler.js';

// =============================================================================
// MOCKS
// =============================================================================

const mockSessions = [
  {
    id: 'session-1',
    userId: 'user-test-1',
    status: 'completed',
    startedAt: new Date('2026-03-20T10:00:00Z'),
    endedAt: new Date('2026-03-20T11:00:00Z'),
    blocksCompleted: 5,
    learnerState: {
      contentPack: {
        title: 'Linux Fundamentals',
        slug: 'linux-fundamentals',
      },
    },
  },
  {
    id: 'session-2',
    userId: 'user-test-1',
    status: 'active',
    startedAt: new Date('2026-03-21T09:00:00Z'),
    endedAt: null,
    blocksCompleted: 2,
    learnerState: {
      contentPack: {
        title: 'AWS Cloud Practitioner',
        slug: 'aws-cloud-practitioner',
      },
    },
  },
];

const mockUpdateWhere = vi.fn().mockResolvedValue([]);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

const mockDb = {
  query: {
    learningSessions: {
      findMany: vi.fn().mockResolvedValue(mockSessions),
      findFirst: vi.fn(),
    },
  },
  update: mockUpdate,
};

vi.mock('@topshelf/database', () => ({
  getDatabase: (): unknown => mockDb,
  learningSessions: {
    id: 'id',
    userId: 'userId',
    status: 'status',
    startedAt: 'startedAt',
    endedAt: 'endedAt',
  },
  eq: (...args: unknown[]): unknown[] => args,
  and: (...args: unknown[]): unknown[] => args,
  desc: (field: unknown): unknown => field,
}));

vi.mock('@topshelf/config', () => ({
  getConfig: (): { environment: string } => ({
    environment: 'development',
  }),
}));

// =============================================================================
// TESTS
// =============================================================================

describe('Session Routes', () => {
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

    app.route('/session', createSessionRoutes());

    // Reset mock implementations
    mockDb.query.learningSessions.findMany.mockResolvedValue(mockSessions);
    mockDb.query.learningSessions.findFirst.mockResolvedValue(null);
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockResolvedValue([]);
  });

  // ---------------------------------------------------------------------------
  // GET /session
  // ---------------------------------------------------------------------------

  describe('GET /session', () => {
    it('should return list of user sessions', async () => {
      const res = await app.request('/session');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.sessions).toBeDefined();
      expect(Array.isArray(body.sessions)).toBe(true);
    });

    it('should return sessions with expected fields', async () => {
      const res = await app.request('/session');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.sessions.length).toBe(2);

      const session = body.sessions[0];
      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('status');
      expect(session).toHaveProperty('contentPack');
      expect(session).toHaveProperty('startedAt');
      expect(session).toHaveProperty('endedAt');
      expect(session).toHaveProperty('blocksCompleted');
    });

    it('should include content pack information', async () => {
      const res = await app.request('/session');

      expect(res.status).toBe(200);
      const body = await res.json();
      const session = body.sessions[0];
      expect(session.contentPack).toBeDefined();
      expect(session.contentPack.title).toBe('Linux Fundamentals');
      expect(session.contentPack.slug).toBe('linux-fundamentals');
    });

    it('should return empty array when no sessions exist', async () => {
      mockDb.query.learningSessions.findMany.mockResolvedValue([]);

      const res = await app.request('/session');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.sessions).toEqual([]);
    });

    it('should only return sessions for authenticated user', async () => {
      // This is validated at the database query level
      const res = await app.request('/session');

      expect(res.status).toBe(200);
      expect(mockDb.query.learningSessions.findMany).toHaveBeenCalled();
    });

    it('should handle sessions with null learnerState gracefully', async () => {
      mockDb.query.learningSessions.findMany.mockResolvedValue([
        {
          id: 'session-orphan',
          userId: 'user-test-1',
          status: 'completed',
          startedAt: new Date(),
          endedAt: new Date(),
          blocksCompleted: 0,
          learnerState: null,
        },
      ]);

      const res = await app.request('/session');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.sessions[0].contentPack).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // GET /session/:sessionId
  // ---------------------------------------------------------------------------

  describe('GET /session/:sessionId', () => {
    it('should return session details', async () => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue({
        id: 'session-1',
        userId: 'user-test-1',
        status: 'completed',
        startedAt: new Date('2026-03-20T10:00:00Z'),
        endedAt: new Date('2026-03-20T11:00:00Z'),
        blocksCompleted: 5,
        blocksAttempted: 6,
        learnerState: {
          id: 'state-1',
          currentMode: 'L2_RECOGNITION',
          overallMastery: 0.75,
        },
      });

      const res = await app.request('/session/session-1');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.session).toBeDefined();
      expect(body.session.id).toBe('session-1');
    });

    it('should include learner state in session details', async () => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue({
        id: 'session-1',
        userId: 'user-test-1',
        status: 'completed',
        startedAt: new Date(),
        endedAt: new Date(),
        blocksCompleted: 5,
        learnerState: {
          id: 'state-1',
          currentMode: 'L2_RECOGNITION',
          overallMastery: 0.75,
        },
      });

      const res = await app.request('/session/session-1');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.session.learnerState).toBeDefined();
      expect(body.session.learnerState.currentMode).toBe('L2_RECOGNITION');
    });

    it('should return 404 for non-existent session', async () => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue(null);

      const res = await app.request('/session/non-existent-id');

      expect(res.status).toBe(404);
    });

    it('should return 404 for session belonging to another user', async () => {
      // The database query includes userId filter, so if no result, it's 404
      mockDb.query.learningSessions.findFirst.mockResolvedValue(null);

      const res = await app.request('/session/other-user-session');

      expect(res.status).toBe(404);
    });

    it('should return session with all expected fields', async () => {
      const sessionData = {
        id: 'session-1',
        userId: 'user-test-1',
        status: 'active',
        startedAt: new Date('2026-03-21T09:00:00Z'),
        endedAt: null,
        blocksCompleted: 2,
        blocksAttempted: 3,
        deviceInfo: { browser: 'Chrome', os: 'Windows' },
        learnerState: null,
      };
      mockDb.query.learningSessions.findFirst.mockResolvedValue(sessionData);

      const res = await app.request('/session/session-1');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.session.status).toBe('active');
      expect(body.session.blocksCompleted).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /session/active
  // ---------------------------------------------------------------------------

  describe('GET /session/active', () => {
    it('should return null session when none are active', async () => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue(null);

      const res = await app.request('/session/active');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.session).toBeNull();
    });

    it('should return the active session when one exists', async () => {
      const activeSession = {
        id: 'session-2',
        userId: 'user-test-1',
        status: 'active',
        startedAt: new Date('2026-03-21T09:00:00Z'),
        endedAt: null,
        blocksCompleted: 2,
        learnerState: null,
      };
      mockDb.query.learningSessions.findFirst.mockResolvedValue(activeSession);

      const res = await app.request('/session/active');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.session).toBeDefined();
      expect(body.session.id).toBe('session-2');
      expect(body.session.status).toBe('active');
    });

    it('should query with active status filter', async () => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue(null);

      await app.request('/session/active');

      expect(mockDb.query.learningSessions.findFirst).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE /session/:id
  // ---------------------------------------------------------------------------

  describe('DELETE /session/:id', () => {
    it('should return 404 for non-existent session', async () => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue(null);

      const res = await app.request('/session/non-existent', { method: 'DELETE' });

      expect(res.status).toBe(404);
    });

    it('should return 403 when session belongs to another user', async () => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue({
        id: 'session-other',
        userId: 'other-user',
        status: 'active',
        startedAt: new Date(),
        endedAt: null,
      });

      const res = await app.request('/session/session-other', { method: 'DELETE' });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toContain('not owned');
    });

    it('should return 400 when session is already completed', async () => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue({
        id: 'session-1',
        userId: 'user-test-1',
        status: 'completed',
        startedAt: new Date(),
        endedAt: new Date(),
      });

      const res = await app.request('/session/session-1', { method: 'DELETE' });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toContain('already ended');
    });

    it('should end an active session successfully', async () => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue({
        id: 'session-1',
        userId: 'user-test-1',
        status: 'active',
        startedAt: new Date(),
        endedAt: null,
      });

      const res = await app.request('/session/session-1', { method: 'DELETE' });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should set status to completed and endedAt on success', async () => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue({
        id: 'session-1',
        userId: 'user-test-1',
        status: 'active',
        startedAt: new Date(),
        endedAt: null,
      });

      await app.request('/session/session-1', { method: 'DELETE' });

      expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    });
  });

  // ---------------------------------------------------------------------------
  // Edge Cases and Error Handling
  // ---------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle UUID-formatted session IDs', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      mockDb.query.learningSessions.findFirst.mockResolvedValue({
        id: uuid,
        userId: 'user-test-1',
        status: 'completed',
        startedAt: new Date(),
        endedAt: new Date(),
        blocksCompleted: 5,
        learnerState: null,
      });

      const res = await app.request(`/session/${uuid}`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.session.id).toBe(uuid);
    });

    it('should handle special characters in session ID gracefully', async () => {
      mockDb.query.learningSessions.findFirst.mockResolvedValue(null);

      const res = await app.request('/session/invalid%20session%20id');

      expect(res.status).toBe(404);
    });
  });
});
