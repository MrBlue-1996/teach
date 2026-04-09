/**
 * Parity Validator (TS-TEST-010)
 *
 * Validates parity between deterministic formatter output
 * and LLM-generated content to ensure consistency.
 */

import type {
  ParityDivergence,
  ParityTestResult,
  TeachingBlockId,
  TeachingBlock,
} from '@topshelf/shared';
import { CanonicalFormatter, type FormattedOutput } from '../formatters/canonical-formatter.js';

/** LLM output structure (simulated) */
export interface LLMFormattedOutput {
  readonly canonicalSolution: string;
  readonly explanation: string;
  readonly hints: readonly string[];
  readonly variantPrompts: readonly string[];
}

/** Parity test configuration */
export interface ParityTestConfig {
  /** Maximum allowed divergence count before failing */
  readonly maxAllowedDivergence: number;
  /** Minimum similarity score for string comparison */
  readonly minSimilarityThreshold: number;
  /** Fields to check for parity */
  readonly fieldsToCheck: readonly (
    | 'canonicalSolution'
    | 'explanation'
    | 'hints'
    | 'variantPrompts'
  )[];
}

/** Default parity test configuration */
export const DEFAULT_PARITY_CONFIG: ParityTestConfig = {
  maxAllowedDivergence: 0,
  minSimilarityThreshold: 0.95,
  fieldsToCheck: ['canonicalSolution', 'explanation', 'hints', 'variantPrompts'],
};

/**
 * Parity validator class
 */
export class ParityValidator {
  private readonly formatter: CanonicalFormatter;
  private readonly config: ParityTestConfig;

  constructor(config: Partial<ParityTestConfig> = {}) {
    this.formatter = new CanonicalFormatter();
    this.config = { ...DEFAULT_PARITY_CONFIG, ...config };
  }

  /**
   * Validate parity for a single teaching block
   */
  validateBlock(block: TeachingBlock, llmOutput: LLMFormattedOutput): ParityTestResult {
    const deterministicOutput = this.formatter.formatBlock(block);
    const divergences: ParityDivergence[] = [];

    // Check each configured field
    for (const field of this.config.fieldsToCheck) {
      const fieldDivergences = this.checkField(block.id, field, deterministicOutput, llmOutput);
      divergences.push(...fieldDivergences);
    }

    return {
      passed: divergences.length <= this.config.maxAllowedDivergence,
      divergenceCount: divergences.length,
      maxAllowedDivergence: this.config.maxAllowedDivergence,
      divergences,
    };
  }

  /**
   * Validate parity for multiple blocks
   */
  validateBatch(
    blocks: readonly TeachingBlock[],
    llmOutputs: ReadonlyMap<TeachingBlockId, LLMFormattedOutput>
  ): ParityTestResult {
    const allDivergences: ParityDivergence[] = [];

    for (const block of blocks) {
      const llmOutput = llmOutputs.get(block.id);
      if (llmOutput === undefined) {
        allDivergences.push({
          blockId: block.id,
          field: 'all',
          deterministicOutput: '[generated]',
          llmOutput: '[missing]',
          similarity: 0,
        });
        continue;
      }

      const result = this.validateBlock(block, llmOutput);
      allDivergences.push(...result.divergences);
    }

    return {
      passed: allDivergences.length <= this.config.maxAllowedDivergence,
      divergenceCount: allDivergences.length,
      maxAllowedDivergence: this.config.maxAllowedDivergence,
      divergences: allDivergences,
    };
  }

  /**
   * Check a single field for parity
   */
  private checkField(
    blockId: TeachingBlockId,
    field: keyof LLMFormattedOutput,
    deterministic: FormattedOutput,
    llm: LLMFormattedOutput
  ): ParityDivergence[] {
    const divergences: ParityDivergence[] = [];

    if (field === 'hints' || field === 'variantPrompts') {
      // Array comparison
      const detArray = deterministic[field];
      const llmArray = llm[field];

      if (detArray.length !== llmArray.length) {
        divergences.push({
          blockId,
          field: `${field}.length`,
          deterministicOutput: String(detArray.length),
          llmOutput: String(llmArray.length),
          similarity: 0,
        });
      }

      const minLength = Math.min(detArray.length, llmArray.length);
      for (let i = 0; i < minLength; i++) {
        const detItem = detArray[i];
        const llmItem = llmArray[i];
        if (detItem !== undefined && llmItem !== undefined) {
          const similarity = this.calculateSimilarity(detItem, llmItem);
          if (similarity < this.config.minSimilarityThreshold) {
            divergences.push({
              blockId,
              field: `${field}[${i}]`,
              deterministicOutput: this.truncate(detItem),
              llmOutput: this.truncate(llmItem),
              similarity,
            });
          }
        }
      }
    } else {
      // String comparison
      const detValue = deterministic[field];
      const llmValue = llm[field];
      const similarity = this.calculateSimilarity(detValue, llmValue);

      if (similarity < this.config.minSimilarityThreshold) {
        divergences.push({
          blockId,
          field,
          deterministicOutput: this.truncate(detValue),
          llmOutput: this.truncate(llmValue),
          similarity,
        });
      }
    }

    return divergences;
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   */
  private calculateSimilarity(a: string, b: string): number {
    if (a === b) {
      return 1;
    }

    // Normalize strings for comparison
    const normA = this.normalizeForComparison(a);
    const normB = this.normalizeForComparison(b);

    if (normA === normB) {
      return 0.99; // Very similar but not identical
    }

    // Use Levenshtein distance ratio
    const distance = this.levenshteinDistance(normA, normB);
    const maxLength = Math.max(normA.length, normB.length);

    if (maxLength === 0) {
      return 1;
    }

    return 1 - distance / maxLength;
  }

  /**
   * Normalize string for comparison (ignore minor formatting differences)
   */
  private normalizeForComparison(str: string): string {
    return str
      .replace(/\r\n/g, '\n')
      .replace(/\s+/g, ' ')
      .replace(/\s+$/gm, '')
      .trim()
      .toLowerCase();
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
      const row = matrix[0];
      if (row !== undefined) {
        row[j] = j;
      }
    }

    // Fill matrix
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        const row = matrix[i];
        const prevRow = matrix[i - 1];
        if (row !== undefined && prevRow !== undefined) {
          row[j] = Math.min(
            (prevRow[j] ?? 0) + 1, // deletion
            (row[j - 1] ?? 0) + 1, // insertion
            (prevRow[j - 1] ?? 0) + cost // substitution
          );
        }
      }
    }

    return matrix[a.length]?.[b.length] ?? 0;
  }

  /**
   * Truncate string for display
   */
  private truncate(str: string, maxLength: number = 100): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.slice(0, maxLength - 3) + '...';
  }
}

/**
 * Create a parity test runner for CI
 */
export class ParityTestRunner {
  private readonly validator: ParityValidator;
  private readonly results: ParityTestResult[] = [];

  constructor(config?: Partial<ParityTestConfig>) {
    this.validator = new ParityValidator(config);
  }

  /**
   * Run parity test for a block
   */
  runTest(block: TeachingBlock, llmOutput: LLMFormattedOutput): ParityTestResult {
    const result = this.validator.validateBlock(block, llmOutput);
    this.results.push(result);
    return result;
  }

  /**
   * Get aggregate results
   */
  getAggregateResults(): {
    totalTests: number;
    passed: number;
    failed: number;
    totalDivergences: number;
    passRate: number;
  } {
    const passed = this.results.filter((r) => r.passed).length;
    const totalDivergences = this.results.reduce((sum, r) => sum + r.divergenceCount, 0);

    return {
      totalTests: this.results.length,
      passed,
      failed: this.results.length - passed,
      totalDivergences,
      passRate: this.results.length > 0 ? passed / this.results.length : 1,
    };
  }

  /**
   * Clear results
   */
  clear(): void {
    this.results.length = 0;
  }
}
