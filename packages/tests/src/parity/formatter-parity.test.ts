/**
 * Parity Tests (TS-TEST-010)
 *
 * Tests to ensure deterministic formatter output matches
 * across different environments and LLM outputs.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CanonicalFormatter,
  ParityValidator,
  ParityTestRunner,
  checkParity,
  createContentHash,
} from '@topshelf/deterministic-formatter';
import type { TeachingBlock } from '@topshelf/shared';

describe('CanonicalFormatter Determinism', () => {
  let formatter: CanonicalFormatter;

  beforeEach(() => {
    formatter = new CanonicalFormatter();
  });

  const sampleBlock: TeachingBlock = {
    id: 'tb-test-001',
    concept: 'Linux User Management',
    mode: 'L0',
    canonicalSolution: `\`\`\`bash
sudo useradd -m -s /bin/bash newuser
sudo passwd newuser
\`\`\``,
    explanation:
      'The useradd command creates a new user account. The -m flag creates a home directory, and -s specifies the login shell.',
    surfaceVariants: [
      { id: 'v1', description: 'Create system user', data: {} },
      { id: 'v2', description: 'Create user with specific UID', data: {} },
    ],
    timeBudgetSeconds: 180,
    difficulty: 'beginner',
    prerequisites: [],
    successCriteria: {
      minCorrectnessScore: 0.7,
      maxTimeSeconds: 360,
      maxRetries: 3,
      requiresExplanation: false,
    },
    hints: ['Use the useradd command', 'The -m flag creates home directory'],
    commonErrors: [],
  };

  it('should produce identical output on multiple runs', () => {
    const output1 = formatter.formatBlock(sampleBlock);
    const output2 = formatter.formatBlock(sampleBlock);

    expect(output1.contentHash).toBe(output2.contentHash);
    expect(output1.canonicalSolution).toBe(output2.canonicalSolution);
    expect(output1.explanation).toBe(output2.explanation);
    expect(output1.hints).toEqual(output2.hints);
  });

  it('should produce identical output with different formatter instances', () => {
    const formatter1 = new CanonicalFormatter();
    const formatter2 = new CanonicalFormatter();

    const output1 = formatter1.formatBlock(sampleBlock);
    const output2 = formatter2.formatBlock(sampleBlock);

    expect(output1.contentHash).toBe(output2.contentHash);
  });

  it('should produce different output for different input', () => {
    const modifiedBlock = {
      ...sampleBlock,
      concept: 'Modified Concept',
    };

    const output1 = formatter.formatBlock(sampleBlock);
    const output2 = formatter.formatBlock(modifiedBlock);

    expect(output1.contentHash).not.toBe(output2.contentHash);
  });

  it('should normalize whitespace consistently', () => {
    const blockWithExtraSpaces: TeachingBlock = {
      ...sampleBlock,
      explanation: 'Text   with    extra    spaces    and\ttabs',
    };

    const output = formatter.formatBlock(blockWithExtraSpaces);

    expect(output.explanation).not.toContain('  '); // No double spaces
    expect(output.explanation).not.toContain('\t'); // No tabs
  });

  it('should format code blocks consistently', () => {
    const output = formatter.formatBlock(sampleBlock);

    expect(output.canonicalSolution).toContain('```bash');
    expect(output.canonicalSolution).toContain('```');
  });

  it('should respect configured space indentation width', () => {
    const customFormatter = new CanonicalFormatter({ indentSize: 4 });
    const blockWithIndentation: TeachingBlock = {
      ...sampleBlock,
      canonicalSolution: `\`\`\`bash
    if true; then
        echo "indented"
    fi
\`\`\``,
    };

    const output = customFormatter.formatBlock(blockWithIndentation);

    expect(output.canonicalSolution).toContain('    if true; then');
    expect(output.canonicalSolution).toContain('        echo "indented"');
  });

  it('should include formatter version in output', () => {
    const output = formatter.formatBlock(sampleBlock);

    expect(output.formatterVersion).toBe('1.0.0');
  });
});

describe('ParityValidator', () => {
  let validator: ParityValidator;

  beforeEach(() => {
    validator = new ParityValidator();
  });

  const sampleBlock: TeachingBlock = {
    id: 'tb-test-001',
    concept: 'Test Concept',
    mode: 'L0',
    canonicalSolution: '```bash\necho "hello"\n```',
    explanation: 'Simple explanation',
    surfaceVariants: [
      { id: 'v1', description: 'Variant 1', data: {} },
      { id: 'v2', description: 'Variant 2', data: {} },
    ],
    timeBudgetSeconds: 180,
    difficulty: 'beginner',
    prerequisites: [],
    successCriteria: {
      minCorrectnessScore: 0.7,
      maxTimeSeconds: 360,
      maxRetries: 3,
      requiresExplanation: false,
    },
    hints: ['Hint 1'],
    commonErrors: [],
  };

  it('should pass parity check for identical outputs', () => {
    const formatter = new CanonicalFormatter();
    const formatted = formatter.formatBlock(sampleBlock);

    const llmOutput = {
      canonicalSolution: formatted.canonicalSolution,
      explanation: formatted.explanation,
      hints: [...formatted.hints],
      variantPrompts: [...formatted.variantPrompts],
    };

    const result = validator.validateBlock(sampleBlock, llmOutput);

    expect(result.passed).toBe(true);
    expect(result.divergenceCount).toBe(0);
  });

  it('should fail parity check for different outputs', () => {
    const llmOutput = {
      canonicalSolution: 'Completely different solution',
      explanation: 'Completely different explanation',
      hints: ['Different hint'],
      variantPrompts: ['Different variant'],
    };

    const result = validator.validateBlock(sampleBlock, llmOutput);

    expect(result.passed).toBe(false);
    expect(result.divergenceCount).toBeGreaterThan(0);
  });

  it('should detect hint count mismatch', () => {
    const formatter = new CanonicalFormatter();
    const formatted = formatter.formatBlock(sampleBlock);

    const llmOutput = {
      canonicalSolution: formatted.canonicalSolution,
      explanation: formatted.explanation,
      hints: [...formatted.hints, 'Extra hint'], // Different count
      variantPrompts: [...formatted.variantPrompts],
    };

    const result = validator.validateBlock(sampleBlock, llmOutput);

    expect(result.passed).toBe(false);
    expect(result.divergences.some((d) => d.field.includes('hints.length'))).toBe(true);
  });
});

describe('ParityTestRunner', () => {
  it('should aggregate results from multiple tests', () => {
    const runner = new ParityTestRunner();
    const formatter = new CanonicalFormatter();

    const block1: TeachingBlock = {
      id: 'tb-test-001',
      concept: 'Concept 1',
      mode: 'L0',
      canonicalSolution: 'solution 1',
      explanation: 'explanation 1',
      surfaceVariants: [
        { id: 'v1', description: 'V1', data: {} },
        { id: 'v2', description: 'V2', data: {} },
      ],
      timeBudgetSeconds: 180,
      difficulty: 'beginner',
      prerequisites: [],
      successCriteria: {
        minCorrectnessScore: 0.7,
        maxTimeSeconds: 360,
        maxRetries: 3,
        requiresExplanation: false,
      },
      hints: [],
      commonErrors: [],
    };

    const formatted1 = formatter.formatBlock(block1);
    const llmOutput1 = {
      canonicalSolution: formatted1.canonicalSolution,
      explanation: formatted1.explanation,
      hints: [...formatted1.hints],
      variantPrompts: [...formatted1.variantPrompts],
    };

    // Run tests
    runner.runTest(block1, llmOutput1); // Should pass
    runner.runTest(block1, { ...llmOutput1, explanation: 'Different' }); // Should fail

    const aggregate = runner.getAggregateResults();

    expect(aggregate.totalTests).toBe(2);
    expect(aggregate.passed).toBe(1);
    expect(aggregate.failed).toBe(1);
    expect(aggregate.passRate).toBe(0.5);
  });
});

describe('Content Hash', () => {
  it('should produce consistent hashes', () => {
    const content = 'Test content for hashing';

    const hash1 = createContentHash(content);
    const hash2 = createContentHash(content);

    expect(hash1).toBe(hash2);
  });

  it('should normalize content before hashing', () => {
    const content1 = 'Test content';
    const content2 = 'Test content  '; // Trailing spaces
    const content3 = 'Test content\r\n'; // Windows line ending

    const hash1 = createContentHash(content1);
    const hash2 = createContentHash(content2);
    const hash3 = createContentHash(content3);

    expect(hash1).toBe(hash2);
    expect(hash1).toBe(hash3);
  });
});

describe('checkParity utility', () => {
  it('should report matched for identical outputs', () => {
    const formatter = new CanonicalFormatter();
    const block: TeachingBlock = {
      id: 'tb-test-001',
      concept: 'Test',
      mode: 'L0',
      canonicalSolution: 'test',
      explanation: 'test',
      surfaceVariants: [
        { id: 'v1', description: 'V1', data: {} },
        { id: 'v2', description: 'V2', data: {} },
      ],
      timeBudgetSeconds: 60,
      difficulty: 'beginner',
      prerequisites: [],
      successCriteria: {
        minCorrectnessScore: 0.7,
        maxTimeSeconds: 120,
        maxRetries: 3,
        requiresExplanation: false,
      },
      hints: [],
      commonErrors: [],
    };

    const output1 = formatter.formatBlock(block);
    const output2 = formatter.formatBlock(block);

    const result = checkParity(output1, output2);

    expect(result.matched).toBe(true);
    expect(result.divergences.length).toBe(0);
  });
});
