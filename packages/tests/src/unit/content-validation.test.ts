/**
 * Content Validation Unit Tests (TS-TEST-010)
 *
 * Tests for content pack schema validation and business rules.
 */

import { describe, it, expect } from 'vitest';
import { ContentPackValidator, validateContentPack } from '@topshelf/content-authoring';
import type { ContentPackManifest } from '@topshelf/shared';

describe('ContentPackValidator', () => {
  const validPack: ContentPackManifest = {
    id: 'pack-test-v1',
    name: 'Test Content Pack',
    version: '1.0.0',
    description: 'A valid test content pack',
    tags: ['required'],
    roleMappings: ['badge-test-v1'],
    difficulty: 'beginner',
    minDeviceProfile: {
      ramMb: 1024,
      networkKbps: 200,
    },
    teachingBlocks: [
      {
        id: 'tb-test-001',
        concept: 'Test Concept',
        mode: 'L0',
        canonicalSolution: '```bash\necho "Hello"\n```',
        explanation: 'This is the explanation',
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
        hints: ['Hint 1', 'Hint 2'],
        commonErrors: [],
      },
    ],
    author: 'Test Author',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    signature: 'sig-test',
    signingKeyId: 'key-test-001',
    schemaVersion: '1.0.0',
  };

  it('should validate a correct content pack', () => {
    const result = validateContentPack(validPack);

    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should reject pack with missing role mappings for required tag', () => {
    const invalidPack = {
      ...validPack,
      roleMappings: [], // Missing role mappings
    };

    const result = validateContentPack(invalidPack);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'MISSING_ROLE_MAPPING')).toBe(true);
  });

  it('should reject pack with less than 2 surface variants', () => {
    const invalidPack: ContentPackManifest = {
      ...validPack,
      teachingBlocks: [
        {
          ...validPack.teachingBlocks[0]!,
          surfaceVariants: [{ id: 'v1', description: 'Only one', data: {} }], // Only 1 variant
        },
      ],
    };

    const result = validateContentPack(invalidPack);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject pack with duplicate teaching block IDs', () => {
    const invalidPack: ContentPackManifest = {
      ...validPack,
      teachingBlocks: [
        validPack.teachingBlocks[0]!,
        { ...validPack.teachingBlocks[0]!, concept: 'Duplicate' }, // Same ID
      ],
    };

    const result = validateContentPack(invalidPack);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'DUPLICATE_BLOCK_ID')).toBe(true);
  });

  it('should reject pack with missing prerequisite', () => {
    const invalidPack: ContentPackManifest = {
      ...validPack,
      teachingBlocks: [
        {
          ...validPack.teachingBlocks[0]!,
          prerequisites: ['tb-nonexistent' as `tb-${string}`], // Non-existent prerequisite
        },
      ],
    };

    const result = validateContentPack(invalidPack);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'MISSING_PREREQUISITE')).toBe(true);
  });

  it('should warn about large packs', () => {
    const largePack: ContentPackManifest = {
      ...validPack,
      teachingBlocks: Array(60)
        .fill(null)
        .map((_, i) => ({
          ...validPack.teachingBlocks[0]!,
          id: `tb-test-${i.toString().padStart(3, '0')}` as `tb-${string}`,
          concept: `Concept ${i}`,
        })),
    };

    const result = validateContentPack(largePack);

    expect(result.warnings.some((w) => w.code === 'LARGE_PACK')).toBe(true);
  });

  it('should validate signature format', () => {
    const invalidPack = {
      ...validPack,
      signature: 'invalid-signature', // Wrong format
    };

    const result = validateContentPack(invalidPack);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_SIGNATURE_FORMAT')).toBe(true);
  });

  it('should skip signature check when option is set', () => {
    const invalidPack = {
      ...validPack,
      signature: 'invalid-signature',
    };

    const result = validateContentPack(invalidPack, { skipSignatureCheck: true });

    expect(result.valid).toBe(true);
  });
});

describe('Content Pack Schema', () => {
  it('should reject invalid version format', () => {
    const invalidPack = {
      ...createMinimalPack(),
      version: 'invalid',
    };

    const result = validateContentPack(invalidPack);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'version')).toBe(true);
  });

  it('should reject invalid difficulty level', () => {
    const invalidPack = {
      ...createMinimalPack(),
      difficulty: 'super-hard', // Invalid
    };

    const result = validateContentPack(invalidPack);

    expect(result.valid).toBe(false);
  });

  it('should reject negative time budget', () => {
    const pack = createMinimalPack();
    pack.teachingBlocks[0]!.timeBudgetSeconds = -10;

    const result = validateContentPack(pack);

    expect(result.valid).toBe(false);
  });
});

function createMinimalPack(): ContentPackManifest {
  return {
    id: 'pack-minimal-v1',
    name: 'Minimal Pack',
    version: '1.0.0',
    description: 'Minimal valid pack',
    tags: ['elective'],
    roleMappings: [],
    difficulty: 'beginner',
    minDeviceProfile: { ramMb: 512, networkKbps: 100 },
    teachingBlocks: [
      {
        id: 'tb-min-001',
        concept: 'Minimal',
        mode: 'L0',
        canonicalSolution: 'solution',
        explanation: 'explanation',
        surfaceVariants: [
          { id: 'v1', description: 'V1', data: {} },
          { id: 'v2', description: 'V2', data: {} },
        ],
        timeBudgetSeconds: 60,
        difficulty: 'beginner',
        prerequisites: [],
        successCriteria: {
          minCorrectnessScore: 0.5,
          maxTimeSeconds: 120,
          maxRetries: 3,
          requiresExplanation: false,
        },
        hints: [],
        commonErrors: [],
      },
    ],
    author: 'Test',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    signature: 'sig-min',
    signingKeyId: 'key-min',
    schemaVersion: '1.0.0',
  };
}
