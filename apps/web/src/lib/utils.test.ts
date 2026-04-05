/**
 * Tests for Utility Functions
 */

import { describe, it, expect } from 'vitest';
import {
  cn,
  formatDuration,
  formatPercent,
  getInitials,
  getLevelColor,
  getLevelGradientFrom,
  getLevelName,
} from './utils';

describe('cn (className merge)', () => {
  it('should merge simple class names', () => {
    const result = cn('foo', 'bar');
    expect(result).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    const result = cn('base', true && 'included', false && 'excluded');
    expect(result).toBe('base included');
  });

  it('should merge Tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'px-4'); // px-4 should override px-2
    expect(result).toBe('py-1 px-4');
  });

  it('should handle array of classes', () => {
    const result = cn(['foo', 'bar'], 'baz');
    expect(result).toBe('foo bar baz');
  });

  it('should handle object syntax', () => {
    const result = cn({ foo: true, bar: false, baz: true });
    expect(result).toBe('foo baz');
  });

  it('should handle undefined and null', () => {
    const result = cn('foo', undefined, null, 'bar');
    expect(result).toBe('foo bar');
  });

  it('should handle empty inputs', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('should merge conflicting Tailwind utilities', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('should preserve non-conflicting Tailwind utilities', () => {
    const result = cn('bg-red-500', 'text-blue-500');
    expect(result).toBe('bg-red-500 text-blue-500');
  });
});

describe('formatDuration', () => {
  describe('seconds', () => {
    it('should format 0 seconds', () => {
      expect(formatDuration(0)).toBe('0s');
    });

    it('should format small seconds', () => {
      expect(formatDuration(30)).toBe('30s');
    });

    it('should format 59 seconds', () => {
      expect(formatDuration(59)).toBe('59s');
    });
  });

  describe('minutes', () => {
    it('should format exact minutes', () => {
      expect(formatDuration(60)).toBe('1m');
    });

    it('should format multiple minutes (truncates seconds)', () => {
      expect(formatDuration(90)).toBe('1m');
    });

    it('should format 59 minutes', () => {
      expect(formatDuration(3540)).toBe('59m');
    });

    it('should format 3599 seconds as 59m', () => {
      expect(formatDuration(3599)).toBe('59m');
    });
  });

  describe('hours', () => {
    it('should format exact hour', () => {
      expect(formatDuration(3600)).toBe('1h');
    });

    it('should format hours with minutes', () => {
      expect(formatDuration(3660)).toBe('1h 1m');
    });

    it('should format multiple hours', () => {
      expect(formatDuration(7200)).toBe('2h');
    });

    it('should format hours with minutes correctly', () => {
      expect(formatDuration(5400)).toBe('1h 30m');
    });

    it('should format large durations', () => {
      expect(formatDuration(36000)).toBe('10h');
    });

    it('should handle hours with zero remaining minutes', () => {
      expect(formatDuration(10800)).toBe('3h');
    });

    it('should format complex duration', () => {
      // 2 hours, 45 minutes, 30 seconds = 9930 seconds
      expect(formatDuration(9930)).toBe('2h 45m');
    });
  });
});

describe('formatPercent', () => {
  it('should format 0', () => {
    expect(formatPercent(0)).toBe('0%');
  });

  it('should format 1 (100%)', () => {
    expect(formatPercent(1)).toBe('100%');
  });

  it('should format decimal values', () => {
    expect(formatPercent(0.5)).toBe('50%');
  });

  it('should round to nearest integer', () => {
    expect(formatPercent(0.333)).toBe('33%');
    expect(formatPercent(0.335)).toBe('34%');
  });

  it('should handle values between 0 and 1', () => {
    expect(formatPercent(0.75)).toBe('75%');
    expect(formatPercent(0.01)).toBe('1%');
    expect(formatPercent(0.99)).toBe('99%');
  });

  it('should handle very small values', () => {
    expect(formatPercent(0.001)).toBe('0%');
    expect(formatPercent(0.005)).toBe('1%');
  });

  it('should handle values over 1 (edge case)', () => {
    expect(formatPercent(1.5)).toBe('150%');
  });
});

describe('getInitials', () => {
  it('should get initials from full name', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('should get initials from single name', () => {
    expect(getInitials('John')).toBe('J');
  });

  it('should handle multiple names (take first two)', () => {
    expect(getInitials('John Michael Doe')).toBe('JM');
  });

  it('should convert to uppercase', () => {
    expect(getInitials('john doe')).toBe('JD');
  });

  it('should handle mixed case', () => {
    expect(getInitials('JoHn DoE')).toBe('JD');
  });

  it('should handle names with many parts', () => {
    expect(getInitials('John Michael Robert Doe Jr')).toBe('JM');
  });

  it('should handle single character names', () => {
    expect(getInitials('J D')).toBe('JD');
  });
});

describe('getLevelColor', () => {
  it('should return blue for L1_RECALL', () => {
    expect(getLevelColor('L1_RECALL')).toBe('bg-blue-500');
  });

  it('should return green for L2_EXPLAIN', () => {
    expect(getLevelColor('L2_EXPLAIN')).toBe('bg-green-500');
  });

  it('should return yellow for L3_APPLY', () => {
    expect(getLevelColor('L3_APPLY')).toBe('bg-yellow-500');
  });

  it('should return orange for L4_ANALYZE', () => {
    expect(getLevelColor('L4_ANALYZE')).toBe('bg-orange-500');
  });

  it('should return purple for L5_EXPERT', () => {
    expect(getLevelColor('L5_EXPERT')).toBe('bg-purple-500');
  });

  it('should return gray for unknown level', () => {
    expect(getLevelColor('UNKNOWN')).toBe('bg-gray-500');
  });

  it('should return gray for empty string', () => {
    expect(getLevelColor('')).toBe('bg-gray-500');
  });

  it('should be case-sensitive', () => {
    expect(getLevelColor('l1_recall')).toBe('bg-gray-500');
    expect(getLevelColor('L1_recall')).toBe('bg-gray-500');
  });
});

describe('getLevelGradientFrom', () => {
  it('should return from-blue for L1_RECALL', () => {
    expect(getLevelGradientFrom('L1_RECALL')).toBe('from-blue-500');
  });

  it('should return from-green for L2_EXPLAIN', () => {
    expect(getLevelGradientFrom('L2_EXPLAIN')).toBe('from-green-500');
  });

  it('should return from-yellow for L3_APPLY', () => {
    expect(getLevelGradientFrom('L3_APPLY')).toBe('from-yellow-500');
  });

  it('should return from-orange for L4_ANALYZE', () => {
    expect(getLevelGradientFrom('L4_ANALYZE')).toBe('from-orange-500');
  });

  it('should return from-purple for L5_EXPERT', () => {
    expect(getLevelGradientFrom('L5_EXPERT')).toBe('from-purple-500');
  });

  it('should return from-gray for unknown level', () => {
    expect(getLevelGradientFrom('UNKNOWN')).toBe('from-gray-500');
  });

  it('should return from-gray for empty string', () => {
    expect(getLevelGradientFrom('')).toBe('from-gray-500');
  });
});

describe('getLevelName', () => {
  it('should return Recall for L1_RECALL', () => {
    expect(getLevelName('L1_RECALL')).toBe('Recall');
  });

  it('should return Explain for L2_EXPLAIN', () => {
    expect(getLevelName('L2_EXPLAIN')).toBe('Explain');
  });

  it('should return Apply for L3_APPLY', () => {
    expect(getLevelName('L3_APPLY')).toBe('Apply');
  });

  it('should return Analyze for L4_ANALYZE', () => {
    expect(getLevelName('L4_ANALYZE')).toBe('Analyze');
  });

  it('should return Expert for L5_EXPERT', () => {
    expect(getLevelName('L5_EXPERT')).toBe('Expert');
  });

  it('should return the input for unknown level', () => {
    expect(getLevelName('CUSTOM_LEVEL')).toBe('CUSTOM_LEVEL');
  });

  it('should return empty string for empty input', () => {
    expect(getLevelName('')).toBe('');
  });

  it('should be case-sensitive', () => {
    expect(getLevelName('l1_recall')).toBe('l1_recall');
  });
});
