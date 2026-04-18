/**
 * TopShelf Service LLC - useChallenge Hook
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Bridges the engine's ChallengeMachine + ShadowValidator to React.
 * The "Trojan horse" learning loop runs silently here — every logged
 * event is evaluated by the shadow validator; detected infractions are
 * invisibly appended to the store without interrupting the cook.
 */
'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ChallengeMachine,
  ShadowValidator,
  ChallengeConfig,
  ChallengeEvent,
  ChallengePhase,
  EventType,
} from '@topshelf/engine';
import { useChallengeStore } from '@/stores/challenge-store';

const TICK_MS = 500;

export function useChallenge(config: ChallengeConfig | null) {
  const store = useChallengeStore();

  const machineRef = useRef<ChallengeMachine | null>(null);
  const validatorRef = useRef<ShadowValidator | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  // Initialize engine once per config id
  useEffect(() => {
    if (!config) return;
    if (machineRef.current?.getConfig().id === config.id) return;

    machineRef.current = new ChallengeMachine(config);
    validatorRef.current = new ShadowValidator();
    store.initChallenge(config);
  }, [config, store]);

  // Tick timer during SOLVE / VERIFY
  useEffect(() => {
    const isActive =
      store.isTimerRunning &&
      (store.phase === ChallengePhase.SOLVE ||
        store.phase === ChallengePhase.VERIFY);

    if (!isActive) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }

    lastTickRef.current = Date.now();
    tickRef.current = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      const machine = machineRef.current;
      const validator = validatorRef.current;
      if (!machine || !validator) return;

      machine.tick(delta);
      store.tick(delta);

      // Periodic sanitation / spoilage checks
      const periodic = validator.runPeriodicChecks(machine.getState());
      for (const inf of periodic) {
        machine.addInfraction(inf);
        store.addInfraction(inf);
      }

      // Auto-transition when timer hits zero
      if (machine.getState().timeRemainingMs === 0) {
        store.stopTimer();
      }
    }, TICK_MS);

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [store.isTimerRunning, store.phase, store]);

  // --- Actions exposed to the UI ---

  const logEvent = useCallback(
    (type: EventType, data: Record<string, unknown> = {}) => {
      const machine = machineRef.current;
      const validator = validatorRef.current;
      if (!machine || !validator) return;

      const event: ChallengeEvent = machine.recordEvent(type, data);
      store.addEvent(event);

      const infractions = validator.evaluate(event, machine.getState());
      for (const inf of infractions) {
        machine.addInfraction(inf);
        store.addInfraction(inf);
      }
    },
    [store],
  );

  const start = useCallback(() => {
    const machine = machineRef.current;
    if (!machine) return;
    machine.startSolve();
    store.setPhase(ChallengePhase.SOLVE);
    store.startTimer();
  }, [store]);

  const endSolve = useCallback(() => {
    const machine = machineRef.current;
    if (!machine) return;
    machine.endSolve();
    const consequence = machine.buildConsequence();
    store.setConsequencePayload(consequence);
    store.setOverallGrade(consequence.overallGrade);
    store.setPhase(ChallengePhase.CONSEQUENCE);
    store.stopTimer();
  }, [store]);

  const toTeach = useCallback(() => {
    const machine = machineRef.current;
    if (!machine) return;
    machine.enterTeach();
    store.setPhase(ChallengePhase.TEACH);
  }, [store]);

  const toVerify = useCallback(() => {
    const machine = machineRef.current;
    if (!machine) return;
    machine.enterVerify();
    store.setPhase(ChallengePhase.VERIFY);
    store.setIsVerification(true);
    store.startTimer();
  }, [store]);

  const toMastery = useCallback(() => {
    const machine = machineRef.current;
    if (!machine) return;
    machine.completeMastery();
    store.setPhase(ChallengePhase.MASTERY);
    store.stopTimer();
  }, [store]);

  const finish = useCallback(() => {
    const machine = machineRef.current;
    if (!machine) return;
    machine.complete();
    store.setPhase(ChallengePhase.COMPLETED);
  }, [store]);

  const recordHandwash = useCallback(() => {
    const machine = machineRef.current;
    if (!machine) return;
    machine.recordHandwash();
    store.recordHandwash();
  }, [store]);

  const completeTicket = useCallback(
    (ticketId: string) => {
      const machine = machineRef.current;
      if (!machine) return;
      machine.completeTicket(ticketId);
      store.completeTicket();
    },
    [store],
  );

  const addWaste = useCallback(
    (cost: number) => {
      machineRef.current?.addWaste(cost);
      store.addWaste(cost);
    },
    [store],
  );

  const handsDirty = useMemo(() => {
    return machineRef.current?.areHandsDirty(Date.now()) ?? false;
  }, [store.lastHandwashAt, store.timeRemainingMs]); // re-evaluate on tick

  return {
    phase: store.phase,
    timeRemainingMs: store.timeRemainingMs,
    ticketsCompleted: store.ticketsCompleted,
    ticketsTotal: store.ticketsTotal,
    events: store.events,
    infractions: store.infractions,
    infractionCount: store.infractions.length,
    consequence: store.consequencePayload,
    grade: store.overallGrade,
    isVerification: store.isVerification,
    lastHandwashAt: store.lastHandwashAt,
    handsDirty,
    logEvent,
    start,
    endSolve,
    toTeach,
    toVerify,
    toMastery,
    finish,
    recordHandwash,
    completeTicket,
    addWaste,
  };
}
