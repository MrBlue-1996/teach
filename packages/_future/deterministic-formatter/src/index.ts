/**
 * TopShelf Teaching - Deterministic Formatter
 *
 * Provides deterministic content formatting for parity
 * between offline and online outputs.
 */

// Core formatter
export {
  CanonicalFormatter,
  DEFAULT_FORMATTER_CONFIG,
  createContentHash,
  checkParity,
} from './formatters/canonical-formatter.js';
export type { FormatterConfig, FormattedOutput } from './formatters/canonical-formatter.js';

// Parity validation
export {
  ParityValidator,
  ParityTestRunner,
  DEFAULT_PARITY_CONFIG,
} from './validators/parity-validator.js';
export type { LLMFormattedOutput, ParityTestConfig } from './validators/parity-validator.js';

// Re-export relevant types
export type { TeachingBlock, ParityTestResult, ParityDivergence } from '@topshelf/shared';
