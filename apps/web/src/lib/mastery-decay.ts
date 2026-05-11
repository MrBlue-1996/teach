/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

export interface RetentionQueueSummary {
  dueTaskIds?: string[];
  dueCount?: number;
  nextDueAt?: string | null;
}

export interface RetentionHistoryEntry {
  taskId: string;
  date: string;
  pass: boolean;
  daysSinceOriginal: number;
  latencyMs: number;
  reassessAfterDays?: number;
  decayHalfLifeDays?: number;
  nextReassessAt?: string;
}

export interface DecayAffordance {
  status: 'healthy' | 'watch' | 'urgent';
  dueCount: number;
  staleCount: number;
  nextDueAt: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_HALF_LIFE_DAYS = 21;

function toValidDate(iso: string | undefined): Date | null {
  if (!iso) return null;
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function computeDecayAffordance(
  queue: RetentionQueueSummary | null | undefined,
  history: RetentionHistoryEntry[] | null | undefined,
  now = new Date()
): DecayAffordance {
  const dueCount = Math.max(0, queue?.dueCount ?? queue?.dueTaskIds?.length ?? 0);
  const nextDueAt = queue?.nextDueAt ?? null;
  const records = Array.isArray(history) ? history : [];

  let staleCount = 0;
  for (const entry of records) {
    const nextReassessAt = toValidDate(entry.nextReassessAt);
    if (nextReassessAt && nextReassessAt.getTime() <= now.getTime()) {
      staleCount += 1;
      continue;
    }

    const baseDate = toValidDate(entry.date);
    if (!baseDate) continue;

    const halfLife = Math.max(1, entry.decayHalfLifeDays ?? DEFAULT_HALF_LIFE_DAYS);
    const ageDays = Math.max(0, Math.floor((now.getTime() - baseDate.getTime()) / DAY_MS));
    if (ageDays > halfLife) {
      staleCount += 1;
    }
  }

  if (dueCount >= 3 || staleCount >= 3) {
    return {
      status: 'urgent',
      dueCount,
      staleCount,
      nextDueAt,
    };
  }

  if (dueCount >= 1 || staleCount >= 1) {
    return {
      status: 'watch',
      dueCount,
      staleCount,
      nextDueAt,
    };
  }

  return {
    status: 'healthy',
    dueCount,
    staleCount,
    nextDueAt,
  };
}

export function formatNextDueLabel(nextDueAt: string | null | undefined, now = new Date()): string {
  const dt = toValidDate(nextDueAt ?? undefined);
  if (!dt) return 'No reassessment scheduled';

  const deltaMs = dt.getTime() - now.getTime();
  const deltaDays = Math.ceil(deltaMs / DAY_MS);

  if (deltaDays <= 0) return 'Due now';
  if (deltaDays === 1) return 'Due in 1 day';
  return `Due in ${deltaDays} days`;
}
