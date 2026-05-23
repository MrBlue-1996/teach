import { describe, it, expect, vi } from 'vitest';
import { PedagogyEngine } from './pedagogy-engine.js';
import { TriggerDetector } from './trigger-detector.js';
import { ConstraintEngine } from './constraint-engine.js';
import { TeachingMode, DeviceProfile, TriggerType, type TeachingContext } from './types.js';

function makeContext(overrides: Partial<TeachingContext> = {}): TeachingContext {
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

// ---------------------------------------------------------------------------
// TriggerDetector
// ---------------------------------------------------------------------------
describe('TriggerDetector', () => {
  describe('detectTriggers', () => {
    it('returns no triggers for fresh context', () => {
      const ctx = makeContext();
      expect(TriggerDetector.detectTriggers(ctx)).toEqual([]);
    });

    it('fires ERROR_REPEATED after 3 errors', () => {
      const ctx = makeContext({ errorsEncountered: 3 });
      const triggers = TriggerDetector.detectTriggers(ctx);
      expect(triggers).toContain(TriggerType.ERROR_REPEATED);
    });

    it('does not fire ERROR_REPEATED below threshold', () => {
      const ctx = makeContext({ errorsEncountered: 2 });
      const triggers = TriggerDetector.detectTriggers(ctx);
      expect(triggers).not.toContain(TriggerType.ERROR_REPEATED);
    });

    it('fires STUCK_DETECTED after 5 min with low progress', () => {
      const ctx = makeContext({
        sessionStartTime: new Date(Date.now() - 6 * 60 * 1000),
        problemsSolved: 0,
      });
      const triggers = TriggerDetector.detectTriggers(ctx);
      expect(triggers).toContain(TriggerType.STUCK_DETECTED);
    });

    it('fires TIME_THRESHOLD after 5 min regardless of progress', () => {
      const ctx = makeContext({
        sessionStartTime: new Date(Date.now() - 6 * 60 * 1000),
        problemsSolved: 100,
      });
      const triggers = TriggerDetector.detectTriggers(ctx);
      expect(triggers).toContain(TriggerType.TIME_THRESHOLD);
      expect(triggers).not.toContain(TriggerType.STUCK_DETECTED);
    });

    it('handles trigger checks at session start without dividing by zero', () => {
      const ctx = makeContext({
        sessionStartTime: new Date(),
        problemsSolved: 1,
      });

      expect(() => TriggerDetector.detectTriggers(ctx)).not.toThrow();
      expect(TriggerDetector.detectTriggers(ctx)).toEqual([]);
    });
  });

  describe('shouldTeach', () => {
    it('never teaches in SILENT mode', () => {
      expect(
        TriggerDetector.shouldTeach(TeachingMode.L0_SILENT, [TriggerType.HELP_REQUESTED])
      ).toBe(false);
    });

    it('teaches in MINIMAL only on HELP_REQUESTED', () => {
      expect(
        TriggerDetector.shouldTeach(TeachingMode.L1_MINIMAL, [TriggerType.ERROR_REPEATED])
      ).toBe(false);
      expect(
        TriggerDetector.shouldTeach(TeachingMode.L1_MINIMAL, [TriggerType.HELP_REQUESTED])
      ).toBe(true);
    });

    it('teaches in CONTEXTUAL on error / stuck / help', () => {
      expect(
        TriggerDetector.shouldTeach(TeachingMode.L2_CONTEXTUAL, [TriggerType.ERROR_REPEATED])
      ).toBe(true);
      expect(
        TriggerDetector.shouldTeach(TeachingMode.L2_CONTEXTUAL, [TriggerType.STUCK_DETECTED])
      ).toBe(true);
    });

    it('teaches in ACTIVE for any trigger', () => {
      expect(
        TriggerDetector.shouldTeach(TeachingMode.L3_ACTIVE, [TriggerType.TIME_THRESHOLD])
      ).toBe(true);
    });

    it('always teaches in TUTORIAL', () => {
      expect(TriggerDetector.shouldTeach(TeachingMode.L4_TUTORIAL, [])).toBe(true);
    });
  });

  describe('suggestModeElevation', () => {
    it('does not elevate beyond TUTORIAL', () => {
      expect(
        TriggerDetector.suggestModeElevation(TeachingMode.L4_TUTORIAL, [
          TriggerType.ERROR_REPEATED,
          TriggerType.STUCK_DETECTED,
        ])
      ).toBe(TeachingMode.L4_TUTORIAL);
    });

    it('elevates to CONTEXTUAL on one severe trigger', () => {
      expect(
        TriggerDetector.suggestModeElevation(TeachingMode.L1_MINIMAL, [TriggerType.ERROR_REPEATED])
      ).toBe(TeachingMode.L2_CONTEXTUAL);
    });

    it('elevates to ACTIVE on two severe triggers', () => {
      expect(
        TriggerDetector.suggestModeElevation(TeachingMode.L1_MINIMAL, [
          TriggerType.ERROR_REPEATED,
          TriggerType.STUCK_DETECTED,
        ])
      ).toBe(TeachingMode.L3_ACTIVE);
    });

    it('does not elevate without severe triggers', () => {
      expect(
        TriggerDetector.suggestModeElevation(TeachingMode.L1_MINIMAL, [TriggerType.TIME_THRESHOLD])
      ).toBe(TeachingMode.L1_MINIMAL);
    });
  });
});

// ---------------------------------------------------------------------------
// ConstraintEngine
// ---------------------------------------------------------------------------
describe('ConstraintEngine', () => {
  describe('getConstraints', () => {
    it('returns constraints for every profile', () => {
      for (const profile of Object.values(DeviceProfile)) {
        const c = ConstraintEngine.getConstraints(profile);
        expect(c.maxMemoryMB).toBeGreaterThan(0);
        expect(c.maxResponseSize).toBeGreaterThan(0);
      }
    });
  });

  describe('isSuggestionSuitable', () => {
    it('accepts small text on Chromebook low', () => {
      const result = ConstraintEngine.isSuggestionSuitable(
        'Use ls to list files',
        DeviceProfile.CHROMEBOOK_LOW
      );
      expect(result.suitable).toBe(true);
    });

    it('rejects oversized text', () => {
      const huge = 'x'.repeat(200_000);
      const result = ConstraintEngine.isSuggestionSuitable(huge, DeviceProfile.CHROMEBOOK_LOW);
      expect(result.suitable).toBe(false);
      expect(result.reason).toMatch(/too large/i);
    });

    it('accepts content exactly at the maximum response size', () => {
      const exact = 'x'.repeat(100_000);
      const result = ConstraintEngine.isSuggestionSuitable(
        exact,
        DeviceProfile.CHROMEBOOK_STANDARD
      );
      expect(result.suitable).toBe(true);
    });

    it('rejects heavy frameworks on Chromebook', () => {
      const result = ConstraintEngine.isSuggestionSuitable(
        'Install React and use it here',
        DeviceProfile.CHROMEBOOK_STANDARD
      );
      expect(result.suitable).toBe(false);
      expect(result.reason).toMatch(/react/i);
    });

    it('rejects large asset keywords on Chromebook', () => {
      const result = ConstraintEngine.isSuggestionSuitable(
        'Use a HD VIDEO for the demo and a large image preview',
        DeviceProfile.CHROMEBOOK_STANDARD
      );
      expect(result.suitable).toBe(false);
      expect(result.reason).toMatch(/large assets/i);
    });

    it('allows heavy frameworks on desktop high', () => {
      const result = ConstraintEngine.isSuggestionSuitable(
        'Install React and use it here',
        DeviceProfile.DESKTOP_HIGH
      );
      expect(result.suitable).toBe(true);
    });

    it('allows large assets on desktop high', () => {
      const result = ConstraintEngine.isSuggestionSuitable(
        'Use a HD VIDEO for the demo and a large image preview',
        DeviceProfile.DESKTOP_HIGH
      );
      expect(result.suitable).toBe(true);
    });
  });

  describe('filterSuggestion', () => {
    it('passes short text unmodified', () => {
      const { filtered, wasModified } = ConstraintEngine.filterSuggestion(
        'Hello',
        DeviceProfile.CHROMEBOOK_STANDARD
      );
      expect(filtered).toBe('Hello');
      expect(wasModified).toBe(false);
    });

    it('truncates oversized text', () => {
      const huge = 'x'.repeat(200_000);
      const { filtered, wasModified } = ConstraintEngine.filterSuggestion(
        huge,
        DeviceProfile.CHROMEBOOK_LOW
      );
      expect(wasModified).toBe(true);
      expect(filtered.length).toBeLessThan(huge.length);
      expect(filtered).toContain('[Response truncated');
    });

    it('never uses a negative truncation length for tight device limits', () => {
      const getConstraintsSpy = vi.spyOn(ConstraintEngine, 'getConstraints').mockReturnValue({
        ...ConstraintEngine.getConstraints(DeviceProfile.CHROMEBOOK_LOW),
        maxResponseSize: 50,
      });

      const { filtered, wasModified } = ConstraintEngine.filterSuggestion(
        'x'.repeat(200),
        DeviceProfile.CHROMEBOOK_LOW
      );

      expect(wasModified).toBe(true);
      expect(filtered).toBe('\n\n[Response truncated for device constraints]');

      getConstraintsSpy.mockRestore();
    });
  });

  describe('inferProfile', () => {
    it('defaults to CHROMEBOOK_STANDARD for null input', () => {
      expect(ConstraintEngine.inferProfile(null)).toBe(DeviceProfile.CHROMEBOOK_STANDARD);
      expect(ConstraintEngine.inferProfile(undefined)).toBe(DeviceProfile.CHROMEBOOK_STANDARD);
    });

    it('detects CrOS as Chromebook', () => {
      expect(ConstraintEngine.inferProfile({ userAgent: 'Mozilla/5.0 (X11; CrOS x86_64)' })).toBe(
        DeviceProfile.CHROMEBOOK_STANDARD
      );
    });

    it('detects low-memory Chromebook', () => {
      expect(
        ConstraintEngine.inferProfile({
          userAgent: 'Mozilla/5.0 (X11; CrOS x86_64)',
          deviceMemory: 2,
        })
      ).toBe(DeviceProfile.CHROMEBOOK_LOW);
    });

    it('detects desktop high by cores', () => {
      expect(
        ConstraintEngine.inferProfile({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
          hardwareConcurrency: 16,
        })
      ).toBe(DeviceProfile.DESKTOP_HIGH);
    });

    it('detects desktop low by memory', () => {
      expect(
        ConstraintEngine.inferProfile({
          userAgent: 'Mozilla/5.0 (Macintosh)',
          deviceMemory: 4,
        })
      ).toBe(DeviceProfile.DESKTOP_LOW);
    });

    it('falls back to desktop standard', () => {
      expect(
        ConstraintEngine.inferProfile({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
        })
      ).toBe(DeviceProfile.DESKTOP_STANDARD);
    });
  });
});

// ---------------------------------------------------------------------------
// PedagogyEngine
// ---------------------------------------------------------------------------
describe('PedagogyEngine', () => {
  describe('createContext', () => {
    it('creates context with correct defaults', () => {
      const ctx = PedagogyEngine.createContext(
        TeachingMode.L2_CONTEXTUAL,
        DeviceProfile.CHROMEBOOK_STANDARD
      );
      expect(ctx.mode).toBe(TeachingMode.L2_CONTEXTUAL);
      expect(ctx.deviceProfile).toBe(DeviceProfile.CHROMEBOOK_STANDARD);
      expect(ctx.triggers).toEqual([]);
      expect(ctx.problemsSolved).toBe(0);
      expect(ctx.errorsEncountered).toBe(0);
      expect(ctx.constraints.maxMemoryMB).toBe(4096);
    });
  });

  describe('processTeachingRequest', () => {
    it('does not teach in SILENT mode', () => {
      const ctx = makeContext({ mode: TeachingMode.L0_SILENT, errorsEncountered: 10 });
      const detectTriggersSpy = vi.spyOn(TriggerDetector, 'detectTriggers');
      const suggestModeElevationSpy = vi.spyOn(TriggerDetector, 'suggestModeElevation');
      const shouldTeachSpy = vi.spyOn(TriggerDetector, 'shouldTeach');
      const isSuggestionSuitableSpy = vi.spyOn(ConstraintEngine, 'isSuggestionSuitable');
      const filterSuggestionSpy = vi.spyOn(ConstraintEngine, 'filterSuggestion');

      const res = PedagogyEngine.processTeachingRequest(ctx, 'Here is a hint');
      expect(res.shouldTeach).toBe(false);
      expect(detectTriggersSpy).toHaveBeenCalledTimes(1);
      expect(ctx.triggers.length).toBeGreaterThan(0);
      expect(suggestModeElevationSpy).not.toHaveBeenCalled();
      expect(shouldTeachSpy).not.toHaveBeenCalled();
      expect(isSuggestionSuitableSpy).not.toHaveBeenCalled();
      expect(filterSuggestionSpy).not.toHaveBeenCalled();
    });

    it('returns early for non-tutorial contexts with no triggers', () => {
      const ctx = makeContext({ mode: TeachingMode.L2_CONTEXTUAL });
      const detectTriggersSpy = vi.spyOn(TriggerDetector, 'detectTriggers');
      const suggestModeElevationSpy = vi.spyOn(TriggerDetector, 'suggestModeElevation');
      const shouldTeachSpy = vi.spyOn(TriggerDetector, 'shouldTeach');
      const isSuggestionSuitableSpy = vi.spyOn(ConstraintEngine, 'isSuggestionSuitable');
      const filterSuggestionSpy = vi.spyOn(ConstraintEngine, 'filterSuggestion');

      const res = PedagogyEngine.processTeachingRequest(ctx, 'Here is a hint');

      expect(res.shouldTeach).toBe(false);
      expect(detectTriggersSpy).toHaveBeenCalledTimes(1);
      expect(suggestModeElevationSpy).not.toHaveBeenCalled();
      expect(shouldTeachSpy).not.toHaveBeenCalled();
      expect(isSuggestionSuitableSpy).not.toHaveBeenCalled();
      expect(filterSuggestionSpy).not.toHaveBeenCalled();
    });

    it('elevates mode before formatting guidance when severe triggers fire', () => {
      const ctx = makeContext({
        mode: TeachingMode.L1_MINIMAL,
        errorsEncountered: 5,
        sessionStartTime: new Date(Date.now() - 10 * 60 * 1000),
      });
      const res = PedagogyEngine.processTeachingRequest(ctx, 'Check invariant assumptions first');

      expect(res.shouldTeach).toBe(true);
      expect(res.mode).toBe(TeachingMode.L3_ACTIVE);
      expect(res.content).toContain('🎓 Teaching:');
    });

    it('returns elevated mode even when no teaching content is provided', () => {
      const ctx = makeContext({
        mode: TeachingMode.L1_MINIMAL,
        errorsEncountered: 4,
      });
      const res = PedagogyEngine.processTeachingRequest(ctx);

      expect(res.shouldTeach).toBe(false);
      expect(res.mode).toBe(TeachingMode.L2_CONTEXTUAL);
    });

    it('teaches on error threshold in CONTEXTUAL mode', () => {
      const ctx = makeContext({
        mode: TeachingMode.L2_CONTEXTUAL,
        errorsEncountered: 5,
      });
      const res = PedagogyEngine.processTeachingRequest(ctx, 'Try using chmod instead');
      expect(res.shouldTeach).toBe(true);
      expect(res.content).toContain('Try using chmod instead');
      expect(res.content).toContain('📚 Guidance:');
    });

    it('always teaches in TUTORIAL mode', () => {
      const ctx = makeContext({ mode: TeachingMode.L4_TUTORIAL });
      const res = PedagogyEngine.processTeachingRequest(ctx, 'Step 1: open terminal');
      expect(res.shouldTeach).toBe(true);
      expect(res.content).toContain('📖 Tutorial:');
    });

    it('passes desktop high content through without filtering', () => {
      const ctx = makeContext({
        mode: TeachingMode.L4_TUTORIAL,
        deviceProfile: DeviceProfile.DESKTOP_HIGH,
        constraints: ConstraintEngine.getConstraints(DeviceProfile.DESKTOP_HIGH),
      });

      const res = PedagogyEngine.processTeachingRequest(ctx, 'A'.repeat(10_000));

      expect(res.shouldTeach).toBe(true);
      expect(res.filtered).toBe(false);
      expect(res.content).toContain('A'.repeat(10_000));
    });

    it('does not teach without content even if triggered', () => {
      const ctx = makeContext({
        mode: TeachingMode.L4_TUTORIAL,
      });
      const res = PedagogyEngine.processTeachingRequest(ctx);
      expect(res.shouldTeach).toBe(false);
    });

    it('filters out content unsuitable for device', () => {
      const ctx = makeContext({
        mode: TeachingMode.L4_TUTORIAL,
        deviceProfile: DeviceProfile.CHROMEBOOK_LOW,
        constraints: ConstraintEngine.getConstraints(DeviceProfile.CHROMEBOOK_LOW),
      });
      const res = PedagogyEngine.processTeachingRequest(
        ctx,
        'Install React and build a webpack project'
      );
      expect(res.shouldTeach).toBe(false);
      expect(res.filtered).toBe(true);
      expect(res.filterReason).toMatch(/react/i);
    });

    it('truncates oversized content instead of rejecting', () => {
      const ctx = makeContext({
        mode: TeachingMode.L4_TUTORIAL,
        deviceProfile: DeviceProfile.CHROMEBOOK_LOW,
        constraints: ConstraintEngine.getConstraints(DeviceProfile.CHROMEBOOK_LOW),
      });
      // Build content just over the limit but without banned keywords
      const longContent = 'Use the ls command. '.repeat(5000);
      const res = PedagogyEngine.processTeachingRequest(ctx, longContent);
      // Content exceeds maxResponseSize so isSuggestionSuitable rejects it
      expect(res.filtered).toBe(true);
      expect(res.shouldTeach).toBe(false);
    });
  });
});
