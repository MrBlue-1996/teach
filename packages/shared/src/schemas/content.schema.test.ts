/**
 * TopShelf Content Schema - Comprehensive Test Suite
 *
 * Tests for content pack schema validation including teaching blocks,
 * surface variants, success criteria, and manifest validation.
 */

import { describe, it, expect } from 'vitest';
import kitchenImageManifest from '../../../../apps/web/public/kitchen/manifest.json';
import {
  contentPackIdSchema,
  teachingBlockIdSchema,
  badgeIdSchema,
  roleIdSchema,
  difficultyLevelSchema,
  contentTagSchema,
  challengeStimulusSchema,
  kitchenImageManifestSchema,
  minDeviceProfileSchema,
  surfaceVariantSchema,
  successCriteriaSchema,
  commonErrorSchema,
  teachingBlockSchema,
  semanticVersionSchema,
  contentPackManifestSchema,
  contentPackRevocationSchema,
} from './content.schema.js';

// =============================================================================
// ID SCHEMA VALIDATION
// =============================================================================

describe('ID Schemas', () => {
  describe('contentPackIdSchema', () => {
    it('should accept valid content pack IDs', () => {
      expect(contentPackIdSchema.safeParse('pack-linux-v1').success).toBe(true);
      expect(contentPackIdSchema.safeParse('pack-abc-123').success).toBe(true);
      expect(contentPackIdSchema.safeParse('pack-test_pack').success).toBe(true);
    });

    it('should reject IDs without pack- prefix', () => {
      expect(contentPackIdSchema.safeParse('linux-v1').success).toBe(false);
      expect(contentPackIdSchema.safeParse('').success).toBe(false);
    });

    it('should reject IDs with invalid characters', () => {
      expect(contentPackIdSchema.safeParse('pack-invalid spaces').success).toBe(false);
      expect(contentPackIdSchema.safeParse('pack-special!chars').success).toBe(false);
    });
  });

  describe('teachingBlockIdSchema', () => {
    it('should accept valid teaching block IDs', () => {
      expect(teachingBlockIdSchema.safeParse('tb-linux-001').success).toBe(true);
      expect(teachingBlockIdSchema.safeParse('tb-test_block-1').success).toBe(true);
    });

    it('should reject IDs without tb- prefix', () => {
      expect(teachingBlockIdSchema.safeParse('block-001').success).toBe(false);
    });
  });

  describe('badgeIdSchema', () => {
    it('should accept valid badge IDs', () => {
      expect(badgeIdSchema.safeParse('badge-linux-admin-v1').success).toBe(true);
    });

    it('should reject IDs without badge- prefix', () => {
      expect(badgeIdSchema.safeParse('linux-admin-v1').success).toBe(false);
    });
  });

  describe('roleIdSchema', () => {
    it('should accept valid role IDs', () => {
      expect(roleIdSchema.safeParse('role-admin-001').success).toBe(true);
    });

    it('should reject IDs without role- prefix', () => {
      expect(roleIdSchema.safeParse('admin-001').success).toBe(false);
    });
  });
});

// =============================================================================
// ENUM SCHEMAS
// =============================================================================

describe('Enum Schemas', () => {
  describe('difficultyLevelSchema', () => {
    it('should accept valid difficulty levels', () => {
      expect(difficultyLevelSchema.safeParse('beginner').success).toBe(true);
      expect(difficultyLevelSchema.safeParse('intermediate').success).toBe(true);
      expect(difficultyLevelSchema.safeParse('advanced').success).toBe(true);
      expect(difficultyLevelSchema.safeParse('expert').success).toBe(true);
    });

    it('should reject invalid difficulty levels', () => {
      expect(difficultyLevelSchema.safeParse('super-hard').success).toBe(false);
      expect(difficultyLevelSchema.safeParse('').success).toBe(false);
      expect(difficultyLevelSchema.safeParse('BEGINNER').success).toBe(false);
    });
  });

  describe('contentTagSchema', () => {
    it('should accept all valid tags', () => {
      expect(contentTagSchema.safeParse('required').success).toBe(true);
      expect(contentTagSchema.safeParse('recommended').success).toBe(true);
      expect(contentTagSchema.safeParse('elective').success).toBe(true);
      expect(contentTagSchema.safeParse('capstone').success).toBe(true);
      expect(contentTagSchema.safeParse('retention').success).toBe(true);
      expect(contentTagSchema.safeParse('optional').success).toBe(true);
    });

    it('should reject invalid tags', () => {
      expect(contentTagSchema.safeParse('').success).toBe(false);
      expect(contentTagSchema.safeParse('x'.repeat(51)).success).toBe(false);
    });
  });
});

// =============================================================================
// OBJECT SCHEMAS
// =============================================================================

describe('Object Schemas', () => {
  describe('minDeviceProfileSchema', () => {
    it('should accept a valid device profile', () => {
      const profile = {
        ramMb: 1024,
        networkKbps: 200,
        requiresWebGL: false,
        requiresWebGPU: false,
        requiresWasm: false,
      };
      expect(minDeviceProfileSchema.safeParse(profile).success).toBe(true);
    });

    it('should accept profile with only required fields', () => {
      const profile = { ramMb: 512, networkKbps: 100 };
      expect(minDeviceProfileSchema.safeParse(profile).success).toBe(true);
    });

    it('should reject profile with RAM below minimum', () => {
      const profile = { ramMb: 100, networkKbps: 200 }; // 100 < 256
      expect(minDeviceProfileSchema.safeParse(profile).success).toBe(false);
    });

    it('should reject extra properties (strict)', () => {
      const profile = { ramMb: 1024, networkKbps: 200, extraField: true };
      expect(minDeviceProfileSchema.safeParse(profile).success).toBe(false);
    });
  });

  describe('surfaceVariantSchema', () => {
    it('should accept a valid surface variant', () => {
      const variant = { id: 'v1', description: 'Test variant', data: { key: 'value' } };
      expect(surfaceVariantSchema.safeParse(variant).success).toBe(true);
    });

    it('should reject variant with empty id', () => {
      const variant = { id: '', description: 'Test', data: {} };
      expect(surfaceVariantSchema.safeParse(variant).success).toBe(false);
    });

    it('should reject variant with empty description', () => {
      const variant = { id: 'v1', description: '', data: {} };
      expect(surfaceVariantSchema.safeParse(variant).success).toBe(false);
    });
  });

  describe('successCriteriaSchema', () => {
    it('should accept valid success criteria', () => {
      const criteria = {
        minCorrectnessScore: 0.7,
        maxTimeSeconds: 600,
        maxRetries: 3,
        requiresExplanation: false,
      };
      expect(successCriteriaSchema.safeParse(criteria).success).toBe(true);
    });

    it('should reject correctness score above 1', () => {
      const criteria = {
        minCorrectnessScore: 1.5,
        maxTimeSeconds: 600,
        maxRetries: 3,
        requiresExplanation: false,
      };
      expect(successCriteriaSchema.safeParse(criteria).success).toBe(false);
    });

    it('should reject negative max time', () => {
      const criteria = {
        minCorrectnessScore: 0.7,
        maxTimeSeconds: -10,
        maxRetries: 3,
        requiresExplanation: false,
      };
      expect(successCriteriaSchema.safeParse(criteria).success).toBe(false);
    });
  });

  describe('commonErrorSchema', () => {
    it('should accept a valid common error', () => {
      const error = {
        pattern: 'adduser instead of useradd',
        description: 'Used wrong command',
        remediation: 'Use useradd for portability',
      };
      expect(commonErrorSchema.safeParse(error).success).toBe(true);
    });

    it('should accept common error with related block', () => {
      const error = {
        pattern: 'error pattern',
        description: 'desc',
        remediation: 'fix it',
        relatedBlockId: 'tb-related-001',
      };
      expect(commonErrorSchema.safeParse(error).success).toBe(true);
    });

    it('should reject empty pattern', () => {
      const error = { pattern: '', description: 'desc', remediation: 'fix' };
      expect(commonErrorSchema.safeParse(error).success).toBe(false);
    });
  });
});

describe('challengeStimulusSchema', () => {
  it('accepts ticket variant', () => {
    const result = challengeStimulusSchema.safeParse({
      kind: 'ticket',
      table: 'TABLE 7',
      items: [{ quantity: 1, name: 'Skirt Steak Fajitas', cookTimeSeconds: 720 }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts station_state variant', () => {
    const result = challengeStimulusSchema.safeParse({
      kind: 'station_state',
      observations: ['Rail half-empty', 'Station messy'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts step_bank variant', () => {
    const result = challengeStimulusSchema.safeParse({
      kind: 'step_bank',
      steps: ['stage tools', 'wash hands'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts image variant', () => {
    const result = challengeStimulusSchema.safeParse({
      kind: 'image',
      imageRef: 'EQ1-equipment/grill',
      altText: 'Commercial grill at service temperature',
      caption: 'Check the hot zone before service.',
      focusRegions: [{ label: 'Hot zone', xPct: 10, yPct: 20, widthPct: 30, heightPct: 40 }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects image variant without altText', () => {
    const result = challengeStimulusSchema.safeParse({
      kind: 'image',
      imageRef: 'EQ1-equipment/grill',
    });
    expect(result.success).toBe(false);
  });

  it('rejects image variant with whitespace-only altText', () => {
    const result = challengeStimulusSchema.safeParse({
      kind: 'image',
      imageRef: 'EQ1-equipment/grill',
      altText: '    ',
    });
    expect(result.success).toBe(false);
  });

  it('rejects ticket with empty items', () => {
    const result = challengeStimulusSchema.safeParse({
      kind: 'ticket',
      table: 'TABLE 7',
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown stimulus kind', () => {
    const result = challengeStimulusSchema.safeParse({
      kind: 'video',
      url: 'https://example.com',
    });
    expect(result.success).toBe(false);
  });
});

describe('kitchenImageManifestSchema', () => {
  it('validates the shipped kitchen image manifest', () => {
    const result = kitchenImageManifestSchema.safeParse(kitchenImageManifest);
    expect(result.success).toBe(true);
  });

  it('rejects extension-based manifest keys', () => {
    const result = kitchenImageManifestSchema.safeParse({
      schemaVersion: '1.0.0',
      entries: {
        'EQ1-equipment/grill.webp': {
          path: '/kitchen/_demo/EQ1-equipment/grill.svg',
          altText: 'Commercial grill at service temperature',
          sourceDataStatus: 'demo',
          licenseRef: null,
          tags: ['equipment'],
        },
      },
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// TEACHING BLOCK SCHEMA
// =============================================================================

describe('teachingBlockSchema', () => {
  function createValidBlock(): Record<string, unknown> {
    return {
      id: 'tb-test-001',
      concept: 'Test Concept',
      mode: 'L0',
      canonicalSolution: 'echo "hello"',
      explanation: 'This is an explanation.',
      surfaceVariants: [
        { id: 'v1', description: 'Variant 1', data: {} },
        { id: 'v2', description: 'Variant 2', data: {} },
      ],
      timeBudgetSeconds: 300,
      difficulty: 'beginner',
      prerequisites: [],
      successCriteria: {
        minCorrectnessScore: 0.7,
        maxTimeSeconds: 600,
        maxRetries: 3,
        requiresExplanation: false,
      },
      hints: ['Hint 1'],
      commonErrors: [],
    };
  }

  it('should accept a valid teaching block', () => {
    const block = createValidBlock();
    expect(teachingBlockSchema.safeParse(block).success).toBe(true);
  });

  it('should reject block with fewer than 2 surface variants', () => {
    const block = {
      ...createValidBlock(),
      surfaceVariants: [{ id: 'v1', description: 'Only one', data: {} }],
    };
    expect(teachingBlockSchema.safeParse(block).success).toBe(false);
  });

  it('should reject block with invalid learning mode', () => {
    const block = { ...createValidBlock(), mode: 'L5' };
    expect(teachingBlockSchema.safeParse(block).success).toBe(false);
  });

  it('should reject block with time budget below minimum', () => {
    const block = { ...createValidBlock(), timeBudgetSeconds: 10 }; // min is 30
    expect(teachingBlockSchema.safeParse(block).success).toBe(false);
  });

  it('should reject block with time budget above maximum', () => {
    const block = { ...createValidBlock(), timeBudgetSeconds: 10000 }; // max is 7200
    expect(teachingBlockSchema.safeParse(block).success).toBe(false);
  });

  it('should accept block with prerequisites', () => {
    const block = { ...createValidBlock(), prerequisites: ['tb-prereq-001'] };
    expect(teachingBlockSchema.safeParse(block).success).toBe(true);
  });

  it('should reject block with empty concept', () => {
    const block = { ...createValidBlock(), concept: '' };
    expect(teachingBlockSchema.safeParse(block).success).toBe(false);
  });

  it('should reject block with empty canonical solution', () => {
    const block = { ...createValidBlock(), canonicalSolution: '' };
    expect(teachingBlockSchema.safeParse(block).success).toBe(false);
  });
});

// =============================================================================
// SEMANTIC VERSION SCHEMA
// =============================================================================

describe('semanticVersionSchema', () => {
  it('should accept valid semantic versions', () => {
    expect(semanticVersionSchema.safeParse('1.0.0').success).toBe(true);
    expect(semanticVersionSchema.safeParse('0.1.0').success).toBe(true);
    expect(semanticVersionSchema.safeParse('10.20.30').success).toBe(true);
    expect(semanticVersionSchema.safeParse('1.0.0-alpha').success).toBe(true);
    expect(semanticVersionSchema.safeParse('1.0.0-beta.1').success).toBe(true);
    expect(semanticVersionSchema.safeParse('1.0.0-alpha-1').success).toBe(true);
    expect(semanticVersionSchema.safeParse('1.0.0-rc.1-beta').success).toBe(true);
  });

  it('should reject invalid versions', () => {
    expect(semanticVersionSchema.safeParse('1.0').success).toBe(false);
    expect(semanticVersionSchema.safeParse('v1.0.0').success).toBe(false);
    expect(semanticVersionSchema.safeParse('invalid').success).toBe(false);
    expect(semanticVersionSchema.safeParse('').success).toBe(false);
  });
});

// =============================================================================
// CONTENT PACK MANIFEST SCHEMA
// =============================================================================

describe('contentPackManifestSchema', () => {
  function createValidManifest(): Record<string, unknown> {
    return {
      id: 'pack-test-v1',
      name: 'Test Pack',
      version: '1.0.0',
      description: 'A test content pack',
      tags: ['elective'] as const,
      roleMappings: [] as string[],
      difficulty: 'beginner' as const,
      minDeviceProfile: { ramMb: 1024, networkKbps: 200 },
      teachingBlocks: [
        {
          id: 'tb-test-001',
          concept: 'Test',
          mode: 'L0' as const,
          canonicalSolution: 'solution',
          explanation: 'explanation',
          surfaceVariants: [
            { id: 'v1', description: 'V1', data: {} },
            { id: 'v2', description: 'V2', data: {} },
          ],
          timeBudgetSeconds: 120,
          difficulty: 'beginner' as const,
          prerequisites: [] as string[],
          successCriteria: {
            minCorrectnessScore: 0.7,
            maxTimeSeconds: 300,
            maxRetries: 3,
            requiresExplanation: false,
          },
          hints: ['hint'] as string[],
          commonErrors: [] as Array<{ pattern: string; description: string; remediation: string }>,
        },
      ],
      author: 'Test Author',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      signature: 'sig-test-001',
      signingKeyId: 'key-001',
      schemaVersion: '1.0.0',
    };
  }

  it('should accept a valid content pack manifest', () => {
    const manifest = createValidManifest();
    const result = contentPackManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('should reject manifest with no teaching blocks', () => {
    const manifest = { ...createValidManifest(), teachingBlocks: [] };
    const result = contentPackManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('should reject manifest with required tag but no role mappings', () => {
    const manifest = {
      ...createValidManifest(),
      tags: ['required'] as const,
      roleMappings: [],
    };
    const result = contentPackManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('should accept manifest with required tag and role mappings', () => {
    const manifest = {
      ...createValidManifest(),
      tags: ['required'] as const,
      roleMappings: ['badge-test-v1'],
    };
    const result = contentPackManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('should reject manifest with invalid version', () => {
    const manifest = { ...createValidManifest(), version: 'invalid' };
    const result = contentPackManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('should reject manifest with invalid difficulty', () => {
    const manifest = { ...createValidManifest(), difficulty: 'super-hard' };
    const result = contentPackManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('should reject manifest with missing name', () => {
    const manifest = createValidManifest();
    delete (manifest as any).name;
    const result = contentPackManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('should reject manifest with invalid datetime', () => {
    const manifest = { ...createValidManifest(), createdAt: 'not-a-date' };
    const result = contentPackManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('should reject extra properties (strict mode)', () => {
    const manifest = { ...createValidManifest(), extraProp: 'disallowed' };
    const result = contentPackManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// CONTENT PACK REVOCATION SCHEMA
// =============================================================================

describe('contentPackRevocationSchema', () => {
  it('should accept a valid revocation', () => {
    const revocation = {
      packId: 'pack-test-v1',
      version: '1.0.0',
      reason: 'Security vulnerability found',
      revokedAt: '2026-03-25T00:00:00Z',
    };
    expect(contentPackRevocationSchema.safeParse(revocation).success).toBe(true);
  });

  it('should accept revocation with replacement pack', () => {
    const revocation = {
      packId: 'pack-old-v1',
      version: '1.0.0',
      reason: 'Replaced by updated version',
      revokedAt: '2026-03-25T00:00:00Z',
      replacementPackId: 'pack-new-v2',
    };
    expect(contentPackRevocationSchema.safeParse(revocation).success).toBe(true);
  });

  it('should reject revocation with empty reason', () => {
    const revocation = {
      packId: 'pack-test-v1',
      version: '1.0.0',
      reason: '',
      revokedAt: '2026-03-25T00:00:00Z',
    };
    expect(contentPackRevocationSchema.safeParse(revocation).success).toBe(false);
  });
});
