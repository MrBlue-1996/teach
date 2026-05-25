import { describe, it, expect } from 'vitest';
import {
  nextSchedule,
  buildAggregateRetentionQueue,
  LEITNER_INTERVALS_DAYS,
  MAX_STAGE,
  type RetentionHistoryEntry,
} from './retention-scheduler.js';

const REF_NOW = new Date('2026-05-23T12:00:00.000Z');

function entry(partial: Partial<RetentionHistoryEntry>): RetentionHistoryEntry {
  return {
    taskId: 'tb-default',
    date: REF_NOW.toISOString(),
    pass: true,
    daysSinceOriginal: 0,
    latencyMs: 1000,
    ...partial,
  };
}

describe('nextSchedule', () => {
  it('advances stage on pass', () => {
    const result = nextSchedule({
      taskId: 'tb-1',
      passed: true,
      helpRequested: false,
      completedAt: REF_NOW,
      history: [],
    });
    expect(result.stage).toBe(1);
    expect(result.intervalDays).toBe(LEITNER_INTERVALS_DAYS[1]);
    expect(result.consecutivePasses).toBe(1);
  });

  it('advances incrementally on consecutive passes', () => {
    let history: RetentionHistoryEntry[] = [];
    for (let i = 1; i <= 5; i++) {
      const result = nextSchedule({
        taskId: 'tb-1',
        passed: true,
        helpRequested: false,
        completedAt: REF_NOW,
        history,
      });
      history = [
        ...history,
        entry({
          taskId: 'tb-1',
          pass: true,
          stage: result.stage,
          consecutivePasses: result.consecutivePasses,
        }),
      ];
      expect(result.stage).toBe(i);
      expect(result.intervalDays).toBe(LEITNER_INTERVALS_DAYS[i]);
    }
  });

  it('caps at MAX_STAGE', () => {
    const history = [entry({ taskId: 'tb-1', stage: MAX_STAGE, consecutivePasses: 10 })];
    const result = nextSchedule({
      taskId: 'tb-1',
      passed: true,
      helpRequested: false,
      completedAt: REF_NOW,
      history,
    });
    expect(result.stage).toBe(MAX_STAGE);
    expect(result.intervalDays).toBe(LEITNER_INTERVALS_DAYS[MAX_STAGE]);
  });

  it('resets stage on fail at any stage', () => {
    const history = [entry({ taskId: 'tb-1', stage: 4, consecutivePasses: 4 })];
    const result = nextSchedule({
      taskId: 'tb-1',
      passed: false,
      helpRequested: false,
      completedAt: REF_NOW,
      history,
    });
    expect(result.stage).toBe(0);
    expect(result.intervalDays).toBe(LEITNER_INTERVALS_DAYS[0]);
    expect(result.consecutivePasses).toBe(0);
  });

  it('pass-with-help holds the stage', () => {
    const history = [entry({ taskId: 'tb-1', stage: 2, consecutivePasses: 2 })];
    const result = nextSchedule({
      taskId: 'tb-1',
      passed: true,
      helpRequested: true,
      completedAt: REF_NOW,
      history,
    });
    expect(result.stage).toBe(2);
    expect(result.intervalDays).toBe(LEITNER_INTERVALS_DAYS[2]);
    expect(result.consecutivePasses).toBe(2);
  });

  it('computes nextReassessAt from completedAt + intervalDays', () => {
    const result = nextSchedule({
      taskId: 'tb-1',
      passed: true,
      helpRequested: false,
      completedAt: REF_NOW,
      history: [],
    });
    const expected = new Date(REF_NOW);
    expected.setUTCDate(expected.getUTCDate() + LEITNER_INTERVALS_DAYS[1]!);
    expect(result.nextReassessAt).toBe(expected.toISOString());
  });

  it('isolates schedule per task', () => {
    const history = [
      entry({ taskId: 'tb-A', stage: 3, consecutivePasses: 3 }),
      entry({ taskId: 'tb-B', stage: 0, consecutivePasses: 0 }),
    ];
    const result = nextSchedule({
      taskId: 'tb-A',
      passed: true,
      helpRequested: false,
      completedAt: REF_NOW,
      history,
    });
    expect(result.stage).toBe(4);
  });
});

describe('buildAggregateRetentionQueue', () => {
  it('returns empty queue when no histories', () => {
    const result = buildAggregateRetentionQueue([], REF_NOW);
    expect(result.dueTaskIds).toEqual([]);
    expect(result.dueCount).toBe(0);
    expect(result.nextDueAt).toBeNull();
  });

  it('includes tasks whose nextReassessAt has passed', () => {
    const past = new Date(REF_NOW.getTime() - 24 * 3600_000).toISOString();
    const history = [entry({ taskId: 'tb-overdue', nextReassessAt: past })];
    const result = buildAggregateRetentionQueue([history], REF_NOW);
    expect(result.dueTaskIds).toContain('tb-overdue');
    expect(result.dueCount).toBe(1);
  });

  it('excludes tasks scheduled in the future, returning earliest as nextDueAt', () => {
    const future = new Date(REF_NOW.getTime() + 2 * 24 * 3600_000).toISOString();
    const history = [entry({ taskId: 'tb-future', nextReassessAt: future })];
    const result = buildAggregateRetentionQueue([history], REF_NOW);
    expect(result.dueTaskIds).toEqual([]);
    expect(result.nextDueAt).toBe(future);
  });

  it('uses the latest record per taskId across multiple histories', () => {
    const past = new Date(REF_NOW.getTime() - 24 * 3600_000).toISOString();
    const future = new Date(REF_NOW.getTime() + 24 * 3600_000).toISOString();
    const histA: RetentionHistoryEntry[] = [
      entry({ taskId: 'tb-X', nextReassessAt: past, date: '2026-05-01T00:00:00Z' }),
      entry({ taskId: 'tb-X', nextReassessAt: future, date: '2026-05-22T00:00:00Z' }),
    ];
    const result = buildAggregateRetentionQueue([histA], REF_NOW);
    // The latest record schedules in the future, so tb-X is NOT due
    expect(result.dueTaskIds).not.toContain('tb-X');
  });

  it('caps results to maxItems', () => {
    const past = new Date(REF_NOW.getTime() - 24 * 3600_000).toISOString();
    const history: RetentionHistoryEntry[] = [];
    for (let i = 0; i < 60; i++) {
      history.push(entry({ taskId: `tb-${i}`, nextReassessAt: past }));
    }
    const result = buildAggregateRetentionQueue([history], REF_NOW, 50);
    expect(result.dueTaskIds.length).toBe(50);
    expect(result.dueCount).toBe(60);
  });
});
