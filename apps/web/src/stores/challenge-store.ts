/**
 * TopShelf Service LLC - Challenge Store
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Zustand store managing all client-side challenge state.
 * Bridges the engine's ChallengeMachine and ShadowValidator to React.
 */

import { create } from 'zustand';
import type {
  ChallengeConfig,
  ChallengeEvent,
  HiddenInfraction,
  ConsequencePayload,
  MasteryDomain,
  ChallengePhase,
} from '@topshelf/engine';
import { InfractionSeverity } from '@topshelf/engine';

// =============================================================================
// STORE TYPES
// =============================================================================

interface ChallengeStore {
  // --- State ---
  config: ChallengeConfig | null;
  phase: ChallengePhase | null;
  timeRemainingMs: number;
  ticketsCompleted: number;
  ticketsTotal: number;
  events: ChallengeEvent[];
  infractions: HiddenInfraction[];
  wasteAccumulated: number;
  lastHandwashAt: number | null;
  consecutiveFailures: number;
  domainScores: Record<string, number>;
  isVerification: boolean;
  consequencePayload: ConsequencePayload | null;
  overallGrade: string | null;
  isTimerRunning: boolean;
  challengeId: string | null;
  startedAt: number | null;

  // --- Actions ---
  initChallenge: (config: ChallengeConfig) => void;
  setPhase: (phase: ChallengePhase) => void;
  addEvent: (event: ChallengeEvent) => void;
  addInfraction: (infraction: HiddenInfraction) => void;
  addWaste: (costDollars: number) => void;
  recordHandwash: () => void;
  completeTicket: () => void;
  tick: (elapsedMs: number) => void;
  setConsequencePayload: (payload: ConsequencePayload) => void;
  setOverallGrade: (grade: string) => void;
  setIsVerification: (isVerification: boolean) => void;
  incrementFailures: () => void;
  resetFailures: () => void;
  startTimer: () => void;
  stopTimer: () => void;
  reset: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const createInitialDomainScores = (): Record<string, number> => {
  const scores: Record<string, number> = {};
  const domains: MasteryDomain[] = [
    'sanitation' as MasteryDomain,
    'food_safety' as MasteryDomain,
    'efficiency' as MasteryDomain,
    'sequencing' as MasteryDomain,
    'kitchen_math' as MasteryDomain,
    'waste_management' as MasteryDomain,
    'speed' as MasteryDomain,
    'plating' as MasteryDomain,
    'judgment' as MasteryDomain,
    'inventory' as MasteryDomain,
    'labor_cost' as MasteryDomain,
  ];
  for (const d of domains) {
    scores[d] = 100;
  }
  return scores;
};

// =============================================================================
// STORE
// =============================================================================

export const useChallengeStore = create<ChallengeStore>((set) => ({
  // Initial state
  config: null,
  phase: null,
  timeRemainingMs: 0,
  ticketsCompleted: 0,
  ticketsTotal: 0,
  events: [],
  infractions: [],
  wasteAccumulated: 0,
  lastHandwashAt: null,
  consecutiveFailures: 0,
  domainScores: createInitialDomainScores(),
  isVerification: false,
  consequencePayload: null,

  overallGrade: null,
  isTimerRunning: false,
  challengeId: null,
  startedAt: null,

  // Actions
  initChallenge: (config) =>
    set({
      config,
      challengeId: config.id,
      phase: 'setup' as ChallengePhase,
      timeRemainingMs: config.timeLimitSeconds * 1000,
      ticketsTotal: config.tickets?.length ?? 0,
      ticketsCompleted: 0,
      events: [],
      infractions: [],
      wasteAccumulated: 0,
      lastHandwashAt: null,
      consecutiveFailures: 0,
      domainScores: createInitialDomainScores(),
      isVerification: false,
      consequencePayload: null,

      overallGrade: null,
      isTimerRunning: false,
      startedAt: Date.now(),
    }),

  setPhase: (phase) => set({ phase }),

  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),

  addInfraction: (infraction) =>
    set((state) => {
      const deduction =
        infraction.severity === InfractionSeverity.CRITICAL
          ? 35
          : infraction.severity === InfractionSeverity.HIGH
            ? 20
            : infraction.severity === InfractionSeverity.MEDIUM
              ? 10
              : 5;
      const newScores = { ...state.domainScores };
      newScores[infraction.domain] = Math.max(0, (newScores[infraction.domain] ?? 100) - deduction);
      return {
        infractions: [...state.infractions, infraction],
        domainScores: newScores,
      };
    }),

  addWaste: (costDollars) =>
    set((state) => ({
      wasteAccumulated: state.wasteAccumulated + costDollars,
    })),

  recordHandwash: () => set({ lastHandwashAt: Date.now() }),

  completeTicket: () =>
    set((state) => ({
      ticketsCompleted: state.ticketsCompleted + 1,
    })),

  tick: (elapsedMs) =>
    set((state) => ({
      timeRemainingMs: Math.max(0, state.timeRemainingMs - elapsedMs),
    })),

  setConsequencePayload: (payload) => set({ consequencePayload: payload }),
  setOverallGrade: (grade) => set({ overallGrade: grade }),
  setIsVerification: (isVerification) => set({ isVerification }),
  incrementFailures: () =>
    set((state) => ({
      consecutiveFailures: state.consecutiveFailures + 1,
    })),
  resetFailures: () => set({ consecutiveFailures: 0 }),
  startTimer: () => set({ isTimerRunning: true }),
  stopTimer: () => set({ isTimerRunning: false }),

  reset: () =>
    set({
      config: null,
      phase: null,
      timeRemainingMs: 0,
      ticketsCompleted: 0,
      ticketsTotal: 0,
      events: [],
      infractions: [],
      wasteAccumulated: 0,
      lastHandwashAt: null,
      consecutiveFailures: 0,
      domainScores: createInitialDomainScores(),
      isVerification: false,
      consequencePayload: null,

      overallGrade: null,
      isTimerRunning: false,
      challengeId: null,
      startedAt: null,
    }),
}));
