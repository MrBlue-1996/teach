/**
 * TopShelf Shared Utils - Comprehensive Test Suite
 *
 * Tests for ID generation, hashing, time utilities, array utilities,
 * validation, score calculation, string utilities, retry logic, and type guards.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateLearnerId,
  generateContentPackId,
  generateTeachingBlockId,
  generateBadgeId,
  generateRequestId,
  generateAuditEventId,
  generateNonce,
  hashSHA256,
  hashIP,
  nowISO,
  isWithinWindow,
  daysBetween,
  median,
  percentileRank,
  chunk,
  isValidSemver,
  compareSemver,
  calculateWeightedScore,
  normalize,
  truncate,
  redactPII,
  retryWithBackoff,
  sleep,
  isObject,
  isNonEmptyString,
  deepFreeze,
} from './index.js';

// =============================================================================
// ID GENERATION
// =============================================================================

describe('ID Generation', () => {
  describe('generateLearnerId', () => {
    it('should generate an ID with u- prefix', () => {
      const id = generateLearnerId();
      expect(id).toMatch(/^u-[0-9a-f]+$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateLearnerId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('generateContentPackId', () => {
    it('should generate an ID with pack- prefix', () => {
      const id = generateContentPackId();
      expect(id).toMatch(/^pack-[0-9a-f]+$/);
    });
  });

  describe('generateTeachingBlockId', () => {
    it('should generate an ID with tb- prefix', () => {
      const id = generateTeachingBlockId();
      expect(id).toMatch(/^tb-[0-9a-f]+$/);
    });
  });

  describe('generateBadgeId', () => {
    it('should generate an ID with badge- prefix', () => {
      const id = generateBadgeId();
      expect(id).toMatch(/^badge-[0-9a-f]+$/);
    });
  });

  describe('generateRequestId', () => {
    it('should generate an ID with req- prefix', () => {
      const id = generateRequestId();
      expect(id).toMatch(/^req-[0-9a-f]+$/);
    });
  });

  describe('generateAuditEventId', () => {
    it('should generate an ID with audit- prefix', () => {
      const id = generateAuditEventId();
      expect(id).toMatch(/^audit-[0-9a-f]+$/);
    });
  });

  describe('generateNonce', () => {
    it('should generate a hex string of default length', () => {
      const nonce = generateNonce();
      expect(nonce.length).toBe(64); // 32 bytes -> 64 hex chars
      expect(nonce).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate a hex string of custom length', () => {
      const nonce = generateNonce(16);
      expect(nonce.length).toBe(32); // 16 bytes -> 32 hex chars
    });

    it('should generate unique nonces', () => {
      const nonces = new Set(Array.from({ length: 50 }, () => generateNonce()));
      expect(nonces.size).toBe(50);
    });
  });
});

// =============================================================================
// HASHING
// =============================================================================

describe('Hashing', () => {
  describe('hashSHA256', () => {
    it('should produce a 64-character hex hash', () => {
      const hash = hashSHA256('test data');
      expect(hash.length).toBe(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('should produce deterministic results', () => {
      const hash1 = hashSHA256('same input');
      const hash2 = hashSHA256('same input');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashSHA256('input A');
      const hash2 = hashSHA256('input B');
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = hashSHA256('');
      expect(hash.length).toBe(64);
    });
  });

  describe('hashIP', () => {
    it('should produce a 16-character truncated hash', () => {
      const hash = hashIP('192.168.1.1', 'salt123');
      expect(hash.length).toBe(16);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('should produce different hashes with different salts', () => {
      const hash1 = hashIP('192.168.1.1', 'salt1');
      const hash2 = hashIP('192.168.1.1', 'salt2');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for different IPs', () => {
      const hash1 = hashIP('192.168.1.1', 'salt');
      const hash2 = hashIP('10.0.0.1', 'salt');
      expect(hash1).not.toBe(hash2);
    });
  });
});

// =============================================================================
// TIME UTILITIES
// =============================================================================

describe('Time Utilities', () => {
  describe('nowISO', () => {
    it('should return a valid ISO 8601 string', () => {
      const iso = nowISO();
      expect(new Date(iso).toISOString()).toBe(iso);
    });

    it('should return current time', () => {
      const before = Date.now();
      const iso = nowISO();
      const after = Date.now();
      const isoMs = new Date(iso).getTime();
      expect(isoMs).toBeGreaterThanOrEqual(before);
      expect(isoMs).toBeLessThanOrEqual(after);
    });
  });

  describe('isWithinWindow', () => {
    it('should return true for a recent timestamp', () => {
      const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min ago
      expect(isWithinWindow(recent, 10)).toBe(true);
    });

    it('should return false for an old timestamp', () => {
      const old = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago
      expect(isWithinWindow(old, 10)).toBe(false);
    });

    it('should return true for current time', () => {
      const now = new Date().toISOString();
      expect(isWithinWindow(now, 1)).toBe(true);
    });

    it('should handle edge case at the boundary', () => {
      // Exactly at the window boundary
      const atBoundary = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      expect(isWithinWindow(atBoundary, 10)).toBe(true); // <= check
    });
  });

  describe('daysBetween', () => {
    it('should calculate correct days between two dates', () => {
      const start = '2026-01-01T00:00:00Z';
      const end = '2026-01-11T00:00:00Z';
      expect(daysBetween(start, end)).toBe(10);
    });

    it('should return 0 for same date', () => {
      const date = '2026-03-15T12:00:00Z';
      expect(daysBetween(date, date)).toBe(0);
    });

    it('should return negative for reversed dates', () => {
      const start = '2026-01-11T00:00:00Z';
      const end = '2026-01-01T00:00:00Z';
      expect(daysBetween(start, end)).toBe(-10);
    });
  });
});

// =============================================================================
// ARRAY UTILITIES
// =============================================================================

describe('Array Utilities', () => {
  describe('median', () => {
    it('should return median of odd-length array', () => {
      expect(median([1, 3, 5])).toBe(3);
    });

    it('should return average of middle two for even-length array', () => {
      expect(median([1, 2, 3, 4])).toBe(2.5);
    });

    it('should return 0 for empty array', () => {
      expect(median([])).toBe(0);
    });

    it('should handle single-element array', () => {
      expect(median([42])).toBe(42);
    });

    it('should sort unsorted input', () => {
      expect(median([5, 1, 3])).toBe(3);
    });

    it('should handle negative numbers', () => {
      expect(median([-5, -1, -3])).toBe(-3);
    });
  });

  describe('percentileRank', () => {
    it('should return correct percentile for value in sorted array', () => {
      // 3 values less than 4 out of 5 total
      expect(percentileRank(4, [1, 2, 3, 4, 5])).toBe(0.6);
    });

    it('should return 0 for empty array', () => {
      expect(percentileRank(5, [])).toBe(0);
    });

    it('should return 0 for smallest value', () => {
      expect(percentileRank(1, [1, 2, 3, 4, 5])).toBe(0);
    });

    it('should return close to 1 for largest value', () => {
      expect(percentileRank(6, [1, 2, 3, 4, 5])).toBe(1);
    });
  });

  describe('chunk', () => {
    it('should split array into chunks of specified size', () => {
      const result = chunk([1, 2, 3, 4, 5], 2);
      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should return single chunk when size >= array length', () => {
      const result = chunk([1, 2, 3], 5);
      expect(result).toEqual([[1, 2, 3]]);
    });

    it('should return empty array for empty input', () => {
      const result = chunk([], 3);
      expect(result).toEqual([]);
    });

    it('should handle chunk size of 1', () => {
      const result = chunk([1, 2, 3], 1);
      expect(result).toEqual([[1], [2], [3]]);
    });
  });
});

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

describe('Validation Utilities', () => {
  describe('isValidSemver', () => {
    it('should accept valid semver', () => {
      expect(isValidSemver('1.0.0')).toBe(true);
      expect(isValidSemver('0.1.0')).toBe(true);
      expect(isValidSemver('10.20.30')).toBe(true);
    });

    it('should accept semver with prerelease', () => {
      expect(isValidSemver('1.0.0-alpha')).toBe(true);
      expect(isValidSemver('1.0.0-beta.1')).toBe(true);
    });

    it('should reject invalid semver', () => {
      expect(isValidSemver('1.0')).toBe(false);
      expect(isValidSemver('v1.0.0')).toBe(false);
      expect(isValidSemver('1.0.0.0')).toBe(false);
      expect(isValidSemver('not-a-version')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidSemver('')).toBe(false);
    });
  });

  describe('compareSemver', () => {
    it('should return 0 for equal versions', () => {
      expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
    });

    it('should return -1 when first version is lower', () => {
      expect(compareSemver('1.0.0', '2.0.0')).toBe(-1);
      expect(compareSemver('1.0.0', '1.1.0')).toBe(-1);
      expect(compareSemver('1.0.0', '1.0.1')).toBe(-1);
    });

    it('should return 1 when first version is higher', () => {
      expect(compareSemver('2.0.0', '1.0.0')).toBe(1);
      expect(compareSemver('1.1.0', '1.0.0')).toBe(1);
      expect(compareSemver('1.0.1', '1.0.0')).toBe(1);
    });

    it('should handle versions with prerelease tags (comparing only numeric parts)', () => {
      expect(compareSemver('1.0.0-alpha', '1.0.0-beta')).toBe(0);
    });
  });
});

// =============================================================================
// SCORE CALCULATION
// =============================================================================

describe('Score Calculation', () => {
  describe('calculateWeightedScore', () => {
    it('should calculate correct weighted score', () => {
      const components = { a: 0.8, b: 0.6 };
      const weights = { a: 0.7, b: 0.3 };
      const result = calculateWeightedScore(components, weights);

      // (0.8*0.7 + 0.6*0.3) / (0.7+0.3) = (0.56+0.18)/1.0 = 0.74
      expect(result).toBeCloseTo(0.74);
    });

    it('should return 0 when no matching components', () => {
      const components = { x: 0.5 };
      const weights = { y: 1.0 };
      expect(calculateWeightedScore(components, weights)).toBe(0);
    });

    it('should return 0 for empty inputs', () => {
      expect(calculateWeightedScore({}, {})).toBe(0);
    });

    it('should ignore components with zero weight', () => {
      const components = { a: 0.8, b: 1.0 };
      const weights = { a: 1.0, b: 0 };
      expect(calculateWeightedScore(components, weights)).toBeCloseTo(0.8);
    });
  });

  describe('normalize', () => {
    it('should normalize value to 0-1 range', () => {
      expect(normalize(50, 0, 100)).toBe(0.5);
      expect(normalize(0, 0, 100)).toBe(0);
      expect(normalize(100, 0, 100)).toBe(1);
    });

    it('should clamp values outside range', () => {
      expect(normalize(-10, 0, 100)).toBe(0);
      expect(normalize(200, 0, 100)).toBe(1);
    });

    it('should return 0 when min equals max', () => {
      expect(normalize(5, 5, 5)).toBe(0);
    });
  });
});

// =============================================================================
// STRING UTILITIES
// =============================================================================

describe('String Utilities', () => {
  describe('truncate', () => {
    it('should truncate long strings with ellipsis', () => {
      const result = truncate('This is a long string', 10);
      expect(result).toBe('This is...');
      expect(result.length).toBe(10);
    });

    it('should not truncate short strings', () => {
      expect(truncate('Hi', 10)).toBe('Hi');
    });

    it('should handle exact length', () => {
      expect(truncate('12345', 5)).toBe('12345');
    });
  });

  describe('redactPII', () => {
    it('should redact email addresses', () => {
      const result = redactPII('Contact john@example.com for info');
      expect(result).toBe('Contact [EMAIL] for info');
    });

    it('should redact phone numbers', () => {
      const result = redactPII('Call 555-123-4567 now');
      expect(result).toBe('Call [PHONE] now');
    });

    it('should redact SSN patterns', () => {
      const result = redactPII('SSN is 123-45-6789');
      expect(result).toBe('SSN is [SSN]');
    });

    it('should redact credit card patterns', () => {
      const result = redactPII('Card: 1234 5678 9012 3456');
      expect(result).toBe('Card: [CARD]');
    });

    it('should handle text with no PII', () => {
      const text = 'No personal info here';
      expect(redactPII(text)).toBe(text);
    });

    it('should handle multiple PII patterns', () => {
      const result = redactPII('Email: a@b.com, Phone: 555-123-4567');
      expect(result).toContain('[EMAIL]');
      expect(result).toContain('[PHONE]');
    });
  });
});

// =============================================================================
// RETRY LOGIC
// =============================================================================

describe('Retry Logic', () => {
  describe('retryWithBackoff', () => {
    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await retryWithBackoff(fn, 3, 10);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed eventually', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await retryWithBackoff(fn, 3, 10);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after exhausting all retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('always fails'));

      await expect(retryWithBackoff(fn, 2, 10)).rejects.toThrow('always fails');
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should handle non-Error throws', async () => {
      const fn = vi.fn().mockRejectedValue('string error');

      await expect(retryWithBackoff(fn, 0, 10)).rejects.toThrow('string error');
    });
  });

  describe('sleep', () => {
    it('should resolve after specified time', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(40); // Allow some tolerance
    });
  });
});

// =============================================================================
// TYPE GUARDS
// =============================================================================

describe('Type Guards', () => {
  describe('isObject', () => {
    it('should return true for plain objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: 'value' })).toBe(true);
    });

    it('should return false for null', () => {
      expect(isObject(null)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isObject([])).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isObject('string')).toBe(false);
      expect(isObject(42)).toBe(false);
      expect(isObject(true)).toBe(false);
      expect(isObject(undefined)).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('should return true for non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString(' ')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isNonEmptyString('')).toBe(false);
    });

    it('should return false for non-string types', () => {
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
      expect(isNonEmptyString(42)).toBe(false);
      expect(isNonEmptyString([])).toBe(false);
    });
  });

  describe('deepFreeze', () => {
    it('should freeze an object deeply', () => {
      const obj = { a: { b: { c: 1 } } };
      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen((frozen as any).a)).toBe(true);
      expect(Object.isFrozen((frozen as any).a.b)).toBe(true);
    });

    it('should return primitives as-is', () => {
      expect(deepFreeze(42)).toBe(42);
      expect(deepFreeze('string')).toBe('string');
      expect(deepFreeze(null)).toBe(null);
    });

    it('should prevent modifications', () => {
      const obj = deepFreeze({ key: 'value' });
      expect(() => {
        (obj as any).key = 'changed';
      }).toThrow();
    });
  });
});
