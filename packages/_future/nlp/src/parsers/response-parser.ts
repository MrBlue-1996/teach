/**
 * Response Parser (TS-NLP-008)
 *
 * Deterministic parsers for extracting signals from learner responses.
 * These run locally and provide consistent, auditable results.
 */

import { redactPII } from '@topshelf/shared';

/** Parsed response signals */
export interface ParsedResponseSignals {
  /** Detected keywords/concepts */
  readonly keywords: readonly string[];
  /** Causal language indicators */
  readonly causalIndicators: readonly CausalIndicator[];
  /** Technical terms used correctly */
  readonly correctTerms: readonly string[];
  /** Technical terms used incorrectly */
  readonly incorrectTerms: readonly string[];
  /** Code block analysis */
  readonly codeAnalysis: CodeAnalysis | null;
  /** Response structure quality */
  readonly structureScore: number;
  /** Confidence in parsing */
  readonly confidence: number;
}

/** Causal language indicator */
export interface CausalIndicator {
  /** The causal phrase found */
  readonly phrase: string;
  /** Type of causal relationship */
  readonly type: 'because' | 'therefore' | 'if_then' | 'causes' | 'results_in';
  /** Position in text */
  readonly position: number;
}

/** Code block analysis */
export interface CodeAnalysis {
  /** Number of code blocks */
  readonly blockCount: number;
  /** Languages detected */
  readonly languages: readonly string[];
  /** Whether code appears syntactically valid */
  readonly syntaxValid: boolean;
  /** Code comments present */
  readonly hasComments: boolean;
  /** Total lines of code */
  readonly lineCount: number;
}

/**
 * Deterministic response parser
 */
export class ResponseParser {
  private readonly technicalTerms: ReadonlySet<string>;
  private readonly causalPatterns: readonly RegExp[];

  constructor(technicalTerms?: readonly string[]) {
    this.technicalTerms = new Set(
      technicalTerms ?? [
        // Linux terms
        'chmod',
        'chown',
        'useradd',
        'systemctl',
        'iptables',
        'sudo',
        'ssh',
        'scp',
        // Networking terms
        'subnet',
        'cidr',
        'vlan',
        'tcp',
        'udp',
        'dns',
        'dhcp',
        'nat',
        'gateway',
        'firewall',
        // General tech terms
        'api',
        'rest',
        'http',
        'https',
        'json',
        'yaml',
        'docker',
        'kubernetes',
      ]
    );

    this.causalPatterns = [
      /\bbecause\b/gi,
      /\btherefore\b/gi,
      /\bif\s+.+\s+then\b/gi,
      /\bcauses?\b/gi,
      /\bresults?\s+in\b/gi,
      /\bdue\s+to\b/gi,
      /\bas\s+a\s+result\b/gi,
      /\bconsequently\b/gi,
      /\bthis\s+means\b/gi,
      /\bwhich\s+leads\s+to\b/gi,
    ];
  }

  /**
   * Parse a learner response and extract signals
   */
  parse(response: string): ParsedResponseSignals {
    // Redact PII first
    const sanitized = redactPII(response);

    const keywords = this.extractKeywords(sanitized);
    const causalIndicators = this.findCausalIndicators(sanitized);
    const { correct, incorrect } = this.analyzeTechnicalTerms(sanitized);
    const codeAnalysis = this.analyzeCode(sanitized);
    const structureScore = this.scoreStructure(sanitized);

    // Calculate confidence based on signal density
    const signalCount =
      keywords.length + causalIndicators.length + correct.length + (codeAnalysis !== null ? 1 : 0);
    const confidence = Math.min(1, signalCount / 10);

    return {
      keywords,
      causalIndicators,
      correctTerms: correct,
      incorrectTerms: incorrect,
      codeAnalysis,
      structureScore,
      confidence,
    };
  }

  /**
   * Extract keywords from response
   */
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\W+/);
    const keywords: string[] = [];

    for (const word of words) {
      if (word.length > 3 && this.technicalTerms.has(word)) {
        keywords.push(word);
      }
    }

    // Deduplicate while preserving order
    return [...new Set(keywords)];
  }

  /**
   * Find causal language indicators
   */
  private findCausalIndicators(text: string): CausalIndicator[] {
    const indicators: CausalIndicator[] = [];

    const typeMap: Record<number, CausalIndicator['type']> = {
      0: 'because',
      1: 'therefore',
      2: 'if_then',
      3: 'causes',
      4: 'results_in',
      5: 'because', // due to
      6: 'results_in', // as a result
      7: 'therefore', // consequently
      8: 'results_in', // this means
      9: 'causes', // which leads to
    };

    for (let i = 0; i < this.causalPatterns.length; i++) {
      const pattern = this.causalPatterns[i];
      if (pattern === undefined) {
        continue;
      }

      let match: RegExpExecArray | null;
      // Reset regex lastIndex
      pattern.lastIndex = 0;

      while ((match = pattern.exec(text)) !== null) {
        indicators.push({
          phrase: match[0],
          type: typeMap[i] ?? 'because',
          position: match.index,
        });
      }
    }

    return indicators.sort((a, b) => a.position - b.position);
  }

  /**
   * Analyze technical term usage
   */
  private analyzeTechnicalTerms(text: string): {
    correct: string[];
    incorrect: string[];
  } {
    const correct: string[] = [];
    const incorrect: string[] = [];
    const words = text.toLowerCase().split(/\W+/);

    for (const term of this.technicalTerms) {
      if (words.includes(term)) {
        // Simple heuristic: if term is followed by proper context, mark correct
        // This would be more sophisticated in production
        const termIndex = text.toLowerCase().indexOf(term);
        if (termIndex >= 0) {
          const context = text.slice(termIndex, termIndex + term.length + 50);
          // Check for common error patterns
          if (this.hasContextError(term, context)) {
            incorrect.push(term);
          } else {
            correct.push(term);
          }
        }
      }
    }

    return { correct, incorrect };
  }

  /**
   * Check for common contextual errors
   */
  private hasContextError(term: string, context: string): boolean {
    // Simple error patterns - would be more sophisticated in production
    const errorPatterns: Record<string, RegExp[]> = {
      chmod: [/chmod\s+\d{4}/], // 4-digit permission is wrong
      subnet: [/subnet\s+mask\s+\/\d/], // CIDR notation with "mask" is confused
      tcp: [/tcp\s+is\s+connectionless/], // TCP is connection-oriented
      udp: [/udp\s+is\s+connection-oriented/], // UDP is connectionless
    };

    const patterns = errorPatterns[term];
    if (patterns === undefined) {
      return false;
    }

    return patterns.some((p) => p.test(context.toLowerCase()));
  }

  /**
   * Analyze code blocks in response
   */
  private analyzeCode(text: string): CodeAnalysis | null {
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    const blocks: { language: string; code: string }[] = [];

    let match: RegExpExecArray | null;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      blocks.push({
        language: match[1] ?? 'unknown',
        code: match[2] ?? '',
      });
    }

    if (blocks.length === 0) {
      return null;
    }

    const languages = [...new Set(blocks.map((b) => b.language).filter((l) => l.length > 0))];
    const allCode = blocks.map((b) => b.code).join('\n');
    const lineCount = allCode.split('\n').filter((l) => l.trim().length > 0).length;
    const hasComments = allCode.includes('//') || allCode.includes('#') || allCode.includes('/*');

    return {
      blockCount: blocks.length,
      languages,
      syntaxValid: true, // Would need actual parser in production
      hasComments,
      lineCount,
    };
  }

  /**
   * Score the structure of the response
   */
  private scoreStructure(text: string): number {
    let score = 0;
    const maxScore = 5;

    // Has paragraphs (logical grouping)
    if (text.includes('\n\n')) {
      score += 1;
    }

    // Has headers or bullet points
    if (/^[#\-*\d.]\s/m.test(text)) {
      score += 1;
    }

    // Has code blocks
    if (text.includes('```')) {
      score += 1;
    }

    // Reasonable length (not too short or too long)
    const wordCount = text.split(/\s+/).length;
    if (wordCount >= 20 && wordCount <= 500) {
      score += 1;
    }

    // Has conclusion/summary language
    if (/\b(in conclusion|summary|therefore|finally)\b/i.test(text)) {
      score += 1;
    }

    return score / maxScore;
  }
}

/**
 * Extract correctness signals from a response compared to expected answer
 */
export function extractCorrectnessSignals(
  response: string,
  expectedKeywords: readonly string[]
): {
  matchedKeywords: string[];
  missingKeywords: string[];
  matchRate: number;
} {
  const responseLower = response.toLowerCase();
  const matched: string[] = [];
  const missing: string[] = [];

  for (const keyword of expectedKeywords) {
    if (responseLower.includes(keyword.toLowerCase())) {
      matched.push(keyword);
    } else {
      missing.push(keyword);
    }
  }

  return {
    matchedKeywords: matched,
    missingKeywords: missing,
    matchRate: expectedKeywords.length > 0 ? matched.length / expectedKeywords.length : 0,
  };
}
