/**
 * TopShelf Teaching - Shared Utilities
 *
 * Common utility functions used across packages.
 */

import { createHash, randomBytes } from 'crypto';

// === ID Generation ===

/**
 * Generate a unique learner ID
 */
export function generateLearnerId(): `u-${string}` {
  const bytes = randomBytes(16);
  return `u-${bytes.toString('hex')}`;
}

/**
 * Generate a unique content pack ID
 */
export function generateContentPackId(): `pack-${string}` {
  const bytes = randomBytes(12);
  return `pack-${bytes.toString('hex')}`;
}

/**
 * Generate a unique teaching block ID
 */
export function generateTeachingBlockId(): `tb-${string}` {
  const bytes = randomBytes(12);
  return `tb-${bytes.toString('hex')}`;
}

/**
 * Generate a unique badge ID
 */
export function generateBadgeId(): `badge-${string}` {
  const bytes = randomBytes(12);
  return `badge-${bytes.toString('hex')}`;
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): `req-${string}` {
  const bytes = randomBytes(16);
  return `req-${bytes.toString('hex')}`;
}

/**
 * Generate a unique audit event ID
 */
export function generateAuditEventId(): `audit-${string}` {
  const bytes = randomBytes(16);
  return `audit-${bytes.toString('hex')}`;
}

/**
 * Generate a cryptographic nonce for replay protection
 */
export function generateNonce(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

// === Hashing ===

/**
 * Hash data using SHA-256
 */
export function hashSHA256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Hash an IP address for privacy-preserving logging
 */
export function hashIP(ip: string, salt: string): string {
  return createHash('sha256').update(`${ip}:${salt}`, 'utf8').digest('hex').slice(0, 16);
}

// === Time Utilities ===

/**
 * Get current ISO 8601 timestamp
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Check if a timestamp is within a time window
 */
export function isWithinWindow(timestamp: string, windowMinutes: number): boolean {
  const timestampMs = new Date(timestamp).getTime();
  const nowMs = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  return nowMs - timestampMs <= windowMs;
}

/**
 * Calculate days between two dates
 */
export function daysBetween(start: string, end: string): number {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  return Math.floor((endMs - startMs) / (24 * 60 * 60 * 1000));
}

// === Array Utilities ===

/**
 * Calculate the median of a numeric array
 */
export function median(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const left = sorted[mid - 1];
    const right = sorted[mid];
    if (left === undefined || right === undefined) {
      return 0;
    }
    return (left + right) / 2;
  }
  return sorted[mid] ?? 0;
}

/**
 * Calculate percentile rank of a value in a sorted array
 */
export function percentileRank(value: number, sortedValues: readonly number[]): number {
  if (sortedValues.length === 0) {
    return 0;
  }
  let count = 0;
  for (const v of sortedValues) {
    if (v < value) {
      count++;
    }
  }
  return count / sortedValues.length;
}

/**
 * Chunk an array into smaller arrays of specified size
 */
export function chunk<T>(array: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// === Validation Utilities ===

/**
 * Check if a string is a valid semantic version
 */
export function isValidSemver(version: string): boolean {
  return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(version);
}

/**
 * Compare two semantic versions
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const partsA = a.split('-')[0]?.split('.').map(Number) ?? [];
  const partsB = b.split('-')[0]?.split('.').map(Number) ?? [];

  for (let i = 0; i < 3; i++) {
    const partA = partsA[i] ?? 0;
    const partB = partsB[i] ?? 0;
    if (partA < partB) {
      return -1;
    }
    if (partA > partB) {
      return 1;
    }
  }
  return 0;
}

// === Score Calculation ===

/**
 * Calculate weighted composite score
 */
export function calculateWeightedScore(
  components: Record<string, number>,
  weights: Record<string, number>
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const component = components[key];
    if (component !== undefined && weight > 0) {
      weightedSum += component * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Normalize a value to [0, 1] range
 */
export function normalize(value: number, min: number, max: number): number {
  if (max === min) {
    return 0;
  }
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

// === String Utilities ===

/**
 * Truncate a string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Redact PII patterns from text
 */
export function redactPII(text: string): string {
  // Email addresses
  let redacted = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
  // Phone numbers (basic patterns)
  redacted = redacted.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
  // SSN patterns
  redacted = redacted.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
  // Credit card patterns
  redacted = redacted.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]');
  return redacted;
}

// === Retry Logic ===

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error('Retry failed');
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// === Type Guards ===

/**
 * Check if value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Deep freeze an object to make it immutable
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  Object.freeze(obj);

  for (const key of Object.keys(obj)) {
    const value = (obj as Record<string, unknown>)[key];
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }

  return obj as Readonly<T>;
}
