/**
 * Tests for Learner API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  learnerApi,
  type LearnerState,
  type LearnerStateDetail,
  type LearnerProgress,
  type StartSessionResponse,
  type ProgressEventResponse,
  type EndSessionResponse,
  type LearningSession,
} from './learner';

// Mock the api client
vi.mock('./client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from './client';

const mockApi = api as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('learnerApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockLearnerState: LearnerState = {
    id: 'state-123',
    contentPack: {
      id: 'pack-123',
      title: 'JavaScript Fundamentals',
      slug: 'javascript-fundamentals',
      certificationTarget: 'JavaScript Developer',
    },
    currentMode: 'L2_EXPLAIN',
    overallMastery: 0.65,
    blocksCompleted: 3,
    lastActivityAt: '2024-01-20T15:30:00Z',
  };

  const mockLearnerStateDetail: LearnerStateDetail = {
    state: {
      id: 'state-123',
      currentMode: 'L2_EXPLAIN',
      overallMastery: 0.65,
      totalTimeSpentSeconds: 3600,
      blocksCompleted: 3,
      currentBlockId: 'block-4',
      skillEstimates: { variables: 0.8, functions: 0.5 },
      inProbation: false,
      lastActivityAt: '2024-01-20T15:30:00Z',
    },
  };

  const mockLearnerProgress: LearnerProgress = {
    progress: {
      currentMode: 'L2_EXPLAIN',
      overallMastery: 0.65,
      totalTimeSpentSeconds: 3600,
      blocksCompleted: 3,
      skillEstimates: { variables: 0.8, functions: 0.5 },
      retentionHistory: [],
      inProbation: false,
    },
    recentActivity: [
      {
        blockId: 'block-3',
        eventType: 'completed',
        correctness: 0.9,
        occurredAt: '2024-01-20T15:25:00Z',
      },
    ],
  };

  describe('getStates', () => {
    it('should call GET /learner/states', async () => {
      mockApi.get.mockResolvedValueOnce({ states: [mockLearnerState] });

      const result = await learnerApi.getStates();

      expect(mockApi.get).toHaveBeenCalledWith('/learner/states');
      expect(result.states).toHaveLength(1);
      expect(result.states[0]!.id).toBe('state-123');
    });

    it('should return empty states for new users', async () => {
      mockApi.get.mockResolvedValueOnce({ states: [] });

      const result = await learnerApi.getStates();

      expect(result.states).toEqual([]);
    });

    it('should propagate API errors', async () => {
      const error = new Error('Unauthorized');
      mockApi.get.mockRejectedValueOnce(error);

      await expect(learnerApi.getStates()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getState', () => {
    it('should call GET /learner/state/:contentPackId', async () => {
      mockApi.get.mockResolvedValueOnce(mockLearnerStateDetail);

      const result = await learnerApi.getState('pack-123');

      expect(mockApi.get).toHaveBeenCalledWith('/learner/state/pack-123');
      expect(result.state.overallMastery).toBe(0.65);
    });

    it('should include skill estimates in response', async () => {
      mockApi.get.mockResolvedValueOnce(mockLearnerStateDetail);

      const result = await learnerApi.getState('pack-123');

      expect(result.state.skillEstimates).toEqual({ variables: 0.8, functions: 0.5 });
    });

    it('should handle non-existent state', async () => {
      const error = new Error('State not found');
      mockApi.get.mockRejectedValueOnce(error);

      await expect(learnerApi.getState('non-existent')).rejects.toThrow('State not found');
    });
  });

  describe('getProgress', () => {
    it('should call GET /learner/progress/:contentPackId', async () => {
      mockApi.get.mockResolvedValueOnce(mockLearnerProgress);

      const result = await learnerApi.getProgress('pack-123');

      expect(mockApi.get).toHaveBeenCalledWith('/learner/progress/pack-123');
      expect(result.progress.blocksCompleted).toBe(3);
    });

    it('should include recent activity', async () => {
      mockApi.get.mockResolvedValueOnce(mockLearnerProgress);

      const result = await learnerApi.getProgress('pack-123');

      expect(result.recentActivity).toHaveLength(1);
      expect(result.recentActivity[0]!.eventType).toBe('completed');
    });
  });

  describe('startSession', () => {
    it('should call POST /learner/session/start with contentPackId', async () => {
      const startResponse: StartSessionResponse = {
        sessionId: 'session-abc',
        state: {
          currentMode: 'L1_RECALL',
          overallMastery: 0,
          currentBlockId: 'block-1',
        },
      };
      mockApi.post.mockResolvedValueOnce(startResponse);

      const result = await learnerApi.startSession('pack-123');

      expect(mockApi.post).toHaveBeenCalledWith('/learner/session/start', {
        contentPackId: 'pack-123',
        deviceInfo: undefined,
      });
      expect(result.sessionId).toBe('session-abc');
    });

    it('should pass deviceInfo when provided', async () => {
      const startResponse: StartSessionResponse = {
        sessionId: 'session-abc',
        state: {
          currentMode: 'L1_RECALL',
          overallMastery: 0,
          currentBlockId: 'block-1',
        },
      };
      mockApi.post.mockResolvedValueOnce(startResponse);

      const deviceInfo = { platform: 'web', browser: 'Chrome' };
      await learnerApi.startSession('pack-123', deviceInfo);

      expect(mockApi.post).toHaveBeenCalledWith('/learner/session/start', {
        contentPackId: 'pack-123',
        deviceInfo,
      });
    });
  });

  describe('recordEvent', () => {
    it('should call POST /learner/session/:sessionId/event with event data', async () => {
      const eventResponse: ProgressEventResponse = {
        eventId: 'event-xyz',
        recorded: true,
      };
      mockApi.post.mockResolvedValueOnce(eventResponse);

      const event = {
        blockId: 'block-1',
        eventType: 'completed' as const,
        correctness: 1.0,
        timeSpentSeconds: 120,
      };
      const result = await learnerApi.recordEvent('session-abc', event);

      expect(mockApi.post).toHaveBeenCalledWith('/learner/session/session-abc/event', event);
      expect(result.recorded).toBe(true);
    });

    it('should handle started event type', async () => {
      const eventResponse: ProgressEventResponse = {
        eventId: 'event-xyz',
        recorded: true,
      };
      mockApi.post.mockResolvedValueOnce(eventResponse);

      await learnerApi.recordEvent('session-abc', {
        blockId: 'block-1',
        eventType: 'started',
      });

      expect(mockApi.post).toHaveBeenCalledWith('/learner/session/session-abc/event', {
        blockId: 'block-1',
        eventType: 'started',
      });
    });

    it('should handle hint_used event type', async () => {
      const eventResponse: ProgressEventResponse = {
        eventId: 'event-xyz',
        recorded: true,
      };
      mockApi.post.mockResolvedValueOnce(eventResponse);

      await learnerApi.recordEvent('session-abc', {
        blockId: 'block-1',
        eventType: 'hint_used',
        responseData: { hintLevel: 1 },
      });

      expect(mockApi.post).toHaveBeenCalledWith('/learner/session/session-abc/event', {
        blockId: 'block-1',
        eventType: 'hint_used',
        responseData: { hintLevel: 1 },
      });
    });

    it('should handle skipped event type', async () => {
      const eventResponse: ProgressEventResponse = {
        eventId: 'event-xyz',
        recorded: true,
      };
      mockApi.post.mockResolvedValueOnce(eventResponse);

      await learnerApi.recordEvent('session-abc', {
        blockId: 'block-1',
        eventType: 'skipped',
      });

      expect(mockApi.post).toHaveBeenCalledWith('/learner/session/session-abc/event', {
        blockId: 'block-1',
        eventType: 'skipped',
      });
    });

    it('should handle paused and resumed event types', async () => {
      const eventResponse: ProgressEventResponse = {
        eventId: 'event-xyz',
        recorded: true,
      };
      mockApi.post.mockResolvedValueOnce(eventResponse);
      mockApi.post.mockResolvedValueOnce(eventResponse);

      await learnerApi.recordEvent('session-abc', {
        blockId: 'block-1',
        eventType: 'paused',
      });

      await learnerApi.recordEvent('session-abc', {
        blockId: 'block-1',
        eventType: 'resumed',
      });

      expect(mockApi.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('endSession', () => {
    it('should call POST /learner/session/:sessionId/end', async () => {
      const endResponse: EndSessionResponse = {
        message: 'Session ended successfully',
        sessionId: 'session-abc',
        blocksCompleted: 5,
      };
      mockApi.post.mockResolvedValueOnce(endResponse);

      const result = await learnerApi.endSession('session-abc');

      expect(mockApi.post).toHaveBeenCalledWith('/learner/session/session-abc/end');
      expect(result.blocksCompleted).toBe(5);
    });
  });

  describe('getRecentSessions', () => {
    const mockSession: LearningSession = {
      id: 'session-123',
      status: 'completed',
      contentPack: {
        title: 'JavaScript Fundamentals',
        slug: 'javascript-fundamentals',
      },
      startedAt: '2024-01-20T14:00:00Z',
      endedAt: '2024-01-20T15:30:00Z',
      blocksCompleted: 5,
    };

    it('should call GET /session without limit', async () => {
      mockApi.get.mockResolvedValueOnce({ sessions: [mockSession] });

      const result = await learnerApi.getRecentSessions();

      expect(mockApi.get).toHaveBeenCalledWith('/session', undefined);
      expect(result.sessions).toHaveLength(1);
    });

    it('should call GET /session with limit parameter', async () => {
      mockApi.get.mockResolvedValueOnce({ sessions: [mockSession] });

      await learnerApi.getRecentSessions(5);

      expect(mockApi.get).toHaveBeenCalledWith('/session', { limit: '5' });
    });

    it('should handle sessions without contentPack', async () => {
      const orphanSession: LearningSession = {
        ...mockSession,
        contentPack: null,
      };
      mockApi.get.mockResolvedValueOnce({ sessions: [orphanSession] });

      const result = await learnerApi.getRecentSessions();

      expect(result.sessions[0]!.contentPack).toBeNull();
    });
  });

  describe('getWeeklyGoal', () => {
    it('should call GET /learner/weekly-goal', async () => {
      const goalResponse = {
        targetMinutes: 120,
        completedMinutes: 45,
        daysActive: 3,
      };
      mockApi.get.mockResolvedValueOnce(goalResponse);

      const result = await learnerApi.getWeeklyGoal();

      expect(mockApi.get).toHaveBeenCalledWith('/learner/weekly-goal');
      expect(result.targetMinutes).toBe(120);
      expect(result.completedMinutes).toBe(45);
    });
  });

  describe('updateWeeklyGoal', () => {
    it('should call PATCH /learner/weekly-goal with new target', async () => {
      const updatedGoal = {
        targetMinutes: 180,
        completedMinutes: 45,
        daysActive: 3,
      };
      mockApi.patch.mockResolvedValueOnce(updatedGoal);

      const result = await learnerApi.updateWeeklyGoal(180);

      expect(mockApi.patch).toHaveBeenCalledWith('/learner/weekly-goal', {
        targetMinutes: 180,
      });
      expect(result.targetMinutes).toBe(180);
    });
  });
});
