/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { describe, expect, it } from 'vitest';
import { computeDecayAffordance, formatNextDueLabel } from './mastery-decay';

describe('mastery-decay', () => {
  const now = new Date('2026-05-10T12:00:00.000Z');

  it('returns healthy when no due or stale entries exist', () => {
    const result = computeDecayAffordance(
      { dueCount: 0, dueTaskIds: [], nextDueAt: '2026-05-20T12:00:00.000Z' },
      [
        {
          taskId: 'block-1',
          date: '2026-05-09T12:00:00.000Z',
          pass: true,
          daysSinceOriginal: 0,
          latencyMs: 1000,
          decayHalfLifeDays: 21,
          reassessAfterDays: 7,
          nextReassessAt: '2026-05-16T12:00:00.000Z',
        },
      ],
      now
    );

    expect(result.status).toBe('healthy');
    expect(result.dueCount).toBe(0);
    expect(result.staleCount).toBe(0);
  });

  it('returns watch when at least one due item exists', () => {
    const result = computeDecayAffordance(
      { dueCount: 1, dueTaskIds: ['block-2'], nextDueAt: '2026-05-11T12:00:00.000Z' },
      [],
      now
    );

    expect(result.status).toBe('watch');
    expect(result.dueCount).toBe(1);
  });

  it('returns urgent when due count crosses threshold', () => {
    const result = computeDecayAffordance(
      { dueCount: 3, dueTaskIds: ['a', 'b', 'c'], nextDueAt: '2026-05-10T12:00:00.000Z' },
      [],
      now
    );

    expect(result.status).toBe('urgent');
  });

  it('counts stale entries via half-life when queue is empty', () => {
    const result = computeDecayAffordance(
      { dueCount: 0, dueTaskIds: [], nextDueAt: null },
      [
        {
          taskId: 'block-old',
          date: '2026-04-01T12:00:00.000Z',
          pass: true,
          daysSinceOriginal: 0,
          latencyMs: 1000,
          decayHalfLifeDays: 7,
        },
      ],
      now
    );

    expect(result.status).toBe('watch');
    expect(result.staleCount).toBe(1);
  });

  it('formats next due labels deterministically', () => {
    expect(formatNextDueLabel('2026-05-10T12:00:00.000Z', now)).toBe('Due now');
    expect(formatNextDueLabel('2026-05-11T12:00:00.000Z', now)).toBe('Due in 1 day');
    expect(formatNextDueLabel('2026-05-13T12:00:00.000Z', now)).toBe('Due in 3 days');
    expect(formatNextDueLabel(undefined, now)).toBe('No reassessment scheduled');
  });
});
