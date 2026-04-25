/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Teaching engine microbenchmarks.
 *
 * Purpose: catch latency regressions in the hot-path decision loop.
 * Every learner event flows through detectTriggers → shouldTeach →
 * processTeachingRequest. A 2× slowdown here means 2× worse P99 on the
 * /teach endpoint under load.
 *
 * Run:  pnpm --filter @topshelf/engine bench
 * CI:   pnpm --filter @topshelf/engine bench --reporter=json
 */

import { bench, describe } from 'vitest';
import { TriggerDetector } from './trigger-detector.js';
import { ConstraintEngine } from './constraint-engine.js';
import { PedagogyEngine } from './pedagogy-engine.js';
import { TeachingMode, DeviceProfile, TriggerType, type TeachingContext } from './types.js';

// ---------------------------------------------------------------------------
// Fixtures — built once, reused across all bench iterations to avoid
// measuring object-allocation overhead in the fixtures themselves.
// ---------------------------------------------------------------------------

function ctx(overrides: Partial<TeachingContext> = {}): TeachingContext {
  return {
    mode: TeachingMode.L2_CONTEXTUAL,
    deviceProfile: DeviceProfile.CHROMEBOOK_STANDARD,
    constraints: ConstraintEngine.getConstraints(DeviceProfile.CHROMEBOOK_STANDARD),
    triggers: [],
    sessionStartTime: new Date(),
    problemsSolved: 0,
    errorsEncountered: 0,
    ...overrides,
  };
}

// Pre-built contexts — frozen so V8 can optimise the hidden-class layout
const CTX_CLEAN = ctx();
const CTX_ERRORS = ctx({ errorsEncountered: 5 });
const CTX_STUCK = ctx({
  sessionStartTime: new Date(Date.now() - 7 * 60 * 1000),
  problemsSolved: 0,
});
const CTX_HELP = ctx({ triggers: [TriggerType.HELP_REQUESTED] });
const CTX_L0 = ctx({ mode: TeachingMode.L0_SILENT });
const CTX_L4 = ctx({ mode: TeachingMode.L4_TUTORIAL });

// Content fixtures at meaningful size boundaries
const CONTENT_SHORT = 'Use a for-loop to iterate the array.';
const CONTENT_MEDIUM = 'A'.repeat(10_000);
const CONTENT_AT_CHROMEBOOK_LIMIT = 'A'.repeat(100_000); // just under CHROMEBOOK_STANDARD cap
const CONTENT_OVER_CHROMEBOOK_LIMIT = 'A'.repeat(110_000); // triggers truncation

// ---------------------------------------------------------------------------
// TriggerDetector — called on every learner progress event
// ---------------------------------------------------------------------------

describe('TriggerDetector', () => {
  bench('detectTriggers — no triggers (clean session)', () => {
    TriggerDetector.detectTriggers(CTX_CLEAN);
  });

  bench('detectTriggers — ERROR_REPEATED fires', () => {
    TriggerDetector.detectTriggers(CTX_ERRORS);
  });

  bench('detectTriggers — STUCK + TIME_THRESHOLD fire', () => {
    TriggerDetector.detectTriggers(CTX_STUCK);
  });

  bench('shouldTeach — L0_SILENT (always false, early exit)', () => {
    TriggerDetector.shouldTeach(TeachingMode.L0_SILENT, CTX_ERRORS.triggers);
  });

  bench('shouldTeach — L2_CONTEXTUAL with ERROR_REPEATED trigger', () => {
    TriggerDetector.shouldTeach(TeachingMode.L2_CONTEXTUAL, [TriggerType.ERROR_REPEATED]);
  });

  bench('shouldTeach — L4_TUTORIAL (always true, early exit)', () => {
    TriggerDetector.shouldTeach(TeachingMode.L4_TUTORIAL, []);
  });

  bench('suggestModeElevation — no change needed', () => {
    TriggerDetector.suggestModeElevation(TeachingMode.L4_TUTORIAL, [TriggerType.ERROR_REPEATED]);
  });

  bench('suggestModeElevation — elevation candidate', () => {
    TriggerDetector.suggestModeElevation(TeachingMode.L1_MINIMAL, [
      TriggerType.ERROR_REPEATED,
      TriggerType.STUCK_DETECTED,
      TriggerType.HELP_REQUESTED,
    ]);
  });
});

// ---------------------------------------------------------------------------
// ConstraintEngine — called on every teaching response
// ---------------------------------------------------------------------------

describe('ConstraintEngine', () => {
  bench('getConstraints — CHROMEBOOK_LOW (tightest budget)', () => {
    ConstraintEngine.getConstraints(DeviceProfile.CHROMEBOOK_LOW);
  });

  bench('getConstraints — DESKTOP_HIGH (largest budget)', () => {
    ConstraintEngine.getConstraints(DeviceProfile.DESKTOP_HIGH);
  });

  bench('isSuggestionSuitable — short content, CHROMEBOOK_LOW', () => {
    ConstraintEngine.isSuggestionSuitable(CONTENT_SHORT, DeviceProfile.CHROMEBOOK_LOW);
  });

  bench('isSuggestionSuitable — medium content, CHROMEBOOK_STANDARD', () => {
    ConstraintEngine.isSuggestionSuitable(CONTENT_MEDIUM, DeviceProfile.CHROMEBOOK_STANDARD);
  });

  bench('isSuggestionSuitable — content at Chromebook limit', () => {
    ConstraintEngine.isSuggestionSuitable(
      CONTENT_AT_CHROMEBOOK_LIMIT,
      DeviceProfile.CHROMEBOOK_STANDARD
    );
  });

  bench('isSuggestionSuitable — content over limit (rejected)', () => {
    ConstraintEngine.isSuggestionSuitable(
      CONTENT_OVER_CHROMEBOOK_LIMIT,
      DeviceProfile.CHROMEBOOK_STANDARD
    );
  });

  bench('filterSuggestion — short content (no truncation)', () => {
    ConstraintEngine.filterSuggestion(CONTENT_SHORT, DeviceProfile.CHROMEBOOK_STANDARD);
  });

  bench('filterSuggestion — content requires truncation', () => {
    ConstraintEngine.filterSuggestion(
      CONTENT_OVER_CHROMEBOOK_LIMIT,
      DeviceProfile.CHROMEBOOK_STANDARD
    );
  });

  bench('filterSuggestion — DESKTOP_HIGH (no limits, passthrough)', () => {
    ConstraintEngine.filterSuggestion(CONTENT_MEDIUM, DeviceProfile.DESKTOP_HIGH);
  });
});

// ---------------------------------------------------------------------------
// PedagogyEngine — full pipeline, the most expensive path per request
// ---------------------------------------------------------------------------

describe('PedagogyEngine.processTeachingRequest', () => {
  bench('pipeline — L0_SILENT (early exit, no teach)', () => {
    PedagogyEngine.processTeachingRequest(CTX_L0, CONTENT_SHORT);
  });

  bench('pipeline — L2_CONTEXTUAL, no triggers (no teach)', () => {
    PedagogyEngine.processTeachingRequest(CTX_CLEAN, CONTENT_SHORT);
  });

  bench('pipeline — L2_CONTEXTUAL, HELP_REQUESTED, short content', () => {
    PedagogyEngine.processTeachingRequest(CTX_HELP, CONTENT_SHORT);
  });

  bench('pipeline — L4_TUTORIAL, always teaches, short content', () => {
    PedagogyEngine.processTeachingRequest(CTX_L4, CONTENT_SHORT);
  });

  bench('pipeline — L4_TUTORIAL, medium content, CHROMEBOOK_STANDARD', () => {
    PedagogyEngine.processTeachingRequest(CTX_L4, CONTENT_MEDIUM);
  });

  bench('pipeline — L4_TUTORIAL, over-limit content (truncated)', () => {
    PedagogyEngine.processTeachingRequest(
      ctx({ mode: TeachingMode.L4_TUTORIAL }),
      CONTENT_OVER_CHROMEBOOK_LIMIT
    );
  });

  bench('pipeline — L4_TUTORIAL, DESKTOP_HIGH (no constraints)', () => {
    PedagogyEngine.processTeachingRequest(
      ctx({
        mode: TeachingMode.L4_TUTORIAL,
        deviceProfile: DeviceProfile.DESKTOP_HIGH,
        constraints: ConstraintEngine.getConstraints(DeviceProfile.DESKTOP_HIGH),
      }),
      CONTENT_MEDIUM
    );
  });

  bench('pipeline — full trigger set, L3_ACTIVE, Chromebook', () => {
    PedagogyEngine.processTeachingRequest(
      ctx({
        mode: TeachingMode.L3_ACTIVE,
        errorsEncountered: 5,
        sessionStartTime: new Date(Date.now() - 8 * 60 * 1000),
        problemsSolved: 0,
        triggers: [TriggerType.ERROR_REPEATED, TriggerType.STUCK_DETECTED],
      }),
      CONTENT_MEDIUM
    );
  });
});
