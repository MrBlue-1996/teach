/**
 * Schema unit tests for the v0.1 additions.
 *
 * One accept + one reject per major shape. For triggerRuleSchema:
 * one accept per variant + one cross-variant reject.
 *
 * If your repo already has a content.schema.test.ts, append these
 * describe blocks rather than overwrite.
 */

import { describe, it, expect } from 'vitest';
import {
  contentLinksSchema,
  deviceConstraintsSchema,
  triggerRuleSchema,
  retentionSchema,
} from './content.schema.js';

describe('contentLinksSchema', () => {
  it('accepts a fully populated valid links block', () => {
    const result = contentLinksSchema.safeParse({
      sourceModuleId: 'MD6-orientation-safety',
      fundamentalsTaught: ['FT5-safety-first'],
      fundamentalsReinforced: ['FT5-communication'],
      downtimeDecisions: [],
      chaosEvents: ['CE9-quality-check'],
      externalAssessmentId: 'AS7-orientation-check',
      ticketFlows: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects malformed sourceModuleId', () => {
    const result = contentLinksSchema.safeParse({
      sourceModuleId: 'not-a-valid-id',
      fundamentalsTaught: [],
      fundamentalsReinforced: [],
      downtimeDecisions: [],
      chaosEvents: [],
      externalAssessmentId: null,
      ticketFlows: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = contentLinksSchema.safeParse({
      sourceModuleId: 'MD6-x',
      fundamentalsTaught: [],
      fundamentalsReinforced: [],
      downtimeDecisions: [],
      chaosEvents: [],
      externalAssessmentId: null,
      ticketFlows: [],
      bonus: 'unexpected',
    });
    expect(result.success).toBe(false);
  });
});

describe('deviceConstraintsSchema', () => {
  it('accepts a realistic value', () => {
    expect(deviceConstraintsSchema.safeParse({ maxResponseChars: 2000 }).success).toBe(true);
  });

  it('rejects values below 200', () => {
    expect(deviceConstraintsSchema.safeParse({ maxResponseChars: 100 }).success).toBe(false);
  });

  it('rejects values above 50000', () => {
    expect(deviceConstraintsSchema.safeParse({ maxResponseChars: 100000 }).success).toBe(false);
  });
});

describe('retentionSchema', () => {
  it('accepts a realistic value', () => {
    const result = retentionSchema.safeParse({
      reassessAfterDays: 30,
      decayHalfLifeDays: 21,
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero days', () => {
    const result = retentionSchema.safeParse({
      reassessAfterDays: 0,
      decayHalfLifeDays: 21,
    });
    expect(result.success).toBe(false);
  });
});

describe('triggerRuleSchema (discriminated union)', () => {
  it('accepts stuck_time variant', () => {
    expect(
      triggerRuleSchema.safeParse({ type: 'stuck_time', thresholdSeconds: 30 }).success,
    ).toBe(true);
  });

  it('accepts repeated_errors variant', () => {
    expect(
      triggerRuleSchema.safeParse({ type: 'repeated_errors', threshold: 1 }).success,
    ).toBe(true);
  });

  it('accepts help_requested variant', () => {
    expect(
      triggerRuleSchema.safeParse({ type: 'help_requested', enabled: true }).success,
    ).toBe(true);
  });

  it('accepts idle_drop variant', () => {
    expect(
      triggerRuleSchema.safeParse({ type: 'idle_drop', thresholdDays: 7 }).success,
    ).toBe(true);
  });

  it('accepts frequency_decline variant', () => {
    expect(
      triggerRuleSchema.safeParse({
        type: 'frequency_decline',
        baselineDays: 14,
        declineRatio: 0.5,
      }).success,
    ).toBe(true);
  });

  it('rejects help_requested with cross-variant field "threshold"', () => {
    expect(
      triggerRuleSchema.safeParse({ type: 'help_requested', threshold: 5 }).success,
    ).toBe(false);
  });

  it('rejects stuck_time with thresholdSeconds below 15', () => {
    expect(
      triggerRuleSchema.safeParse({ type: 'stuck_time', thresholdSeconds: 5 }).success,
    ).toBe(false);
  });

  it('rejects stuck_time with thresholdSeconds above 600', () => {
    expect(
      triggerRuleSchema.safeParse({ type: 'stuck_time', thresholdSeconds: 1000 }).success,
    ).toBe(false);
  });
});
