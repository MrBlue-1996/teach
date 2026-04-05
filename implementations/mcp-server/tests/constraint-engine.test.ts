import { describe, it, expect } from 'vitest';
import { ConstraintEngine } from '../src/constraint-engine.js';
import { DeviceProfile } from '../src/types.js';

describe('ConstraintEngine', () => {
  describe('getConstraints', () => {
    it('should return correct constraints for Chromebook low profile', () => {
      const constraints = ConstraintEngine.getConstraints(DeviceProfile.CHROMEBOOK_LOW);

      expect(constraints.maxMemoryMB).toBe(2048);
      expect(constraints.maxCPUCores).toBe(2);
      expect(constraints.offlineCapable).toBe(true);
      expect(constraints.allowHeavyFrameworks).toBe(false);
    });

    it('should return correct constraints for Desktop high profile', () => {
      const constraints = ConstraintEngine.getConstraints(DeviceProfile.DESKTOP_HIGH);

      expect(constraints.maxMemoryMB).toBe(16384);
      expect(constraints.allowHeavyFrameworks).toBe(true);
      expect(constraints.allowLargeAssets).toBe(true);
    });
  });

  describe('isSuggestionSuitable', () => {
    it('should reject suggestions that are too large', () => {
      const largeSuggestion = 'a'.repeat(100000);
      const result = ConstraintEngine.isSuggestionSuitable(
        largeSuggestion,
        DeviceProfile.CHROMEBOOK_LOW
      );

      expect(result.suitable).toBe(false);
      expect(result.reason).toContain('Response too large');
    });

    it('should reject heavy frameworks for Chromebook', () => {
      const suggestion = 'You should use React for this project';
      const result = ConstraintEngine.isSuggestionSuitable(
        suggestion,
        DeviceProfile.CHROMEBOOK_LOW
      );

      expect(result.suitable).toBe(false);
      expect(result.reason).toContain('Heavy framework');
    });

    it('should accept heavy frameworks for Desktop high', () => {
      const suggestion = 'You should use React for this project';
      const result = ConstraintEngine.isSuggestionSuitable(suggestion, DeviceProfile.DESKTOP_HIGH);

      expect(result.suitable).toBe(true);
    });

    it('should reject large assets for Chromebook', () => {
      const suggestion = 'Add a large image file to your project';
      const result = ConstraintEngine.isSuggestionSuitable(
        suggestion,
        DeviceProfile.CHROMEBOOK_STANDARD
      );

      expect(result.suitable).toBe(false);
      expect(result.reason).toContain('Large assets');
    });

    it('should accept suitable suggestions', () => {
      const suggestion = 'Use vanilla JavaScript for this task';
      const result = ConstraintEngine.isSuggestionSuitable(
        suggestion,
        DeviceProfile.CHROMEBOOK_LOW
      );

      expect(result.suitable).toBe(true);
    });
  });

  describe('filterSuggestion', () => {
    it('should truncate overly large suggestions', () => {
      const largeSuggestion = 'a'.repeat(100000);
      const result = ConstraintEngine.filterSuggestion(
        largeSuggestion,
        DeviceProfile.CHROMEBOOK_LOW
      );

      expect(result.filtered.length).toBeLessThan(largeSuggestion.length);
      expect(result.wasModified).toBe(true);
      expect(result.filtered).toContain('[Response truncated');
    });

    it('should not modify suitable suggestions', () => {
      const suggestion = 'This is a normal suggestion';
      const result = ConstraintEngine.filterSuggestion(suggestion, DeviceProfile.CHROMEBOOK_LOW);

      expect(result.filtered).toBe(suggestion);
      expect(result.wasModified).toBe(false);
    });
  });
});
