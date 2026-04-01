/**
 * Policy Engine Unit Tests (TS-TEST-010)
 *
 * Tests for multi-signal promotion rules and policy evaluation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PolicyEvaluator,
  SignalCollector,
  InMemoryAuditStorage,
  PolicyAuditLogger,
} from '@topshelf/policy-engine';
import type {
  PolicyEvaluationInput,
  SignalValue,
  PromotionPolicy,
  LearnerState,
} from '@topshelf/shared';

describe('PolicyEvaluator', () => {
  let evaluator: PolicyEvaluator;
  let defaultPolicy: PromotionPolicy;

  beforeEach(() => {
    evaluator = new PolicyEvaluator('test-node-1', 'test-signing-key');
    defaultPolicy = {
      policyVersion: '2026-01-21',
      multiSignal: {
        requiredSignals: ['benchmark_passes', 'transfer_score', 'time_efficiency', 'retention'],
        windowMinutes: 1440,
        consecutivePasses: 3,
        transferThreshold: 0.75,
        timePercentileThreshold: 0.6,
        probationTasks: 3,
        rollbackOnFailureRate: 0.4,
      },
    };
  });

  it('should defer when required signals are missing', () => {
    const input: PolicyEvaluationInput = {
      learnerId: 'u-test123',
      domain: 'linux',
      currentMode: 'L2',
      signals: [], // No signals
      policy: defaultPolicy,
      inProbation: false,
      probationTasksCompleted: 0,
    };

    const result = evaluator.evaluate(input);

    expect(result.decision).toBe('defer');
    expect(result.missingSignals).toBeDefined();
    expect(result.missingSignals?.length).toBeGreaterThan(0);
    expect(result.recommendedAction.type).toBe('probe');
  });

  it('should promote when all criteria are met', () => {
    const signals: SignalValue[] = [
      {
        type: 'benchmark_passes',
        value: 5,
        confidence: 0.9,
        measuredAt: new Date().toISOString(),
        evidenceIds: ['ev1', 'ev2', 'ev3', 'ev4', 'ev5'],
      },
      {
        type: 'transfer_score',
        value: 0.85,
        confidence: 0.8,
        measuredAt: new Date().toISOString(),
        evidenceIds: [],
      },
      {
        type: 'time_efficiency',
        value: 0.7,
        confidence: 0.75,
        measuredAt: new Date().toISOString(),
        evidenceIds: [],
      },
      {
        type: 'retention',
        value: 0.9,
        confidence: 0.85,
        measuredAt: new Date().toISOString(),
        evidenceIds: ['ret1'],
      },
    ];

    const input: PolicyEvaluationInput = {
      learnerId: 'u-test123',
      domain: 'linux',
      currentMode: 'L2',
      signals,
      policy: defaultPolicy,
      inProbation: false,
      probationTasksCompleted: 0,
    };

    const result = evaluator.evaluate(input);

    expect(result.decision).toBe('promote');
    expect(result.targetMode).toBe('L3');
    expect(result.contributingSignals.length).toBeGreaterThan(0);
    expect(result.signature).toMatch(/^sig-/);
  });

  it('should hold when criteria are not met', () => {
    const signals: SignalValue[] = [
      {
        type: 'benchmark_passes',
        value: 1, // Below threshold
        confidence: 0.9,
        measuredAt: new Date().toISOString(),
        evidenceIds: ['ev1'],
      },
      {
        type: 'transfer_score',
        value: 0.5, // Below threshold
        confidence: 0.8,
        measuredAt: new Date().toISOString(),
        evidenceIds: [],
      },
      {
        type: 'time_efficiency',
        value: 0.7,
        confidence: 0.75,
        measuredAt: new Date().toISOString(),
        evidenceIds: [],
      },
      {
        type: 'retention',
        value: 0.9,
        confidence: 0.85,
        measuredAt: new Date().toISOString(),
        evidenceIds: [],
      },
    ];

    const input: PolicyEvaluationInput = {
      learnerId: 'u-test123',
      domain: 'linux',
      currentMode: 'L2',
      signals,
      policy: defaultPolicy,
      inProbation: false,
      probationTasksCompleted: 0,
    };

    const result = evaluator.evaluate(input);

    expect(result.decision).toBe('hold');
    expect(result.targetMode).toBeUndefined();
  });

  it('should demote when correctness is very low', () => {
    const signals: SignalValue[] = [
      {
        type: 'benchmark_passes',
        value: 1,
        confidence: 0.9,
        measuredAt: new Date().toISOString(),
        evidenceIds: ['ev1'],
      },
      {
        type: 'transfer_score',
        value: 0.3,
        confidence: 0.8,
        measuredAt: new Date().toISOString(),
        evidenceIds: [],
      },
      {
        type: 'time_efficiency',
        value: 0.7,
        confidence: 0.75,
        measuredAt: new Date().toISOString(),
        evidenceIds: [],
      },
      {
        type: 'retention',
        value: 0.5,
        confidence: 0.85,
        measuredAt: new Date().toISOString(),
        evidenceIds: [],
      },
      {
        type: 'correctness',
        value: 0.2, // Very low
        confidence: 0.9,
        measuredAt: new Date().toISOString(),
        evidenceIds: [],
      },
    ];

    const input: PolicyEvaluationInput = {
      learnerId: 'u-test123',
      domain: 'linux',
      currentMode: 'L3',
      signals,
      policy: defaultPolicy,
      inProbation: false,
      probationTasksCompleted: 0,
    };

    const result = evaluator.evaluate(input);

    expect(result.decision).toBe('demote');
    expect(result.targetMode).toBe('L2');
  });

  it('should handle probation window correctly', () => {
    const signals: SignalValue[] = [
      {
        type: 'benchmark_passes',
        value: 2,
        confidence: 0.9,
        measuredAt: new Date().toISOString(),
        evidenceIds: ['ev1', 'ev2'],
      },
      {
        type: 'transfer_score',
        value: 0.8,
        confidence: 0.8,
        measuredAt: new Date().toISOString(),
        evidenceIds: [],
      },
      {
        type: 'time_efficiency',
        value: 0.7,
        confidence: 0.75,
        measuredAt: new Date().toISOString(),
        evidenceIds: [],
      },
      {
        type: 'retention',
        value: 0.9,
        confidence: 0.85,
        measuredAt: new Date().toISOString(),
        evidenceIds: [],
      },
    ];

    const input: PolicyEvaluationInput = {
      learnerId: 'u-test123',
      domain: 'linux',
      currentMode: 'L3',
      signals,
      policy: defaultPolicy,
      inProbation: true,
      probationTasksCompleted: 2, // Not yet complete
    };

    const result = evaluator.evaluate(input);

    expect(result.decision).toBe('hold');
    expect(result.reasoning).toContain('probation');
  });
});

describe('SignalCollector', () => {
  let collector: SignalCollector;

  beforeEach(() => {
    collector = new SignalCollector();
  });

  it('should collect signals from learner state', () => {
    const learnerState: LearnerState = {
      learnerId: 'u-test123',
      skillEstimates: {
        linux: {
          score: 0.75,
          confidence: 0.1,
          lastUpdated: new Date().toISOString(),
          observationCount: 5,
        },
      },
      timeEfficiency: { medianMs: 90000, cohortPercentile: 0.7, sampleSize: 10 },
      transferScore: 0.8,
      retentionHistory: [
        {
          taskId: 'task1',
          date: new Date().toISOString(),
          pass: true,
          daysSinceOriginal: 7,
          latencyMs: 5000,
        },
        {
          taskId: 'task2',
          date: new Date().toISOString(),
          pass: true,
          daysSinceOriginal: 14,
          latencyMs: 6000,
        },
      ],
      promotionHistory: [],
      lastActivity: new Date().toISOString(),
      currentModes: { linux: 'L2' },
      probationWindows: {},
      masteryScore: {
        composite: 0.7,
        components: {
          transfer: 0.8,
          robustness: 0.7,
          retention: 0.9,
          benchmarkPasses: 0.6,
          timeEfficiency: 0.7,
          explainability: 0.5,
        },
        weights: {
          transfer: 0.25,
          robustness: 0.15,
          retention: 0.2,
          benchmarkPasses: 0.15,
          timeEfficiency: 0.15,
          explainability: 0.1,
        },
      },
    };

    const context = {
      learnerState,
      recentBenchmarks: [],
      recentRetentionChecks: learnerState.retentionHistory,
      windowMinutes: 1440,
    };

    const signals = collector.collectSignals(context);

    expect(signals.length).toBeGreaterThan(0);
    expect(signals.some((s) => s.type === 'transfer_score')).toBe(true);
    expect(signals.some((s) => s.type === 'time_efficiency')).toBe(true);
  });

  it('should check for required signals', () => {
    const signals: SignalValue[] = [
      {
        type: 'benchmark_passes',
        value: 3,
        confidence: 0.8,
        measuredAt: new Date().toISOString(),
        evidenceIds: [],
      },
      {
        type: 'transfer_score',
        value: 0.8,
        confidence: 0.7,
        measuredAt: new Date().toISOString(),
        evidenceIds: [],
      },
    ];

    const requiredSignals = [
      'benchmark_passes',
      'transfer_score',
      'time_efficiency',
      'retention',
    ] as const;
    const result = collector.hasRequiredSignals(signals, requiredSignals);

    expect(result.complete).toBe(false);
    expect(result.missing).toContain('time_efficiency');
    expect(result.missing).toContain('retention');
  });
});

describe('PolicyAuditLogger', () => {
  let logger: PolicyAuditLogger;
  let storage: InMemoryAuditStorage;

  beforeEach(() => {
    storage = new InMemoryAuditStorage();
    logger = new PolicyAuditLogger(storage, 'test-node', 'test-key');
  });

  it('should log policy evaluations', async () => {
    const input: PolicyEvaluationInput = {
      learnerId: 'u-test123',
      domain: 'linux',
      currentMode: 'L2',
      signals: [],
      policy: {
        policyVersion: '2026-01-21',
        multiSignal: {
          requiredSignals: ['benchmark_passes'],
          windowMinutes: 1440,
          consecutivePasses: 3,
          transferThreshold: 0.75,
          timePercentileThreshold: 0.6,
          probationTasks: 3,
          rollbackOnFailureRate: 0.4,
        },
      },
      inProbation: false,
      probationTasksCompleted: 0,
    };

    const output = {
      decision: 'defer' as const,
      reasoning: 'Test',
      contributingSignals: [],
      missingSignals: ['benchmark_passes' as const],
      recommendedAction: { type: 'probe' as const },
      evaluatedAt: new Date().toISOString(),
      signature: 'sig-test',
    };

    const record = await logger.logEvaluation(input, output);

    expect(record.auditId).toMatch(/^audit-/);
    expect(record.input.learnerId).toBe('u-test123');
    expect(record.output.decision).toBe('defer');
    expect(storage.getRecordCount()).toBe(1);
  });

  it('should retrieve learner history', async () => {
    const input: PolicyEvaluationInput = {
      learnerId: 'u-test123',
      domain: 'linux',
      currentMode: 'L2',
      signals: [],
      policy: {
        policyVersion: '2026-01-21',
        multiSignal: {
          requiredSignals: ['benchmark_passes'],
          windowMinutes: 1440,
          consecutivePasses: 3,
          transferThreshold: 0.75,
          timePercentileThreshold: 0.6,
          probationTasks: 3,
          rollbackOnFailureRate: 0.4,
        },
      },
      inProbation: false,
      probationTasksCompleted: 0,
    };

    const output = {
      decision: 'hold' as const,
      reasoning: 'Test',
      contributingSignals: [],
      recommendedAction: { type: 'continue' as const },
      evaluatedAt: new Date().toISOString(),
      signature: 'sig-test',
    };

    await logger.logEvaluation(input, output);
    await logger.logEvaluation(input, output);

    const history = await logger.getLearnerHistory('u-test123');
    expect(history.length).toBe(2);
  });
});
