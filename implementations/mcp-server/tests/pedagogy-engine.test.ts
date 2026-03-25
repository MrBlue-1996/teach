import { describe, it, expect } from 'vitest';
import { PedagogyEngine } from '../src/pedagogy-engine.js';
import { TeachingMode, DeviceProfile } from '../src/types.js';

describe('PedagogyEngine', () => {
  describe('createContext', () => {
    it('should create a valid teaching context', () => {
      const context = PedagogyEngine.createContext(
        TeachingMode.L2_CONTEXTUAL,
        DeviceProfile.CHROMEBOOK_STANDARD
      );

      expect(context.mode).toBe(TeachingMode.L2_CONTEXTUAL);
      expect(context.deviceProfile).toBe(DeviceProfile.CHROMEBOOK_STANDARD);
      expect(context.constraints).toBeDefined();
      expect(context.problemsSolved).toBe(0);
      expect(context.errorsEncountered).toBe(0);
      expect(context.triggers).toEqual([]);
    });
  });

  describe('processTeachingRequest', () => {
    it('should not teach in L0 mode', () => {
      const context = PedagogyEngine.createContext(
        TeachingMode.L0_SILENT,
        DeviceProfile.CHROMEBOOK_STANDARD
      );

      const response = PedagogyEngine.processTeachingRequest(
        context,
        'Here is some teaching content'
      );

      expect(response.shouldTeach).toBe(false);
    });

    it('should teach in L4 mode with suitable content', () => {
      const context = PedagogyEngine.createContext(
        TeachingMode.L4_TUTORIAL,
        DeviceProfile.CHROMEBOOK_STANDARD
      );

      const response = PedagogyEngine.processTeachingRequest(
        context,
        'This is teaching content'
      );

      expect(response.shouldTeach).toBe(true);
      expect(response.content).toContain('Tutorial:');
    });

    it('should filter unsuitable content', () => {
      const context = PedagogyEngine.createContext(
        TeachingMode.L4_TUTORIAL,
        DeviceProfile.CHROMEBOOK_LOW
      );

      const response = PedagogyEngine.processTeachingRequest(
        context,
        'Use React framework for this project'
      );

      expect(response.shouldTeach).toBe(false);
      expect(response.filtered).toBe(true);
      expect(response.filterReason).toContain('Heavy framework');
    });

    it('should include mode-specific prefix', () => {
      const modes = [
        { mode: TeachingMode.L1_MINIMAL, prefix: '💡 Hint:' },
        { mode: TeachingMode.L2_CONTEXTUAL, prefix: '📚 Guidance:' },
        { mode: TeachingMode.L3_ACTIVE, prefix: '🎓 Teaching:' },
        { mode: TeachingMode.L4_TUTORIAL, prefix: '📖 Tutorial:' },
      ];

      for (const { mode, prefix } of modes) {
        const context = PedagogyEngine.createContext(
          mode,
          DeviceProfile.DESKTOP_STANDARD
        );
        const response = PedagogyEngine.processTeachingRequest(
          context,
          'Content'
        );

        if (response.content) {
          expect(response.content).toContain(prefix);
        }
      }
    });
  });
});
