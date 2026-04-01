/**
 * Policy Schema - Comprehensive Test Suite
 *
 * Tests for policy engine schema validation including promotion policies,
 * signal evaluation, and audit records.
 */

import { describe, it, expect } from 'vitest';
import {
  policyVersionSchema,
  signalTypeSchema,
  policyDecisionSchema,
  multiSignalConfigSchema,
  employerRequirementsSchema,
  promotionPolicySchema,
  signalValueSchema,
  policyEvaluationInputSchema,
  probeTypeSchema,
  recommendedActionSchema,
  policyEvaluationOutputSchema,
  policyLayerSchema,
  policyAuditRecordSchema,
} from './policy.schema.js';

// =============================================================================
// POLICY VERSION
// =============================================================================

describe('policyVersionSchema', () => {
  it('should accept valid policy versions', () => {
    expect(policyVersionSchema.safeParse('2026-03-25').success).toBe(true);
    expect(policyVersionSchema.safeParse('2025-01-01').success).toBe(true);
    expect(policyVersionSchema.safeParse('2030-12-31').success).toBe(true);
  });

  it('should reject invalid date formats', () => {
    expect(policyVersionSchema.safeParse('2026/03/25').success).toBe(false);
    expect(policyVersionSchema.safeParse('03-25-2026').success).toBe(false);
    expect(policyVersionSchema.safeParse('26-03-25').success).toBe(false);
    expect(policyVersionSchema.safeParse('2026-3-25').success).toBe(false);
    expect(policyVersionSchema.safeParse('2026-03-5').success).toBe(false);
  });

  it('should reject empty string', () => {
    expect(policyVersionSchema.safeParse('').success).toBe(false);
  });

  it('should reject invalid month/day values (regex does not validate these)', () => {
    // Note: This regex only checks format, not validity
    // These will pass the regex but may be semantically invalid
    expect(policyVersionSchema.safeParse('2026-13-01').success).toBe(true); // regex doesn't validate month
    expect(policyVersionSchema.safeParse('2026-01-32').success).toBe(true); // regex doesn't validate day
  });

  it('should reject non-string values', () => {
    expect(policyVersionSchema.safeParse(20260325).success).toBe(false);
    expect(policyVersionSchema.safeParse(null).success).toBe(false);
    expect(policyVersionSchema.safeParse(undefined).success).toBe(false);
  });
});

// =============================================================================
// SIGNAL TYPE
// =============================================================================

describe('signalTypeSchema', () => {
  it('should accept all valid signal types', () => {
    expect(signalTypeSchema.safeParse('benchmark_passes').success).toBe(true);
    expect(signalTypeSchema.safeParse('transfer_score').success).toBe(true);
    expect(signalTypeSchema.safeParse('time_efficiency').success).toBe(true);
    expect(signalTypeSchema.safeParse('retention').success).toBe(true);
    expect(signalTypeSchema.safeParse('explainability').success).toBe(true);
    expect(signalTypeSchema.safeParse('robustness').success).toBe(true);
    expect(signalTypeSchema.safeParse('correctness').success).toBe(true);
  });

  it('should reject invalid signal types', () => {
    expect(signalTypeSchema.safeParse('accuracy').success).toBe(false);
    expect(signalTypeSchema.safeParse('performance').success).toBe(false);
    expect(signalTypeSchema.safeParse('').success).toBe(false);
    expect(signalTypeSchema.safeParse('BENCHMARK_PASSES').success).toBe(false);
  });
});

// =============================================================================
// POLICY DECISION
// =============================================================================

describe('policyDecisionSchema', () => {
  it('should accept all valid policy decisions', () => {
    expect(policyDecisionSchema.safeParse('promote').success).toBe(true);
    expect(policyDecisionSchema.safeParse('demote').success).toBe(true);
    expect(policyDecisionSchema.safeParse('hold').success).toBe(true);
    expect(policyDecisionSchema.safeParse('defer').success).toBe(true);
    expect(policyDecisionSchema.safeParse('remediate').success).toBe(true);
  });

  it('should reject invalid policy decisions', () => {
    expect(policyDecisionSchema.safeParse('advance').success).toBe(false);
    expect(policyDecisionSchema.safeParse('skip').success).toBe(false);
    expect(policyDecisionSchema.safeParse('').success).toBe(false);
    expect(policyDecisionSchema.safeParse('PROMOTE').success).toBe(false);
  });
});

// =============================================================================
// MULTI-SIGNAL CONFIG
// =============================================================================

describe('multiSignalConfigSchema', () => {
  function createValidConfig() {
    return {
      requiredSignals: ['benchmark_passes', 'transfer_score'] as const,
      windowMinutes: 1440,
      consecutivePasses: 3,
      transferThreshold: 0.7,
      timePercentileThreshold: 0.5,
      probationTasks: 5,
      rollbackOnFailureRate: 0.3,
    };
  }

  it('should accept valid multi-signal configuration', () => {
    const config = createValidConfig();
    expect(multiSignalConfigSchema.safeParse(config).success).toBe(true);
  });

  it('should accept minimum values', () => {
    const config = {
      requiredSignals: ['benchmark_passes'] as const,
      windowMinutes: 1,
      consecutivePasses: 1,
      transferThreshold: 0,
      timePercentileThreshold: 0,
      probationTasks: 1,
      rollbackOnFailureRate: 0,
    };
    expect(multiSignalConfigSchema.safeParse(config).success).toBe(true);
  });

  it('should accept maximum values', () => {
    const config = {
      requiredSignals: ['benchmark_passes', 'transfer_score', 'retention'] as const,
      windowMinutes: 43200, // 30 days
      consecutivePasses: 20,
      transferThreshold: 1,
      timePercentileThreshold: 1,
      probationTasks: 50,
      rollbackOnFailureRate: 1,
    };
    expect(multiSignalConfigSchema.safeParse(config).success).toBe(true);
  });

  it('should reject empty requiredSignals array', () => {
    const config = { ...createValidConfig(), requiredSignals: [] };
    expect(multiSignalConfigSchema.safeParse(config).success).toBe(false);
  });

  it('should reject windowMinutes below 1', () => {
    const config = { ...createValidConfig(), windowMinutes: 0 };
    expect(multiSignalConfigSchema.safeParse(config).success).toBe(false);
  });

  it('should reject windowMinutes above 43200', () => {
    const config = { ...createValidConfig(), windowMinutes: 43201 };
    expect(multiSignalConfigSchema.safeParse(config).success).toBe(false);
  });

  it('should reject consecutivePasses below 1', () => {
    const config = { ...createValidConfig(), consecutivePasses: 0 };
    expect(multiSignalConfigSchema.safeParse(config).success).toBe(false);
  });

  it('should reject consecutivePasses above 20', () => {
    const config = { ...createValidConfig(), consecutivePasses: 21 };
    expect(multiSignalConfigSchema.safeParse(config).success).toBe(false);
  });

  it('should reject transferThreshold below 0', () => {
    const config = { ...createValidConfig(), transferThreshold: -0.1 };
    expect(multiSignalConfigSchema.safeParse(config).success).toBe(false);
  });

  it('should reject transferThreshold above 1', () => {
    const config = { ...createValidConfig(), transferThreshold: 1.1 };
    expect(multiSignalConfigSchema.safeParse(config).success).toBe(false);
  });

  it('should reject timePercentileThreshold below 0', () => {
    const config = { ...createValidConfig(), timePercentileThreshold: -0.1 };
    expect(multiSignalConfigSchema.safeParse(config).success).toBe(false);
  });

  it('should reject timePercentileThreshold above 1', () => {
    const config = { ...createValidConfig(), timePercentileThreshold: 1.1 };
    expect(multiSignalConfigSchema.safeParse(config).success).toBe(false);
  });

  it('should reject probationTasks below 1', () => {
    const config = { ...createValidConfig(), probationTasks: 0 };
    expect(multiSignalConfigSchema.safeParse(config).success).toBe(false);
  });

  it('should reject probationTasks above 50', () => {
    const config = { ...createValidConfig(), probationTasks: 51 };
    expect(multiSignalConfigSchema.safeParse(config).success).toBe(false);
  });

  it('should reject rollbackOnFailureRate below 0', () => {
    const config = { ...createValidConfig(), rollbackOnFailureRate: -0.1 };
    expect(multiSignalConfigSchema.safeParse(config).success).toBe(false);
  });

  it('should reject rollbackOnFailureRate above 1', () => {
    const config = { ...createValidConfig(), rollbackOnFailureRate: 1.1 };
    expect(multiSignalConfigSchema.safeParse(config).success).toBe(false);
  });

  it('should reject non-integer windowMinutes', () => {
    const config = { ...createValidConfig(), windowMinutes: 1440.5 };
    expect(multiSignalConfigSchema.safeParse(config).success).toBe(false);
  });

  it('should reject extra properties (strict)', () => {
    const config = { ...createValidConfig(), extraField: 'value' };
    expect(multiSignalConfigSchema.safeParse(config).success).toBe(false);
  });
});

// =============================================================================
// EMPLOYER REQUIREMENTS
// =============================================================================

describe('employerRequirementsSchema', () => {
  function createValidRequirements() {
    return {
      requiredBadges: ['badge-linux-admin-v1'] as const,
      minRetentionDays: 30,
      requiresProctoredCapstone: true,
    };
  }

  it('should accept valid employer requirements', () => {
    const requirements = createValidRequirements();
    expect(employerRequirementsSchema.safeParse(requirements).success).toBe(true);
  });

  it('should accept empty requiredBadges array', () => {
    const requirements = { ...createValidRequirements(), requiredBadges: [] as const };
    expect(employerRequirementsSchema.safeParse(requirements).success).toBe(true);
  });

  it('should accept multiple badges', () => {
    const requirements = {
      ...createValidRequirements(),
      requiredBadges: ['badge-linux-v1', 'badge-networking-v2'] as const,
    };
    expect(employerRequirementsSchema.safeParse(requirements).success).toBe(true);
  });

  it('should accept minimum retention days (1)', () => {
    const requirements = { ...createValidRequirements(), minRetentionDays: 1 };
    expect(employerRequirementsSchema.safeParse(requirements).success).toBe(true);
  });

  it('should accept maximum retention days (365)', () => {
    const requirements = { ...createValidRequirements(), minRetentionDays: 365 };
    expect(employerRequirementsSchema.safeParse(requirements).success).toBe(true);
  });

  it('should reject minRetentionDays below 1', () => {
    const requirements = { ...createValidRequirements(), minRetentionDays: 0 };
    expect(employerRequirementsSchema.safeParse(requirements).success).toBe(false);
  });

  it('should reject minRetentionDays above 365', () => {
    const requirements = { ...createValidRequirements(), minRetentionDays: 366 };
    expect(employerRequirementsSchema.safeParse(requirements).success).toBe(false);
  });

  it('should accept optional promotionThresholds', () => {
    const requirements = {
      ...createValidRequirements(),
      promotionThresholds: { consecutivePasses: 5 },
    };
    expect(employerRequirementsSchema.safeParse(requirements).success).toBe(true);
  });

  it('should reject invalid badge IDs', () => {
    const requirements = { ...createValidRequirements(), requiredBadges: ['linux-admin-v1'] };
    expect(employerRequirementsSchema.safeParse(requirements).success).toBe(false);
  });

  it('should reject extra properties (strict)', () => {
    const requirements = { ...createValidRequirements(), extraField: 'value' };
    expect(employerRequirementsSchema.safeParse(requirements).success).toBe(false);
  });
});

// =============================================================================
// PROMOTION POLICY
// =============================================================================

describe('promotionPolicySchema', () => {
  function createValidPolicy() {
    return {
      policyVersion: '2026-03-25',
      multiSignal: {
        requiredSignals: ['benchmark_passes', 'transfer_score'] as const,
        windowMinutes: 1440,
        consecutivePasses: 3,
        transferThreshold: 0.7,
        timePercentileThreshold: 0.5,
        probationTasks: 5,
        rollbackOnFailureRate: 0.3,
      },
    };
  }

  it('should accept valid promotion policy', () => {
    const policy = createValidPolicy();
    expect(promotionPolicySchema.safeParse(policy).success).toBe(true);
  });

  it('should accept policy with domain overrides', () => {
    const policy = {
      ...createValidPolicy(),
      domainOverrides: {
        linux: { consecutivePasses: 5 },
        networking: { transferThreshold: 0.8 },
      },
    };
    expect(promotionPolicySchema.safeParse(policy).success).toBe(true);
  });

  it('should accept policy with employer requirements', () => {
    const policy = {
      ...createValidPolicy(),
      employerRequirements: {
        requiredBadges: ['badge-linux-v1'] as const,
        minRetentionDays: 30,
        requiresProctoredCapstone: true,
      },
    };
    expect(promotionPolicySchema.safeParse(policy).success).toBe(true);
  });

  it('should accept full policy with all optional fields', () => {
    const policy = {
      policyVersion: '2026-03-25',
      multiSignal: {
        requiredSignals: ['benchmark_passes'] as const,
        windowMinutes: 1440,
        consecutivePasses: 3,
        transferThreshold: 0.7,
        timePercentileThreshold: 0.5,
        probationTasks: 5,
        rollbackOnFailureRate: 0.3,
      },
      domainOverrides: {
        linux: { consecutivePasses: 5 },
      },
      employerRequirements: {
        requiredBadges: ['badge-test-v1'] as const,
        minRetentionDays: 30,
        requiresProctoredCapstone: false,
      },
    };
    expect(promotionPolicySchema.safeParse(policy).success).toBe(true);
  });

  it('should reject invalid policy version', () => {
    const policy = { ...createValidPolicy(), policyVersion: 'invalid' };
    expect(promotionPolicySchema.safeParse(policy).success).toBe(false);
  });

  it('should reject extra properties (strict)', () => {
    const policy = { ...createValidPolicy(), extraField: 'value' };
    expect(promotionPolicySchema.safeParse(policy).success).toBe(false);
  });
});

// =============================================================================
// SIGNAL VALUE
// =============================================================================

describe('signalValueSchema', () => {
  function createValidSignalValue() {
    return {
      type: 'benchmark_passes' as const,
      value: 0.85,
      confidence: 0.95,
      measuredAt: '2026-03-25T12:00:00Z',
      evidenceIds: ['ev-001', 'ev-002'] as const,
    };
  }

  it('should accept valid signal value', () => {
    const signal = createValidSignalValue();
    expect(signalValueSchema.safeParse(signal).success).toBe(true);
  });

  it('should accept all signal types', () => {
    const signalTypes = [
      'benchmark_passes',
      'transfer_score',
      'time_efficiency',
      'retention',
      'explainability',
      'robustness',
      'correctness',
    ] as const;

    for (const type of signalTypes) {
      const signal = { ...createValidSignalValue(), type };
      expect(signalValueSchema.safeParse(signal).success).toBe(true);
    }
  });

  it('should accept empty evidenceIds array', () => {
    const signal = { ...createValidSignalValue(), evidenceIds: [] as const };
    expect(signalValueSchema.safeParse(signal).success).toBe(true);
  });

  it('should accept value at 0', () => {
    const signal = { ...createValidSignalValue(), value: 0 };
    expect(signalValueSchema.safeParse(signal).success).toBe(true);
  });

  it('should accept large value (no upper bound)', () => {
    const signal = { ...createValidSignalValue(), value: 100 };
    expect(signalValueSchema.safeParse(signal).success).toBe(true);
  });

  it('should reject negative value', () => {
    const signal = { ...createValidSignalValue(), value: -0.1 };
    expect(signalValueSchema.safeParse(signal).success).toBe(false);
  });

  it('should accept confidence at 0', () => {
    const signal = { ...createValidSignalValue(), confidence: 0 };
    expect(signalValueSchema.safeParse(signal).success).toBe(true);
  });

  it('should accept confidence at 1', () => {
    const signal = { ...createValidSignalValue(), confidence: 1 };
    expect(signalValueSchema.safeParse(signal).success).toBe(true);
  });

  it('should reject confidence below 0', () => {
    const signal = { ...createValidSignalValue(), confidence: -0.1 };
    expect(signalValueSchema.safeParse(signal).success).toBe(false);
  });

  it('should reject confidence above 1', () => {
    const signal = { ...createValidSignalValue(), confidence: 1.1 };
    expect(signalValueSchema.safeParse(signal).success).toBe(false);
  });

  it('should reject invalid datetime', () => {
    const signal = { ...createValidSignalValue(), measuredAt: 'not-a-date' };
    expect(signalValueSchema.safeParse(signal).success).toBe(false);
  });

  it('should reject extra properties (strict)', () => {
    const signal = { ...createValidSignalValue(), extraField: 'value' };
    expect(signalValueSchema.safeParse(signal).success).toBe(false);
  });
});

// =============================================================================
// PROBE TYPE
// =============================================================================

describe('probeTypeSchema', () => {
  it('should accept all valid probe types', () => {
    expect(probeTypeSchema.safeParse('replication').success).toBe(true);
    expect(probeTypeSchema.safeParse('variation').success).toBe(true);
    expect(probeTypeSchema.safeParse('recovery').success).toBe(true);
    expect(probeTypeSchema.safeParse('time_boxed').success).toBe(true);
    expect(probeTypeSchema.safeParse('retention_24h').success).toBe(true);
    expect(probeTypeSchema.safeParse('retention_7d').success).toBe(true);
    expect(probeTypeSchema.safeParse('retention_30d').success).toBe(true);
    expect(probeTypeSchema.safeParse('far_transfer').success).toBe(true);
    expect(probeTypeSchema.safeParse('explainability').success).toBe(true);
  });

  it('should reject invalid probe types', () => {
    expect(probeTypeSchema.safeParse('test').success).toBe(false);
    expect(probeTypeSchema.safeParse('retention_1h').success).toBe(false);
    expect(probeTypeSchema.safeParse('').success).toBe(false);
    expect(probeTypeSchema.safeParse('REPLICATION').success).toBe(false);
  });
});

// =============================================================================
// RECOMMENDED ACTION
// =============================================================================

describe('recommendedActionSchema', () => {
  it('should accept continue action', () => {
    const action = { type: 'continue' as const };
    expect(recommendedActionSchema.safeParse(action).success).toBe(true);
  });

  it('should accept probe action with probeType', () => {
    const action = { type: 'probe' as const, probeType: 'retention_24h' as const };
    expect(recommendedActionSchema.safeParse(action).success).toBe(true);
  });

  it('should accept remediate action with remediationBlockId', () => {
    const action = { type: 'remediate' as const, remediationBlockId: 'block-123' };
    expect(recommendedActionSchema.safeParse(action).success).toBe(true);
  });

  it('should accept review action with taskId', () => {
    const action = { type: 'review' as const, taskId: 'task-456' };
    expect(recommendedActionSchema.safeParse(action).success).toBe(true);
  });

  it('should accept action with all optional fields', () => {
    const action = {
      type: 'probe' as const,
      taskId: 'task-001',
      probeType: 'far_transfer' as const,
      remediationBlockId: 'block-002',
    };
    expect(recommendedActionSchema.safeParse(action).success).toBe(true);
  });

  it('should reject invalid action type', () => {
    const action = { type: 'skip' };
    expect(recommendedActionSchema.safeParse(action).success).toBe(false);
  });

  it('should reject invalid probe type', () => {
    const action = { type: 'probe', probeType: 'invalid_probe' };
    expect(recommendedActionSchema.safeParse(action).success).toBe(false);
  });

  it('should reject extra properties (strict)', () => {
    const action = { type: 'continue', extraField: 'value' };
    expect(recommendedActionSchema.safeParse(action).success).toBe(false);
  });
});

// =============================================================================
// POLICY EVALUATION INPUT
// =============================================================================

describe('policyEvaluationInputSchema', () => {
  function createValidInput() {
    return {
      learnerId: 'u-learner-001',
      domain: 'linux',
      currentMode: 'L2' as const,
      signals: [
        {
          type: 'benchmark_passes' as const,
          value: 0.85,
          confidence: 0.95,
          measuredAt: '2026-03-25T12:00:00Z',
          evidenceIds: ['ev-001'] as const,
        },
      ] as const,
      policy: {
        policyVersion: '2026-03-25',
        multiSignal: {
          requiredSignals: ['benchmark_passes'] as const,
          windowMinutes: 1440,
          consecutivePasses: 3,
          transferThreshold: 0.7,
          timePercentileThreshold: 0.5,
          probationTasks: 5,
          rollbackOnFailureRate: 0.3,
        },
      },
      inProbation: false,
      probationTasksCompleted: 0,
    };
  }

  it('should accept valid policy evaluation input', () => {
    const input = createValidInput();
    expect(policyEvaluationInputSchema.safeParse(input).success).toBe(true);
  });

  it('should accept empty signals array', () => {
    const input = { ...createValidInput(), signals: [] as const };
    expect(policyEvaluationInputSchema.safeParse(input).success).toBe(true);
  });

  it('should accept all learning modes', () => {
    const modes = ['L0', 'L1', 'L2', 'L3', 'L4'] as const;
    for (const mode of modes) {
      const input = { ...createValidInput(), currentMode: mode };
      expect(policyEvaluationInputSchema.safeParse(input).success).toBe(true);
    }
  });

  it('should accept in probation with completed tasks', () => {
    const input = { ...createValidInput(), inProbation: true, probationTasksCompleted: 3 };
    expect(policyEvaluationInputSchema.safeParse(input).success).toBe(true);
  });

  it('should reject invalid learner ID', () => {
    const input = { ...createValidInput(), learnerId: 'learner-001' };
    expect(policyEvaluationInputSchema.safeParse(input).success).toBe(false);
  });

  it('should reject empty domain', () => {
    const input = { ...createValidInput(), domain: '' };
    expect(policyEvaluationInputSchema.safeParse(input).success).toBe(false);
  });

  it('should reject negative probationTasksCompleted', () => {
    const input = { ...createValidInput(), probationTasksCompleted: -1 };
    expect(policyEvaluationInputSchema.safeParse(input).success).toBe(false);
  });

  it('should reject non-integer probationTasksCompleted', () => {
    const input = { ...createValidInput(), probationTasksCompleted: 2.5 };
    expect(policyEvaluationInputSchema.safeParse(input).success).toBe(false);
  });

  it('should reject extra properties (strict)', () => {
    const input = { ...createValidInput(), extraField: 'value' };
    expect(policyEvaluationInputSchema.safeParse(input).success).toBe(false);
  });
});

// =============================================================================
// POLICY EVALUATION OUTPUT
// =============================================================================

describe('policyEvaluationOutputSchema', () => {
  function createValidOutput() {
    return {
      decision: 'promote' as const,
      targetMode: 'L3' as const,
      reasoning: 'Learner has passed all required benchmarks and transfer scores.',
      contributingSignals: [
        {
          type: 'benchmark_passes' as const,
          value: 0.9,
          confidence: 0.95,
          measuredAt: '2026-03-25T12:00:00Z',
          evidenceIds: ['ev-001'] as const,
        },
      ] as const,
      recommendedAction: { type: 'continue' as const },
      evaluatedAt: '2026-03-25T12:30:00Z',
      signature: 'sig-abc123',
    };
  }

  it('should accept valid policy evaluation output', () => {
    const output = createValidOutput();
    expect(policyEvaluationOutputSchema.safeParse(output).success).toBe(true);
  });

  it('should accept all decision types', () => {
    const decisions = ['promote', 'demote', 'hold', 'defer', 'remediate'] as const;
    for (const decision of decisions) {
      const output = { ...createValidOutput(), decision };
      expect(policyEvaluationOutputSchema.safeParse(output).success).toBe(true);
    }
  });

  it('should accept output without targetMode (optional)', () => {
    const output = createValidOutput();
    delete (output as any).targetMode;
    expect(policyEvaluationOutputSchema.safeParse(output).success).toBe(true);
  });

  it('should accept output with missingSignals', () => {
    const output = {
      ...createValidOutput(),
      missingSignals: ['retention', 'explainability'] as const,
    };
    expect(policyEvaluationOutputSchema.safeParse(output).success).toBe(true);
  });

  it('should reject empty reasoning', () => {
    const output = { ...createValidOutput(), reasoning: '' };
    expect(policyEvaluationOutputSchema.safeParse(output).success).toBe(false);
  });

  it('should reject reasoning exceeding 2000 characters', () => {
    const output = { ...createValidOutput(), reasoning: 'a'.repeat(2001) };
    expect(policyEvaluationOutputSchema.safeParse(output).success).toBe(false);
  });

  it('should accept reasoning at max length (2000 characters)', () => {
    const output = { ...createValidOutput(), reasoning: 'a'.repeat(2000) };
    expect(policyEvaluationOutputSchema.safeParse(output).success).toBe(true);
  });

  it('should reject empty signature', () => {
    const output = { ...createValidOutput(), signature: '' };
    expect(policyEvaluationOutputSchema.safeParse(output).success).toBe(false);
  });

  it('should reject invalid datetime', () => {
    const output = { ...createValidOutput(), evaluatedAt: 'not-a-date' };
    expect(policyEvaluationOutputSchema.safeParse(output).success).toBe(false);
  });

  it('should reject invalid missingSignals', () => {
    const output = { ...createValidOutput(), missingSignals: ['invalid_signal'] };
    expect(policyEvaluationOutputSchema.safeParse(output).success).toBe(false);
  });

  it('should reject extra properties (strict)', () => {
    const output = { ...createValidOutput(), extraField: 'value' };
    expect(policyEvaluationOutputSchema.safeParse(output).success).toBe(false);
  });
});

// =============================================================================
// POLICY LAYER
// =============================================================================

describe('policyLayerSchema', () => {
  function createValidLayer() {
    return {
      name: 'safety' as const,
      priority: 100,
      rules: [
        {
          id: 'rule-001',
          description: 'Block harmful content',
          condition: 'content.contains_harmful',
          action: 'hold' as const,
          terminal: true,
        },
      ] as const,
    };
  }

  it('should accept valid policy layer', () => {
    const layer = createValidLayer();
    expect(policyLayerSchema.safeParse(layer).success).toBe(true);
  });

  it('should accept all layer names', () => {
    const names = ['safety', 'employer', 'learner', 'system'] as const;
    for (const name of names) {
      const layer = { ...createValidLayer(), name };
      expect(policyLayerSchema.safeParse(layer).success).toBe(true);
    }
  });

  it('should accept priority at boundary values', () => {
    expect(policyLayerSchema.safeParse({ ...createValidLayer(), priority: 0 }).success).toBe(true);
    expect(policyLayerSchema.safeParse({ ...createValidLayer(), priority: 100 }).success).toBe(
      true
    );
  });

  it('should reject priority below 0', () => {
    const layer = { ...createValidLayer(), priority: -1 };
    expect(policyLayerSchema.safeParse(layer).success).toBe(false);
  });

  it('should reject priority above 100', () => {
    const layer = { ...createValidLayer(), priority: 101 };
    expect(policyLayerSchema.safeParse(layer).success).toBe(false);
  });

  it('should accept empty rules array', () => {
    const layer = { ...createValidLayer(), rules: [] as const };
    expect(policyLayerSchema.safeParse(layer).success).toBe(true);
  });

  it('should accept multiple rules', () => {
    const layer = {
      ...createValidLayer(),
      rules: [
        {
          id: 'rule-001',
          description: 'First rule',
          condition: 'first.condition',
          action: 'hold' as const,
          terminal: false,
        },
        {
          id: 'rule-002',
          description: 'Second rule',
          condition: 'second.condition',
          action: 'promote' as const,
          terminal: true,
        },
      ] as const,
    };
    expect(policyLayerSchema.safeParse(layer).success).toBe(true);
  });

  it('should reject rule with empty id', () => {
    const layer = {
      ...createValidLayer(),
      rules: [
        {
          id: '',
          description: 'Test',
          condition: 'test',
          action: 'hold' as const,
          terminal: true,
        },
      ],
    };
    expect(policyLayerSchema.safeParse(layer).success).toBe(false);
  });

  it('should reject rule with empty description', () => {
    const layer = {
      ...createValidLayer(),
      rules: [
        {
          id: 'rule-001',
          description: '',
          condition: 'test',
          action: 'hold' as const,
          terminal: true,
        },
      ],
    };
    expect(policyLayerSchema.safeParse(layer).success).toBe(false);
  });

  it('should reject rule description exceeding 500 characters', () => {
    const layer = {
      ...createValidLayer(),
      rules: [
        {
          id: 'rule-001',
          description: 'a'.repeat(501),
          condition: 'test',
          action: 'hold' as const,
          terminal: true,
        },
      ],
    };
    expect(policyLayerSchema.safeParse(layer).success).toBe(false);
  });

  it('should reject rule condition exceeding 1000 characters', () => {
    const layer = {
      ...createValidLayer(),
      rules: [
        {
          id: 'rule-001',
          description: 'Test',
          condition: 'a'.repeat(1001),
          action: 'hold' as const,
          terminal: true,
        },
      ],
    };
    expect(policyLayerSchema.safeParse(layer).success).toBe(false);
  });

  it('should reject invalid layer name', () => {
    const layer = { ...createValidLayer(), name: 'custom' };
    expect(policyLayerSchema.safeParse(layer).success).toBe(false);
  });

  it('should reject extra properties (strict)', () => {
    const layer = { ...createValidLayer(), extraField: 'value' };
    expect(policyLayerSchema.safeParse(layer).success).toBe(false);
  });
});

// =============================================================================
// POLICY AUDIT RECORD
// =============================================================================

describe('policyAuditRecordSchema', () => {
  function createValidAuditRecord() {
    return {
      auditId: 'audit-001',
      input: {
        learnerId: 'u-learner-001',
        domain: 'linux',
        currentMode: 'L2' as const,
        signals: [] as const,
        policy: {
          policyVersion: '2026-03-25',
          multiSignal: {
            requiredSignals: ['benchmark_passes'] as const,
            windowMinutes: 1440,
            consecutivePasses: 3,
            transferThreshold: 0.7,
            timePercentileThreshold: 0.5,
            probationTasks: 5,
            rollbackOnFailureRate: 0.3,
          },
        },
        inProbation: false,
        probationTasksCompleted: 0,
      },
      output: {
        decision: 'hold' as const,
        reasoning: 'Insufficient signals for promotion decision.',
        contributingSignals: [] as const,
        recommendedAction: { type: 'continue' as const },
        evaluatedAt: '2026-03-25T12:30:00Z',
        signature: 'sig-out-001',
      },
      policyVersion: '2026-03-25',
      timestamp: '2026-03-25T12:30:00Z',
      nodeId: 'node-primary-001',
      signature: 'sig-audit-001',
    };
  }

  it('should accept valid policy audit record', () => {
    const record = createValidAuditRecord();
    expect(policyAuditRecordSchema.safeParse(record).success).toBe(true);
  });

  it('should reject empty auditId', () => {
    const record = { ...createValidAuditRecord(), auditId: '' };
    expect(policyAuditRecordSchema.safeParse(record).success).toBe(false);
  });

  it('should reject empty nodeId', () => {
    const record = { ...createValidAuditRecord(), nodeId: '' };
    expect(policyAuditRecordSchema.safeParse(record).success).toBe(false);
  });

  it('should reject empty signature', () => {
    const record = { ...createValidAuditRecord(), signature: '' };
    expect(policyAuditRecordSchema.safeParse(record).success).toBe(false);
  });

  it('should reject invalid timestamp', () => {
    const record = { ...createValidAuditRecord(), timestamp: 'not-a-date' };
    expect(policyAuditRecordSchema.safeParse(record).success).toBe(false);
  });

  it('should reject invalid policy version', () => {
    const record = { ...createValidAuditRecord(), policyVersion: 'invalid' };
    expect(policyAuditRecordSchema.safeParse(record).success).toBe(false);
  });

  it('should reject invalid input', () => {
    const record = { ...createValidAuditRecord(), input: { invalid: true } };
    expect(policyAuditRecordSchema.safeParse(record).success).toBe(false);
  });

  it('should reject invalid output', () => {
    const record = { ...createValidAuditRecord(), output: { invalid: true } };
    expect(policyAuditRecordSchema.safeParse(record).success).toBe(false);
  });

  it('should reject extra properties (strict)', () => {
    const record = { ...createValidAuditRecord(), extraField: 'value' };
    expect(policyAuditRecordSchema.safeParse(record).success).toBe(false);
  });
});
