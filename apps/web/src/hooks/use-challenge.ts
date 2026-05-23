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
  const phase = useChallengeStore((state) => state.phase);
  const timeRemainingMs = useChallengeStore((state) => state.timeRemainingMs);
  const ticketsCompleted = useChallengeStore((state) => state.ticketsCompleted);
  const ticketsTotal = useChallengeStore((state) => state.ticketsTotal);
  const events = useChallengeStore((state) => state.events);
  const infractions = useChallengeStore((state) => state.infractions);
  const consequencePayload = useChallengeStore((state) => state.consequencePayload);
  const overallGrade = useChallengeStore((state) => state.overallGrade);
  const isVerification = useChallengeStore((state) => state.isVerification);
  const lastHandwashAt = useChallengeStore((state) => state.lastHandwashAt);
  const isTimerRunning = useChallengeStore((state) => state.isTimerRunning);
  const initChallenge = useChallengeStore((state) => state.initChallenge);
  const setPhase = useChallengeStore((state) => state.setPhase);
  const addEvent = useChallengeStore((state) => state.addEvent);
  const addInfraction = useChallengeStore((state) => state.addInfraction);
  const addWasteToStore = useChallengeStore((state) => state.addWaste);
  const recordHandwashInStore = useChallengeStore((state) => state.recordHandwash);
  const completeTicketInStore = useChallengeStore((state) => state.completeTicket);
  const tick = useChallengeStore((state) => state.tick);
  const setConsequencePayload = useChallengeStore((state) => state.setConsequencePayload);
  const setOverallGrade = useChallengeStore((state) => state.setOverallGrade);
  const setIsVerification = useChallengeStore((state) => state.setIsVerification);
  const incrementFailures = useChallengeStore((state) => state.incrementFailures);
  const startTimer = useChallengeStore((state) => state.startTimer);
  const stopTimer = useChallengeStore((state) => state.stopTimer);

  const machineRef = useRef<ChallengeMachine | null>(null);
  const validatorRef = useRef<ShadowValidator | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  // Initialize engine once per config id
  useEffect(() => {
    if (!config) return;
    if (machineRef.current?.getConfig().id === config.id) return;

    machineRef.current = new ChallengeMachine(config);
    validatorRef.current = new ShadowValidator(
      config.availableIngredients ?? [],
      config.expertRecipe?.steps?.map((s) => s.id) ?? [],
      config.stationLayout?.maxCapacity ?? 8
    );
    initChallenge(config);
  }, [config, initChallenge]);

  // Tick timer during SOLVE / VERIFY
  useEffect(() => {
    const isActive =
      isTimerRunning && (phase === ChallengePhase.SOLVE || phase === ChallengePhase.VERIFY);

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
      tick(delta);

      // Periodic sanitation / spoilage checks
      const periodic = validator.runPeriodicChecks(machine.getState());
      for (const inf of periodic) {
        machine.addInfraction(inf);
        addInfraction(inf);
      }

      // Auto-transition when timer hits zero
      const currentState = machine.getState();
      if (currentState.timeRemainingMs === 0) {
        stopTimer();
        // Sync phase from machine — it may have auto-transitioned
        if (currentState.phase === ChallengePhase.CONSEQUENCE) {
          const consequence = machine.buildConsequence();
          setConsequencePayload(consequence);
          setOverallGrade(consequence.overallGrade);
          setPhase(ChallengePhase.CONSEQUENCE);
        } else if (currentState.phase === ChallengePhase.COOLDOWN) {
          setPhase(ChallengePhase.COOLDOWN);
        }
      }
    }, TICK_MS);

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [
    addInfraction,
    isTimerRunning,
    phase,
    setConsequencePayload,
    setOverallGrade,
    setPhase,
    stopTimer,
    tick,
  ]);

  // --- Actions exposed to the UI ---

  const logEvent = useCallback(
    (type: EventType, data: Record<string, unknown> = {}) => {
      const machine = machineRef.current;
      const validator = validatorRef.current;
      if (!machine || !validator) return;

      const event: ChallengeEvent = machine.recordEvent(type, data);
      addEvent(event);

      const infractions = validator.evaluate(event, machine.getState());
      for (const inf of infractions) {
        machine.addInfraction(inf);
        addInfraction(inf);
      }
    },
    [addEvent, addInfraction]
  );

  const start = useCallback(() => {
    const machine = machineRef.current;
    if (!machine) return;
    machine.startSolve();
    setPhase(ChallengePhase.SOLVE);
    startTimer();
  }, [setPhase, startTimer]);

  const endSolve = useCallback(() => {
    const machine = machineRef.current;
    if (!machine) return;
    const nextState = machine.endSolve();
    stopTimer();
    if (nextState.phase === ChallengePhase.COOLDOWN) {
      setPhase(ChallengePhase.COOLDOWN);
      incrementFailures();
      return;
    }
    const consequence = machine.buildConsequence();
    setConsequencePayload(consequence);
    setOverallGrade(consequence.overallGrade);
    setPhase(ChallengePhase.CONSEQUENCE);
  }, [incrementFailures, setConsequencePayload, setOverallGrade, setPhase, stopTimer]);

  const toTeach = useCallback(() => {
    const machine = machineRef.current;
    if (!machine) return;
    machine.enterTeach();
    setPhase(ChallengePhase.TEACH);
  }, [setPhase]);

  const toVerify = useCallback(() => {
    const machine = machineRef.current;
    if (!machine) return;
    machine.enterVerify();
    setPhase(ChallengePhase.VERIFY);
    setIsVerification(true);
    startTimer();
  }, [setIsVerification, setPhase, startTimer]);

  const toMastery = useCallback(() => {
    const machine = machineRef.current;
    if (!machine) return;
    machine.completeMastery();
    setPhase(ChallengePhase.MASTERY);
    stopTimer();
  }, [setPhase, stopTimer]);

  const finish = useCallback(() => {
    const machine = machineRef.current;
    if (!machine) return;
    machine.complete();
    setPhase(ChallengePhase.COMPLETED);
  }, [setPhase]);

  const recordHandwash = useCallback(() => {
    const machine = machineRef.current;
    if (!machine) return;
    machine.recordHandwash();
    recordHandwashInStore();
  }, [recordHandwashInStore]);

  const completeTicket = useCallback(
    (ticketId: string) => {
      const machine = machineRef.current;
      if (!machine) return;
      machine.completeTicket(ticketId);
      completeTicketInStore();
    },
    [completeTicketInStore]
  );

  const addWaste = useCallback(
    (cost: number) => {
      machineRef.current?.addWaste(cost);
      addWasteToStore(cost);
    },
    [addWasteToStore]
  );

  const handsDirty = useMemo(() => {
    return machineRef.current?.areHandsDirty(Date.now()) ?? false;
  }, [lastHandwashAt, timeRemainingMs]); // re-evaluate on tick

  return {
    phase,
    timeRemainingMs,
    ticketsCompleted,
    ticketsTotal,
    events,
    infractions,
    infractionCount: infractions.length,
    consequence: consequencePayload,
    grade: overallGrade,
    isVerification,
    lastHandwashAt,
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
