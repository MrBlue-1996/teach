/**
 * TopShelf Teaching - Learner API
 * Aligned with backend: packages/api-server/src/routes/learner.ts
 *
 * Backend routes:
 *   GET  /learner/state/:contentPackId        - Get learner state for a pack
 *   GET  /learner/states                      - Get all learner states
 *   POST /learner/session/start               - Start learning session
 *   POST /learner/session/:sessionId/event    - Record progress event
 *   POST /learner/session/:sessionId/end      - End learning session
 *   GET  /learner/progress/:contentPackId     - Get detailed progress
 *
 * Also: GET /session and GET /session/:sessionId on separate session routes.
 */

import { api } from './client';

/** Matches backend learner state shape from GET /learner/states */
export interface LearnerState {
  id: string;
  contentPack: {
    id: string;
    title: string;
    slug: string;
    certificationTarget: string;
  };
  currentMode: string;
  overallMastery: number;
  blocksCompleted: number;
  lastActivityAt: string;
}

/** Matches backend shape from GET /learner/state/:contentPackId */
export interface LearnerStateDetail {
  state: {
    id: string;
    currentMode: string;
    overallMastery: number;
    totalTimeSpentSeconds: number;
    blocksCompleted: number;
    currentBlockId: string;
    skillEstimates: unknown;
    inProbation: boolean;
    lastActivityAt: string;
  };
}

/** Matches backend shape from GET /learner/progress/:contentPackId */
export interface LearnerProgress {
  progress: {
    currentMode: string;
    overallMastery: number;
    totalTimeSpentSeconds: number;
    blocksCompleted: number;
    skillEstimates: unknown;
    retentionHistory: unknown;
    inProbation: boolean;
  };
  recentActivity: {
    blockId: string;
    eventType: string;
    correctness: number | null;
    occurredAt: string;
  }[];
}

/** Matches backend shape from POST /learner/session/start */
export interface StartSessionResponse {
  sessionId: string;
  state: {
    currentMode: string;
    overallMastery: number;
    currentBlockId: string;
  };
  teaching?: {
    mode: number;
    deviceProfile: string;
  };
}

/** Matches backend shape from POST /learner/session/:sessionId/teach */
export interface TeachingGuidanceResponse {
  shouldTeach: boolean;
  content?: string;
  mode: number;
  filtered: boolean;
  filterReason?: string;
  triggers: string[];
  suggestedMode: number;
  currentMode: number;
}

/** Matches backend shape from POST /learner/session/:sessionId/event */
export interface ProgressEventResponse {
  eventId: string;
  recorded: boolean;
}

/** Matches backend shape from POST /learner/session/:sessionId/end */
export interface EndSessionResponse {
  message: string;
  sessionId: string;
  blocksCompleted: number;
}

/** Matches backend shape from GET /session (separate route) */
export interface LearningSession {
  id: string;
  status: string;
  contentPack: { title: string; slug: string } | null;
  startedAt: string;
  endedAt: string | null;
  blocksCompleted: number;
}

export const learnerApi = {
  /**
   * GET /learner/states - Get all learner states for current user.
   * TODO: Backend does not have a /learner/stats aggregate endpoint.
   * This returns per-pack states instead. Dashboard should compute stats from these.
   */
  getStates: () => api.get<{ states: LearnerState[] }>('/learner/states'),

  /** GET /learner/state/:contentPackId - Get learner state for a content pack */
  getState: (contentPackId: string) =>
    api.get<LearnerStateDetail>(`/learner/state/${contentPackId}`),

  /** GET /learner/progress/:contentPackId - Get detailed progress */
  getProgress: (contentPackId: string) =>
    api.get<LearnerProgress>(`/learner/progress/${contentPackId}`),

  /** POST /learner/session/start - Start a new learning session */
  startSession: (contentPackId: string, deviceInfo?: Record<string, unknown>) =>
    api.post<StartSessionResponse>('/learner/session/start', { contentPackId, deviceInfo }),

  /** POST /learner/session/:sessionId/event - Record a progress event */
  recordEvent: (
    sessionId: string,
    event: {
      blockId: string;
      eventType: 'started' | 'completed' | 'hint_used' | 'skipped' | 'paused' | 'resumed';
      responseData?: Record<string, unknown>;
      correctness?: number;
      timeSpentSeconds?: number;
    }
  ) => api.post<ProgressEventResponse>(`/learner/session/${sessionId}/event`, event),

  /** POST /learner/session/:sessionId/end - End a learning session */
  endSession: (sessionId: string) =>
    api.post<EndSessionResponse>(`/learner/session/${sessionId}/end`),

  /** POST /learner/session/:sessionId/teach - Get engine-backed teaching guidance */
  getTeachingGuidance: (
    sessionId: string,
    opts?: { blockId?: string; content?: string }
  ) =>
    api.post<TeachingGuidanceResponse>(
      `/learner/session/${sessionId}/teach`,
      opts ?? {}
    ),

  /** GET /session - List user's learning sessions (separate session route) */
  getRecentSessions: (limit?: number) =>
    api.get<{ sessions: LearningSession[] }>(
      '/session',
      limit ? { limit: String(limit) } : undefined
    ),

  // TODO: Backend does not have /learner/weekly-goal endpoint
  getWeeklyGoal: () =>
    api.get<{ targetMinutes: number; completedMinutes: number; daysActive: number }>(
      '/learner/weekly-goal'
    ),

  // TODO: Backend does not have PATCH /learner/weekly-goal endpoint
  updateWeeklyGoal: (targetMinutes: number) =>
    api.patch<{ targetMinutes: number; completedMinutes: number; daysActive: number }>(
      '/learner/weekly-goal',
      { targetMinutes }
    ),
};
