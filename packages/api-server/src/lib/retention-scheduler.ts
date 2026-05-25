/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

/**
 * Leitner-style spaced retrieval scheduler. Pure functions over the existing
 * `learnerStates.retentionHistory` JSON shape — no schema change required.
 *
 * Interval ladder:
 *   stage 0 → 1 day
 *   stage 1 → 3 days
 *   stage 2 → 7 days
 *   stage 3 → 14 days
 *   stage 4 → 30 days
 *   stage 5 → 60 days
 *   stage 6+ → 120 days (capped)
 *
 * Pass advances the stage. Fail resets stage to 0. Help-on-pass holds the
 * stage (does not advance). Half-life is preserved from the source schedule.
 */

export interface RetentionHistoryEntry {
  taskId: string;
  date: string;
  pass: boolean;
  daysSinceOriginal: number;
  latencyMs: number;
  reassessAfterDays?: number;
  decayHalfLifeDays?: number;
  nextReassessAt?: string;
  /** Leitner stage at the time this record was written. Optional for backwards-compat. */
  stage?: number;
  /** Convenience copy of consecutive passes at this task at time of record. */
  consecutivePasses?: number;
}

export const LEITNER_INTERVALS_DAYS: readonly number[] = [1, 3, 7, 14, 30, 60, 120];
export const MAX_STAGE = LEITNER_INTERVALS_DAYS.length - 1;

export interface ScheduleInput {
  taskId: string;
  passed: boolean;
  helpRequested: boolean;
  completedAt: Date;
  decayHalfLifeDays?: number;
  history: readonly RetentionHistoryEntry[];
}

export interface ScheduleOutcome {
  stage: number;
  intervalDays: number;
  nextReassessAt: string;
  consecutivePasses: number;
}

/**
 * Compute the next schedule for a task given the prior history. Pure — does
 * not write to the database.
 */
export function nextSchedule(input: ScheduleInput): ScheduleOutcome {
  const prior = findLatestForTask(input.history, input.taskId);
  const priorStage = prior?.stage ?? 0;
  const priorConsecutive = prior?.consecutivePasses ?? 0;
  const fallbackIntervalDays = LEITNER_INTERVALS_DAYS[MAX_STAGE] ?? 120;

  let stage: number;
  let consecutivePasses: number;

  if (!input.passed) {
    stage = 0;
    consecutivePasses = 0;
  } else if (input.helpRequested) {
    // Pass-with-help: hold the stage, but do not advance the consecutive counter.
    stage = priorStage;
    consecutivePasses = priorConsecutive;
  } else {
    stage = Math.min(MAX_STAGE, priorStage + 1);
    consecutivePasses = priorConsecutive + 1;
  }

  const intervalDays = LEITNER_INTERVALS_DAYS[stage] ?? fallbackIntervalDays;
  const next = new Date(input.completedAt);
  next.setUTCDate(next.getUTCDate() + intervalDays);

  return {
    stage,
    intervalDays,
    nextReassessAt: next.toISOString(),
    consecutivePasses,
  };
}

function findLatestForTask(
  history: readonly RetentionHistoryEntry[],
  taskId: string
): RetentionHistoryEntry | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    if (entry === undefined) {
      continue;
    }

    if (entry.taskId === taskId) {
      return entry;
    }
  }
  return null;
}

/**
 * Aggregate due-task summary across one or more histories. Caps the returned
 * list of due task IDs to `maxItems` to avoid runaway queues.
 */
export function buildAggregateRetentionQueue(
  histories: readonly RetentionHistoryEntry[][],
  now: Date,
  maxItems = 50
): {
  dueTaskIds: string[];
  dueCount: number;
  nextDueAt: string | null;
} {
  // For each task, keep only the latest schedule (newest record wins). Then
  // partition into due (nextAt <= now) and upcoming.
  const latestByTask = new Map<string, Date>();

  for (const history of histories) {
    for (let i = history.length - 1; i >= 0; i--) {
      const record = history[i];
      if (record === undefined) {
        continue;
      }

      if (latestByTask.has(record.taskId)) continue;

      const nextIso = record.nextReassessAt;
      if (nextIso === undefined) {
        // Sentinel: mark this taskId as seen so we don't fall back to an older
        // record (the latest schedule was simply not persisted with nextReassessAt).
        latestByTask.set(record.taskId, new Date(NaN));
        continue;
      }

      const nextAt = new Date(nextIso);
      if (Number.isNaN(nextAt.getTime())) continue;

      latestByTask.set(record.taskId, nextAt);
    }
  }

  const dueByTask = new Map<string, Date>();
  let nextDueAt: Date | null = null;

  for (const [taskId, nextAt] of latestByTask) {
    if (Number.isNaN(nextAt.getTime())) continue;

    if (nextAt.getTime() <= now.getTime()) {
      dueByTask.set(taskId, nextAt);
    } else if (nextDueAt === null || nextAt.getTime() < nextDueAt.getTime()) {
      nextDueAt = nextAt;
    }
  }

  const ordered = Array.from(dueByTask.entries())
    .sort((a, b) => a[1].getTime() - b[1].getTime())
    .slice(0, maxItems)
    .map(([taskId]) => taskId);

  return {
    dueTaskIds: ordered,
    dueCount: dueByTask.size,
    nextDueAt: nextDueAt?.toISOString() ?? null,
  };
}
