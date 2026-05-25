/**
 * TopShelf Service LLC - Trigger Detector
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Trigger detection system for "Solve First, Teach Second" pedagogy.
 * Detects when teaching intervention is needed.
 */

import { TriggerType, TeachingContext, TeachingMode, TrialOutcome } from './types.js';

export const ERROR_REPEAT_THRESHOLD = 3;
export const STUCK_TIME_THRESHOLD_MS = 300000; // 5 minutes
const FADE_CONSECUTIVE_PASSES = 3;

export const TriggerDetector = {
  /**
   * Detect triggers based on teaching context.
   *
   * STUCK_DETECTED requires that the learner has actually tried and failed —
   * elapsed time alone is not enough. This preserves "productive struggle":
   * a learner reading or thinking should not be interrupted as stuck.
   */
  detectTriggers(context: TeachingContext): TriggerType[] {
    const triggers: TriggerType[] = [];

    const errorThreshold = context.thresholds?.errorRepeatThreshold ?? ERROR_REPEAT_THRESHOLD;
    const stuckThresholdMs = context.thresholds?.stuckTimeThresholdMs ?? STUCK_TIME_THRESHOLD_MS;

    if (context.errorsEncountered >= errorThreshold) {
      triggers.push(TriggerType.ERROR_REPEATED);
    }

    const timeElapsed = Date.now() - context.sessionStartTime.getTime();
    const elapsedMinutes = Math.max(timeElapsed / 60000, 0.01);
    const progressRate = context.problemsSolved / elapsedMinutes;

    if (timeElapsed > stuckThresholdMs && progressRate < 0.1 && context.errorsEncountered > 0) {
      triggers.push(TriggerType.STUCK_DETECTED);
    }

    if (timeElapsed > stuckThresholdMs) {
      triggers.push(TriggerType.TIME_THRESHOLD);
    }

    return triggers;
  },

  /**
   * Determine if teaching should be triggered based on mode and triggers
   */
  shouldTeach(mode: TeachingMode, triggers: TriggerType[]): boolean {
    switch (mode) {
      case TeachingMode.L0_SILENT:
        return false;

      case TeachingMode.L1_MINIMAL:
        return triggers.includes(TriggerType.HELP_REQUESTED);

      case TeachingMode.L2_CONTEXTUAL:
        return triggers.some(
          (t) =>
            t === TriggerType.ERROR_REPEATED ||
            t === TriggerType.STUCK_DETECTED ||
            t === TriggerType.HELP_REQUESTED
        );

      case TeachingMode.L3_ACTIVE:
        return triggers.length > 0;

      case TeachingMode.L4_TUTORIAL:
        return true;

      default:
        return false;
    }
  },

  /**
   * Suggest mode elevation based on triggers.
   *
   * Only `ERROR_REPEATED` and `STUCK_DETECTED` count as severe. `TIME_THRESHOLD`
   * is a soft signal — passing time alone does not justify forcing a heavier
   * teaching intervention, because doing so interrupts productive struggle.
   */
  suggestModeElevation(currentMode: TeachingMode, triggers: TriggerType[]): TeachingMode {
    if (currentMode >= TeachingMode.L4_TUTORIAL) {
      return currentMode;
    }

    const severeTriggers = triggers.filter(
      (t) => t === TriggerType.ERROR_REPEATED || t === TriggerType.STUCK_DETECTED
    );

    if (severeTriggers.length >= 2 && currentMode < TeachingMode.L3_ACTIVE) {
      return TeachingMode.L3_ACTIVE;
    }

    if (severeTriggers.length >= 1 && currentMode < TeachingMode.L2_CONTEXTUAL) {
      return TeachingMode.L2_CONTEXTUAL;
    }

    return currentMode;
  },

  /**
   * Suggest a fade — move teaching mode one step *down* when the learner has
   * accumulated consecutive clean passes (no help requested, no failures) at
   * the current mode. Mirrors the expertise-reversal correction: once a
   * learner shows competence at a guided mode, the next block should ask more
   * of them.
   *
   * Rules:
   * - Fewer than `FADE_CONSECUTIVE_PASSES` trials → no fade.
   * - Any non-pass or any help request in the most recent window → no fade.
   * - L0_SILENT and L1_MINIMAL never fade automatically (L1 is the floor).
   */
  suggestModeFade(currentMode: TeachingMode, recentTrials: TrialOutcome[]): TeachingMode {
    if (currentMode <= TeachingMode.L1_MINIMAL) {
      return currentMode;
    }

    if (recentTrials.length < FADE_CONSECUTIVE_PASSES) {
      return currentMode;
    }

    const window = recentTrials.slice(-FADE_CONSECUTIVE_PASSES);
    const allClean = window.every((trial) => trial.passed && !trial.helpRequested);

    if (!allClean) {
      return currentMode;
    }

    return currentMode - 1;
  },
};
