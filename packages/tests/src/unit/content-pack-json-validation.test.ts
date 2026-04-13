/**
 * Content Pack JSON Validation Test Suite
 *
 * Validates the actual content pack JSON files in content-packs/
 * against the content pack manifest schema. Ensures data integrity
 * and schema compliance of shipped content.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  contentPackManifestSchema,
  teachingBlockSchema,
  contentPackIdSchema,
  teachingBlockIdSchema,
  semanticVersionSchema,
  difficultyLevelSchema,
  learningModeSchema,
} from '@topshelf/shared';

const CONTENT_PACKS_DIR = join(__dirname, '../../../../content-packs');

type LooseTeachingBlock = {
  id?: unknown;
  mode?: unknown;
  surfaceVariants?: readonly unknown[];
  timeBudgetSeconds?: unknown;
  prerequisites?: readonly unknown[];
};

type LooseContentPack = {
  id?: unknown;
  name?: unknown;
  version?: unknown;
  difficulty?: unknown;
  teachingBlocks?: readonly LooseTeachingBlock[];
  tags?: readonly unknown[];
  roleMappings?: readonly unknown[];
};

function asLooseContentPack(value: unknown): LooseContentPack | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  return value as LooseContentPack;
}

function loadContentPack(filename: string): unknown {
  const filePath = join(CONTENT_PACKS_DIR, filename);
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

// =============================================================================
// LINUX CONTENT PACK
// =============================================================================

describe('Linux Fundamentals Content Pack (content_pack_linux_v1.json)', () => {
  let pack: LooseContentPack | null;

  try {
    pack = asLooseContentPack(loadContentPack('content_pack_linux_v1.json'));
  } catch {
    pack = null;
  }

  it('should be loadable as valid JSON', () => {
    expect(pack).not.toBeNull();
    expect(typeof pack).toBe('object');
  });

  it('should have a valid content pack ID', () => {
    if (pack === null) return;
    expect(contentPackIdSchema.safeParse(pack.id).success).toBe(true);
  });

  it('should have a valid semantic version', () => {
    if (pack === null) return;
    expect(semanticVersionSchema.safeParse(pack.version).success).toBe(true);
  });

  it('should have a valid difficulty level', () => {
    if (pack === null) return;
    expect(difficultyLevelSchema.safeParse(pack.difficulty).success).toBe(true);
  });

  it('should have at least one teaching block', () => {
    if (pack === null) return;
    expect(Array.isArray(pack.teachingBlocks)).toBe(true);
    expect((pack.teachingBlocks ?? []).length).toBeGreaterThan(0);
  });

  it('should have unique teaching block IDs', () => {
    if (pack === null) return;
    const blockIds = (pack.teachingBlocks ?? []).map((block) => block.id);
    const uniqueIds = new Set(blockIds);
    expect(uniqueIds.size).toBe(blockIds.length);
  });

  it('each teaching block should have a valid ID format', () => {
    if (pack === null) return;
    for (const block of pack.teachingBlocks ?? []) {
      expect(teachingBlockIdSchema.safeParse(block.id).success).toBe(true);
    }
  });

  it('each teaching block should have a valid learning mode', () => {
    if (pack === null) return;
    for (const block of pack.teachingBlocks ?? []) {
      expect(learningModeSchema.safeParse(block.mode).success).toBe(true);
    }
  });

  it('each teaching block should have at least 2 surface variants', () => {
    if (pack === null) return;
    for (const block of pack.teachingBlocks ?? []) {
      expect(Array.isArray(block.surfaceVariants)).toBe(true);
      expect((block.surfaceVariants ?? []).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('each teaching block should have valid time budget', () => {
    if (pack === null) return;
    for (const block of pack.teachingBlocks ?? []) {
      expect(block.timeBudgetSeconds).toBeGreaterThanOrEqual(30);
      expect(block.timeBudgetSeconds).toBeLessThanOrEqual(7200);
    }
  });

  it('prerequisites should reference existing blocks', () => {
    if (pack === null) return;
    const teachingBlocks = pack.teachingBlocks ?? [];
    const blockIds = new Set(teachingBlocks.map((block) => block.id));
    for (const block of teachingBlocks) {
      for (const prereq of block.prerequisites ?? []) {
        expect(blockIds.has(prereq)).toBe(true);
      }
    }
  });

  it('should have required role mappings when tagged as required', () => {
    if (pack === null) return;
    if ((pack.tags ?? []).includes('required')) {
      expect((pack.roleMappings ?? []).length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// NETWORK+ CONTENT PACK
// =============================================================================

describe('Network+ Content Pack (content_pack_networkplus_v1.json)', () => {
  let pack: LooseContentPack | null;

  try {
    pack = asLooseContentPack(loadContentPack('content_pack_networkplus_v1.json'));
  } catch {
    pack = null;
  }

  it('should be loadable as valid JSON', () => {
    expect(pack).not.toBeNull();
    expect(typeof pack).toBe('object');
  });

  it('should have a valid content pack ID', () => {
    if (pack === null) return;
    expect(contentPackIdSchema.safeParse(pack.id).success).toBe(true);
  });

  it('should have a valid semantic version', () => {
    if (pack === null) return;
    expect(semanticVersionSchema.safeParse(pack.version).success).toBe(true);
  });

  it('should have unique teaching block IDs', () => {
    if (pack === null) return;
    const blockIds = (pack.teachingBlocks ?? []).map((block) => block.id);
    const uniqueIds = new Set(blockIds);
    expect(uniqueIds.size).toBe(blockIds.length);
  });

  it('each teaching block should have at least 2 surface variants', () => {
    if (pack === null) return;
    for (const block of pack.teachingBlocks ?? []) {
      expect((block.surfaceVariants ?? []).length).toBeGreaterThanOrEqual(2);
    }
  });
});

// =============================================================================
// TEMPLATE CONTENT PACK
// =============================================================================

describe('Template Content Pack (template_content_pack.json)', () => {
  let pack: LooseContentPack | null;

  try {
    pack = asLooseContentPack(loadContentPack('template_content_pack.json'));
  } catch {
    pack = null;
  }

  it('should be loadable as valid JSON', () => {
    expect(pack).not.toBeNull();
  });

  it('should have a valid structure', () => {
    if (pack === null) return;
    expect(pack.id).toBeDefined();
    expect(pack.name).toBeDefined();
    expect(pack.version).toBeDefined();
  });
});

// =============================================================================
// SCHEMA EDGE CASES FOR CONTENT PACKS
// =============================================================================

describe('Content Pack Schema Edge Cases', () => {
  it('should reject pack with empty name', () => {
    const result = contentPackManifestSchema.safeParse({
      id: 'pack-test-v1',
      name: '',
      version: '1.0.0',
      description: 'desc',
      tags: ['elective'],
      roleMappings: [],
      difficulty: 'beginner',
      minDeviceProfile: { ramMb: 1024, networkKbps: 100 },
      teachingBlocks: [createMinimalBlock()],
      author: 'Author',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      signature: 'sig',
      signingKeyId: 'key',
      schemaVersion: '1.0.0',
    });
    expect(result.success).toBe(false);
  });

  it('should reject pack with malformed teaching block (missing concept)', () => {
    const block = createMinimalBlock();
    delete (block as any).concept;

    const result = teachingBlockSchema.safeParse(block);
    expect(result.success).toBe(false);
  });

  it('should reject pack with teaching block having invalid difficulty', () => {
    const block = { ...createMinimalBlock(), difficulty: 'impossible' };
    const result = teachingBlockSchema.safeParse(block);
    expect(result.success).toBe(false);
  });

  it('should reject correctness score below 0', () => {
    const block = {
      ...createMinimalBlock(),
      successCriteria: {
        minCorrectnessScore: -0.1,
        maxTimeSeconds: 300,
        maxRetries: 3,
        requiresExplanation: false,
      },
    };
    const result = teachingBlockSchema.safeParse(block);
    expect(result.success).toBe(false);
  });
});

function createMinimalBlock(): Record<string, unknown> {
  return {
    id: 'tb-min-001',
    concept: 'Minimal Concept',
    mode: 'L0',
    canonicalSolution: 'solution text',
    explanation: 'explanation text',
    surfaceVariants: [
      { id: 'v1', description: 'V1', data: {} },
      { id: 'v2', description: 'V2', data: {} },
    ],
    timeBudgetSeconds: 120,
    difficulty: 'beginner',
    prerequisites: [],
    successCriteria: {
      minCorrectnessScore: 0.7,
      maxTimeSeconds: 300,
      maxRetries: 3,
      requiresExplanation: false,
    },
    hints: [],
    commonErrors: [],
  };
}
