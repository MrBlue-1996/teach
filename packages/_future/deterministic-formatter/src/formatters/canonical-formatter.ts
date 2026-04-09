/**
 * Canonical Formatter (TS-DEVICE-007)
 *
 * Deterministic formatter for teaching content that produces
 * identical output regardless of execution environment.
 *
 * Key principles:
 * 1. Same input always produces same output
 * 2. No randomness or time-dependent operations
 * 3. WASM-compatible for client-side execution
 * 4. Maintains parity with LLM outputs
 */

import { hashSHA256 } from '@topshelf/shared';
import type { SurfaceVariant, TeachingBlock } from '@topshelf/shared';

/** Formatter configuration */
export interface FormatterConfig {
  /** Maximum line width for wrapping */
  readonly maxLineWidth: number;
  /** Indentation style */
  readonly indentStyle: 'spaces' | 'tabs';
  /** Indent size (for spaces) */
  readonly indentSize: number;
  /** Code block language defaults */
  readonly defaultCodeLanguage: string;
  /** Whether to include line numbers in code */
  readonly includeLineNumbers: boolean;
}

/** Default configuration */
export const DEFAULT_FORMATTER_CONFIG: FormatterConfig = {
  maxLineWidth: 80,
  indentStyle: 'spaces',
  indentSize: 2,
  defaultCodeLanguage: 'bash',
  includeLineNumbers: false,
};

/** Formatted output structure */
export interface FormattedOutput {
  /** Formatted canonical solution */
  readonly canonicalSolution: string;
  /** Formatted explanation */
  readonly explanation: string;
  /** Formatted hints */
  readonly hints: readonly string[];
  /** Formatted variant prompts */
  readonly variantPrompts: readonly string[];
  /** Deterministic hash of output */
  readonly contentHash: string;
  /** Formatter version */
  readonly formatterVersion: string;
}

/**
 * Deterministic canonical content formatter
 */
export class CanonicalFormatter {
  private readonly config: FormatterConfig;
  private static readonly VERSION = '1.0.0';

  constructor(config: Partial<FormatterConfig> = {}) {
    this.config = { ...DEFAULT_FORMATTER_CONFIG, ...config };
  }

  /**
   * Format a teaching block deterministically
   */
  formatBlock(block: TeachingBlock): FormattedOutput {
    const canonicalSolution = this.formatSolution(block.canonicalSolution, block.concept);
    const explanation = this.formatExplanation(block.explanation);
    const hints = block.hints.map((hint, index) => this.formatHint(hint, index));
    const variantPrompts = block.surfaceVariants.map((v) => this.formatVariant(v));

    // Create deterministic content hash
    const contentToHash = [canonicalSolution, explanation, ...hints, ...variantPrompts].join(
      '\n---\n'
    );
    const contentHash = hashSHA256(contentToHash);

    return {
      canonicalSolution,
      explanation,
      hints,
      variantPrompts,
      contentHash,
      formatterVersion: CanonicalFormatter.VERSION,
    };
  }

  /**
   * Format canonical solution with consistent structure
   */
  private formatSolution(solution: string, concept: string): string {
    const lines: string[] = [];

    // Header
    lines.push(`## Solution: ${this.normalizeWhitespace(concept)}`);
    lines.push('');

    // Detect and format code blocks
    const formatted = this.formatCodeBlocks(solution);
    lines.push(formatted);

    return lines.join('\n');
  }

  /**
   * Format explanation text
   */
  private formatExplanation(explanation: string): string {
    const lines: string[] = [];

    lines.push('## Why This Works');
    lines.push('');

    // Normalize and wrap text
    const paragraphs = this.splitParagraphs(explanation);
    for (const paragraph of paragraphs) {
      const wrapped = this.wrapText(this.normalizeWhitespace(paragraph));
      lines.push(wrapped);
      lines.push('');
    }

    return lines.join('\n').trim();
  }

  /**
   * Format a single hint
   */
  private formatHint(hint: string, index: number): string {
    const prefix = `**Hint ${index + 1}:** `;
    const wrapped = this.wrapText(this.normalizeWhitespace(hint), prefix.length);
    return prefix + wrapped;
  }

  /**
   * Format a surface variant
   */
  private formatVariant(variant: SurfaceVariant): string {
    const lines: string[] = [];

    lines.push(`### Variant: ${variant.id}`);
    lines.push('');
    lines.push(this.normalizeWhitespace(variant.description));

    return lines.join('\n');
  }

  /**
   * Format code blocks with consistent styling
   */
  private formatCodeBlocks(text: string): string {
    // Match code blocks (```...```)
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;

    return text.replace(codeBlockRegex, (_, lang: string, code: string) => {
      const language = lang.length > 0 ? lang : this.config.defaultCodeLanguage;
      const formattedCode = this.formatCode(code);
      return `\`\`\`${language}\n${formattedCode}\`\`\``;
    });
  }

  /**
   * Format code with consistent indentation
   */
  private formatCode(code: string): string {
    const lines = code.split('\n');
    const indentUnit =
      this.config.indentStyle === 'tabs' ? '\t' : ' '.repeat(this.config.indentSize);

    // Remove trailing whitespace and normalize indentation
    const normalizedLines = lines.map((line) => {
      // Preserve empty lines
      if (line.trim().length === 0) {
        return '';
      }

      // Count leading whitespace
      const leadingSpaces = line.match(/^(\s*)/)?.[1]?.length ?? 0;
      const indentLevel = Math.floor(leadingSpaces / 2);
      const content = line.trim();

      return indentUnit.repeat(indentLevel) + content;
    });

    // Remove trailing empty lines
    while (normalizedLines.length > 0 && normalizedLines[normalizedLines.length - 1] === '') {
      normalizedLines.pop();
    }

    // Ensure trailing newline
    return normalizedLines.join('\n') + '\n';
  }

  /**
   * Normalize whitespace in text
   */
  private normalizeWhitespace(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\t/g, ' ') // Replace tabs with spaces
      .replace(/ +/g, ' ') // Collapse multiple spaces
      .trim();
  }

  /**
   * Split text into paragraphs
   */
  private splitParagraphs(text: string): string[] {
    return text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  /**
   * Wrap text to max line width
   */
  private wrapText(text: string, initialIndent: number = 0): string {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const lineWidth = currentLine.length + (currentLine.length > 0 ? 1 : 0) + word.length;
      const effectiveWidth =
        lines.length === 0 ? this.config.maxLineWidth - initialIndent : this.config.maxLineWidth;

      if (lineWidth > effectiveWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine.length > 0 ? `${currentLine} ${word}` : word;
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines.join('\n');
  }

  /**
   * Get formatter version
   */
  getVersion(): string {
    return CanonicalFormatter.VERSION;
  }

  /**
   * Get current configuration
   */
  getConfig(): FormatterConfig {
    return { ...this.config };
  }
}

/**
 * Create a formatted content hash for parity comparison
 */
export function createContentHash(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\s+$/gm, '').trim();
  return hashSHA256(normalized);
}

/**
 * Compare two formatted outputs for parity
 */
export function checkParity(
  a: FormattedOutput,
  b: FormattedOutput
): {
  matched: boolean;
  divergences: string[];
} {
  const divergences: string[] = [];

  if (a.contentHash !== b.contentHash) {
    divergences.push(`Content hash mismatch: ${a.contentHash} vs ${b.contentHash}`);
  }

  if (a.canonicalSolution !== b.canonicalSolution) {
    divergences.push('Canonical solution differs');
  }

  if (a.explanation !== b.explanation) {
    divergences.push('Explanation differs');
  }

  if (a.hints.length !== b.hints.length) {
    divergences.push(`Hint count differs: ${a.hints.length} vs ${b.hints.length}`);
  } else {
    a.hints.forEach((hint, i) => {
      if (hint !== b.hints[i]) {
        divergences.push(`Hint ${i + 1} differs`);
      }
    });
  }

  return {
    matched: divergences.length === 0,
    divergences,
  };
}
