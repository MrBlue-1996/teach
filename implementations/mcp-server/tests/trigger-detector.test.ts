import { describe, it, expect } from 'vitest';
import { TriggerDetector } from '../src/trigger-detector.js';
import { TeachingMode, TriggerType, DeviceProfile } from '../src/types.js';
import { PedagogyEngine } from '../src/pedagogy-engine.js';

describe('TriggerDetector', () => {
  describe('detectTriggers', () => {
    it('should detect repeated errors', () => {
      const context = PedagogyEngine.createContext(
        TeachingMode.L2_CONTEXTUAL,
        DeviceProfile.CHROMEBOOK_STANDARD
      );
      context.errorsEncountered = 5;

      const triggers = TriggerDetector.detectTriggers(context);

      expect(triggers).toContain(TriggerType.ERROR_REPEATED);
    });

    it('should detect stuck state', () => {
      const context = PedagogyEngine.createContext(
        TeachingMode.L2_CONTEXTUAL,
        DeviceProfile.CHROMEBOOK_STANDARD
      );
      // Simulate 6 minutes ago
      context.sessionStartTime = new Date(Date.now() - 6 * 60 * 1000);
      context.problemsSolved = 0;

      const triggers = TriggerDetector.detectTriggers(context);

      expect(triggers).toContain(TriggerType.STUCK_DETECTED);
    });

    it('should detect time threshold', () => {
      const context = PedagogyEngine.createContext(
        TeachingMode.L2_CONTEXTUAL,
        DeviceProfile.CHROMEBOOK_STANDARD
      );
      // Simulate 6 minutes ago
      context.sessionStartTime = new Date(Date.now() - 6 * 60 * 1000);

      const triggers = TriggerDetector.detectTriggers(context);

      expect(triggers).toContain(TriggerType.TIME_THRESHOLD);
    });
  });

  describe('shouldTeach', () => {
    it('should never teach in L0 mode', () => {
      const triggers = [TriggerType.ERROR_REPEATED, TriggerType.HELP_REQUESTED];
      const result = TriggerDetector.shouldTeach(TeachingMode.L0_SILENT, triggers);

      expect(result).toBe(false);
    });

    it('should only teach on help request in L1 mode', () => {
      const noHelpTriggers = [TriggerType.ERROR_REPEATED];
      const helpTriggers = [TriggerType.HELP_REQUESTED];

      expect(TriggerDetector.shouldTeach(TeachingMode.L1_MINIMAL, noHelpTriggers)).toBe(false);
      expect(TriggerDetector.shouldTeach(TeachingMode.L1_MINIMAL, helpTriggers)).toBe(true);
    });

    it('should teach on specific triggers in L2 mode', () => {
      const errorTriggers = [TriggerType.ERROR_REPEATED];
      const stuckTriggers = [TriggerType.STUCK_DETECTED];
      const timeTriggers = [TriggerType.TIME_THRESHOLD];

      expect(TriggerDetector.shouldTeach(TeachingMode.L2_CONTEXTUAL, errorTriggers)).toBe(true);
      expect(TriggerDetector.shouldTeach(TeachingMode.L2_CONTEXTUAL, stuckTriggers)).toBe(true);
      expect(TriggerDetector.shouldTeach(TeachingMode.L2_CONTEXTUAL, timeTriggers)).toBe(false);
    });

    it('should always teach in L4 mode', () => {
      const emptyTriggers: TriggerType[] = [];
      const result = TriggerDetector.shouldTeach(TeachingMode.L4_TUTORIAL, emptyTriggers);

      expect(result).toBe(true);
    });
  });

  describe('suggestModeElevation', () => {
    it('should suggest elevation with severe triggers', () => {
      const triggers = [TriggerType.ERROR_REPEATED, TriggerType.STUCK_DETECTED];
      const suggested = TriggerDetector.suggestModeElevation(TeachingMode.L1_MINIMAL, triggers);

      expect(suggested).toBeGreaterThan(TeachingMode.L1_MINIMAL);
    });

    it('should not elevate beyond L4', () => {
      const triggers = [TriggerType.ERROR_REPEATED, TriggerType.STUCK_DETECTED];
      const suggested = TriggerDetector.suggestModeElevation(TeachingMode.L4_TUTORIAL, triggers);

      expect(suggested).toBe(TeachingMode.L4_TUTORIAL);
    });
  });
});
