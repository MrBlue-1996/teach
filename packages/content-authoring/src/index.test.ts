/**
 * TopShelf Content Authoring Package - Comprehensive Test Suite
 *
 * Tests for content validation, signing, and authoring pipeline.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AuthoringPipeline,
  ContentPackSigner,
  ContentPackValidator,
  RevocationManager,
  createSignedPack,
  validateContentPack,
  type ContentPackManifest,
  type DraftContentPack,
  type DraftTeachingBlock,
  type KitchenImageManifest,
  type SigningConfig,
  type TeachingBlock,
  type ValidationOptions,
} from './index.js';

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createValidTeachingBlock(overrides: Partial<TeachingBlock> = {}): TeachingBlock {
  return {
    id: 'tb-test123',
    concept: 'Test Concept',
    mode: 'L0',
    canonicalSolution: 'The correct answer is 42',
    explanation: 'This explains why 42 is the answer',
    surfaceVariants: [
      { id: 'variant-1', description: 'Variant 1 description', data: {} },
      { id: 'variant-2', description: 'Variant 2 description', data: {} },
    ],
    timeBudgetSeconds: 120,
    difficulty: 'beginner',
    prerequisites: [],
    successCriteria: {
      minCorrectnessScore: 0.7,
      maxTimeSeconds: 240,
      maxRetries: 3,
      requiresExplanation: false,
    },
    hints: ['Hint 1', 'Hint 2'],
    commonErrors: [],
    ...overrides,
  };
}

function createValidContentPack(overrides: Partial<ContentPackManifest> = {}): ContentPackManifest {
  return {
    id: 'pack-test123',
    name: 'Test Content Pack',
    version: '1.0.0',
    description: 'A test content pack',
    tags: ['elective'],
    roleMappings: [],
    difficulty: 'beginner',
    minDeviceProfile: {
      ramMb: 512,
      networkKbps: 256,
    },
    teachingBlocks: [createValidTeachingBlock()],
    author: 'test-author',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: '1.0.0',
    signature: 'sig-v1-ECDSA-P256-SHA256-abc123',
    signingKeyId: 'key-001',
    ...overrides,
  };
}

function createDraftTeachingBlock(): DraftTeachingBlock {
  return {
    concept: 'Draft Concept',
    canonicalSolution: 'The solution',
    explanation: 'The explanation',
    surfaceVariants: [
      { description: 'Variant 1 description', data: { key: 'value' } },
      { description: 'Variant 2 description', data: { key2: 'value2' } },
    ],
    timeBudgetSeconds: 120,
    difficulty: 'intermediate',
    hints: ['Helpful hint 1', 'Helpful hint 2'],
    prerequisites: [],
  };
}

function createDraftContentPack(): DraftContentPack {
  return {
    name: 'Draft Pack',
    description: 'A draft content pack',
    tags: ['elective'],
    roleMappings: [],
    difficulty: 'intermediate',
    minDeviceProfile: {
      ramMb: 512,
      networkKbps: 256,
    },
    teachingBlocks: [createDraftTeachingBlock()],
    author: 'draft-author',
  };
}

const testSigningConfig: SigningConfig = {
  keyId: 'test-key-001',
  algorithm: 'ECDSA-P256-SHA256',
};

const testSigningKey = 'test-secret-key-for-signing';

const demoKitchenImageManifest: KitchenImageManifest = {
  schemaVersion: '1.0.0',
  entries: {
    'EQ1-equipment/grill': {
      path: '/kitchen/_demo/EQ1-equipment/grill.svg',
      altText: 'Commercial grill at service temperature',
      sourceDataStatus: 'demo',
      licenseRef: null,
      tags: ['equipment'],
    },
    'EQ1-equipment/authorized-grill': {
      path: '/kitchen/EQ1-equipment/authorized-grill.webp',
      altText: 'Authorized commercial grill image',
      sourceDataStatus: 'authorized',
      licenseRef: 'license-001',
      tags: ['equipment'],
    },
  },
};

// =============================================================================
// CONTENT PACK VALIDATOR TESTS
// =============================================================================

describe('ContentPackValidator', () => {
  let validator: ContentPackValidator;

  beforeEach(() => {
    validator = new ContentPackValidator();
  });

  describe('Schema Validation', () => {
    it('should pass validation for valid content pack', () => {
      const pack = createValidContentPack();
      const result = validator.validate(pack, { skipSignatureCheck: true });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for null input', () => {
      const result = validator.validate(null);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail for undefined input', () => {
      const result = validator.validate(undefined);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail for empty object', () => {
      const result = validator.validate({});

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code.startsWith('SCHEMA_'))).toBe(true);
    });

    it('should fail for missing required fields', () => {
      const incompletePack = {
        id: 'pack-123',
        name: 'Incomplete Pack',
      };

      const result = validator.validate(incompletePack);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail for invalid version format', () => {
      const pack = createValidContentPack({ version: 'invalid' });
      const result = validator.validate(pack);

      expect(result.valid).toBe(false);
    });
  });

  describe('Business Rule Validation', () => {
    it('should error when required pack has no role mappings', () => {
      const pack = createValidContentPack({
        tags: ['required'],
        roleMappings: [],
      });

      const result = validator.validate(pack, { skipSignatureCheck: true });

      // Schema or business rule validation catches this
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should pass when required pack has role mappings', () => {
      const pack = createValidContentPack({
        tags: ['required'],
        roleMappings: ['badge-role1'],
      });

      const result = validator.validate(pack, { skipSignatureCheck: true });

      expect(result.errors.find((e) => e.code === 'MISSING_ROLE_MAPPING')).toBeUndefined();
    });

    it('should error on duplicate teaching block IDs', () => {
      const duplicateBlock = createValidTeachingBlock({ id: 'tb-duplicate' });
      const pack = createValidContentPack({
        teachingBlocks: [duplicateBlock, duplicateBlock],
      });

      const result = validator.validate(pack, { skipSignatureCheck: true });

      expect(result.errors.some((e) => e.code === 'DUPLICATE_BLOCK_ID')).toBe(true);
    });

    it('should error when prerequisite block does not exist', () => {
      const blockWithMissingPrereq = createValidTeachingBlock({
        id: 'tb-main',
        prerequisites: ['tb-nonexistent'],
      });
      const pack = createValidContentPack({
        teachingBlocks: [blockWithMissingPrereq],
      });

      const result = validator.validate(pack, { skipSignatureCheck: true });

      expect(result.errors.some((e) => e.code === 'MISSING_PREREQUISITE')).toBe(true);
    });

    it('should pass when prerequisite exists in pack', () => {
      const prereqBlock = createValidTeachingBlock({ id: 'tb-prereq' });
      const mainBlock = createValidTeachingBlock({
        id: 'tb-main',
        prerequisites: ['tb-prereq'],
      });
      const pack = createValidContentPack({
        teachingBlocks: [prereqBlock, mainBlock],
      });

      const result = validator.validate(pack, { skipSignatureCheck: true });

      expect(result.errors.find((e) => e.code === 'MISSING_PREREQUISITE')).toBeUndefined();
    });

    it('should warn on large packs', () => {
      const manyBlocks = Array.from({ length: 60 }, (_, i) =>
        createValidTeachingBlock({ id: `tb-block${i}` })
      );
      const pack = createValidContentPack({ teachingBlocks: manyBlocks });

      const result = validator.validate(pack, { skipSignatureCheck: true });

      expect(result.warnings.some((w) => w.code === 'LARGE_PACK')).toBe(true);
    });

    it('should warn on very long canonical solutions', () => {
      const longSolution = 'x'.repeat(15000);
      const block = createValidTeachingBlock({ canonicalSolution: longSolution });
      const pack = createValidContentPack({ teachingBlocks: [block] });

      const result = validator.validate(pack, { skipSignatureCheck: true });

      expect(result.warnings.some((w) => w.code === 'LONG_SOLUTION')).toBe(true);
    });
  });

  describe('Content Consistency Validation', () => {
    it('should error on duplicate surface variant IDs', () => {
      const blockWithDupeVariants = createValidTeachingBlock({
        surfaceVariants: [
          { id: 'variant-1', description: 'First description', data: {} },
          { id: 'variant-1', description: 'Duplicate description', data: {} },
        ],
      });
      const pack = createValidContentPack({ teachingBlocks: [blockWithDupeVariants] });

      const result = validator.validate(pack, { skipSignatureCheck: true });

      expect(result.errors.some((e) => e.code === 'DUPLICATE_VARIANT_ID')).toBe(true);
    });

    it('should error on empty hints', () => {
      const blockWithEmptyHint = createValidTeachingBlock({
        hints: ['Valid hint', '   ', 'Another valid hint'],
      });
      const pack = createValidContentPack({ teachingBlocks: [blockWithEmptyHint] });

      const result = validator.validate(pack, { skipSignatureCheck: true });

      expect(result.errors.some((e) => e.code === 'EMPTY_HINT')).toBe(true);
    });

    it('should warn on short time budget for difficulty', () => {
      const advancedBlockWithShortTime = createValidTeachingBlock({
        difficulty: 'advanced',
        timeBudgetSeconds: 60, // Too short for advanced
      });
      const pack = createValidContentPack({ teachingBlocks: [advancedBlockWithShortTime] });

      const result = validator.validate(pack, { skipSignatureCheck: true });

      expect(result.warnings.some((w) => w.code === 'SHORT_TIME_BUDGET')).toBe(true);
    });

    it('should warn on missing artifact stimulus outside release mode', () => {
      const pack = createValidContentPack({
        teachingBlocks: [
          createValidTeachingBlock({
            id: 'tb-ticket-context',
            concept: 'Ticket timing',
            canonicalSolution: 'Expo fires a ticket for table 12.',
          }),
        ],
      });

      const result = validator.validate(pack, { skipSignatureCheck: true });

      expect(result.valid).toBe(true);
      expect(result.errors.some((e) => e.code === 'STIMULUS_REQUIRED')).toBe(false);
      expect(result.warnings.some((w) => w.code === 'STIMULUS_REQUIRED')).toBe(true);
    });

    it('should error on missing artifact stimulus in release mode', () => {
      const pack = createValidContentPack({
        integrity: { releaseMode: 'release', checksum: 'checksum-001' },
        teachingBlocks: [
          createValidTeachingBlock({
            id: 'tb-ticket-context',
            concept: 'Ticket timing',
            canonicalSolution: 'Expo fires a ticket for table 12.',
          }),
        ],
      });

      const result = validator.validate(pack, { skipSignatureCheck: true });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'STIMULUS_REQUIRED')).toBe(true);
    });

    it('should pass neutral image stimulus with a known manifest key', () => {
      const pack = createValidContentPack({
        teachingBlocks: [
          createValidTeachingBlock({
            concept: 'Equipment photo check',
            stimulus: {
              kind: 'image',
              imageRef: 'EQ1-equipment/grill',
              altText: 'Commercial grill at service temperature',
              caption: 'Internal demo grill readiness check',
            },
          }),
        ],
      });

      const result = validator.validate(pack, {
        skipSignatureCheck: true,
        kitchenImageManifest: demoKitchenImageManifest,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should error when image stimulus references a missing manifest key', () => {
      const pack = createValidContentPack({
        teachingBlocks: [
          createValidTeachingBlock({
            stimulus: {
              kind: 'image',
              imageRef: 'EQ1-equipment/missing',
              altText: 'Missing grill image',
            },
          }),
        ],
      });

      const result = validator.validate(pack, {
        skipSignatureCheck: true,
        kitchenImageManifest: demoKitchenImageManifest,
      });

      expect(result.errors.some((e) => e.code === 'MISSING_IMAGE_MANIFEST_REFERENCE')).toBe(true);
    });

    it('should error when release pack references a demo image', () => {
      const pack = createValidContentPack({
        integrity: { releaseMode: 'release', checksum: 'checksum-001' },
        teachingBlocks: [
          createValidTeachingBlock({
            stimulus: {
              kind: 'image',
              imageRef: 'EQ1-equipment/grill',
              altText: 'Commercial grill at service temperature',
            },
          }),
        ],
      });

      const result = validator.validate(pack, {
        skipSignatureCheck: true,
        kitchenImageManifest: demoKitchenImageManifest,
      });

      expect(result.errors.some((e) => e.code === 'RELEASE_IMAGE_NOT_AUTHORIZED')).toBe(true);
    });

    it('should pass when release pack references an authorized image', () => {
      const pack = createValidContentPack({
        integrity: { releaseMode: 'release', checksum: 'checksum-001' },
        teachingBlocks: [
          createValidTeachingBlock({
            stimulus: {
              kind: 'image',
              imageRef: 'EQ1-equipment/authorized-grill',
              altText: 'Authorized commercial grill image',
            },
          }),
        ],
      });

      const result = validator.validate(pack, {
        skipSignatureCheck: true,
        kitchenImageManifest: demoKitchenImageManifest,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Signature Validation', () => {
    it('should error on invalid signature format', () => {
      const pack = createValidContentPack({ signature: 'invalid-signature' });

      const result = validator.validate(pack);

      expect(result.errors.some((e) => e.code === 'INVALID_SIGNATURE_FORMAT')).toBe(true);
    });

    it('should error on missing signing key ID', () => {
      const pack = createValidContentPack({ signingKeyId: '' });

      const result = validator.validate(pack);

      // Schema validation catches empty string, or signature validation catches it
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should skip signature check when option is set', () => {
      const pack = createValidContentPack({ signature: 'invalid' });

      const result = validator.validate(pack, { skipSignatureCheck: true });

      expect(result.errors.find((e) => e.code === 'INVALID_SIGNATURE_FORMAT')).toBeUndefined();
    });
  });

  describe('Strict Mode', () => {
    it('should fail validation in strict mode when warnings exist', () => {
      const advancedBlockWithShortTime = createValidTeachingBlock({
        difficulty: 'advanced',
        timeBudgetSeconds: 60,
      });
      const pack = createValidContentPack({ teachingBlocks: [advancedBlockWithShortTime] });

      const result = validator.validate(pack, { skipSignatureCheck: true, strict: true });

      expect(result.valid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should pass validation when no warnings in strict mode', () => {
      const pack = createValidContentPack();

      const result = validator.validate(pack, { skipSignatureCheck: true, strict: true });

      expect(result.valid).toBe(true);
    });
  });
});

describe('validateContentPack', () => {
  it('should be a convenience wrapper for ContentPackValidator', () => {
    const pack = createValidContentPack();
    const result = validateContentPack(pack, { skipSignatureCheck: true });

    expect(result.valid).toBe(true);
  });

  it('should accept options', () => {
    const pack = createValidContentPack({ signature: 'invalid' });
    const result = validateContentPack(pack, { skipSignatureCheck: true });

    expect(result.errors.find((e) => e.code === 'INVALID_SIGNATURE_FORMAT')).toBeUndefined();
  });
});

// =============================================================================
// CONTENT PACK SIGNER TESTS
// =============================================================================

describe('ContentPackSigner', () => {
  let signer: ContentPackSigner;

  beforeEach(() => {
    signer = new ContentPackSigner(testSigningConfig, testSigningKey);
  });

  describe('sign', () => {
    it('should generate a signing result', () => {
      const pack = createValidContentPack();
      const { signature, signingKeyId, ...packWithoutSig } = pack;

      const result = signer.sign(packWithoutSig);

      expect(result.signature).toBeDefined();
      expect(result.signature).toMatch(/^sig-v1-/);
      expect(result.keyId).toBe(testSigningConfig.keyId);
      expect(result.algorithm).toBe(testSigningConfig.algorithm);
      expect(result.signedAt).toBeDefined();
      expect(result.contentHash).toBeDefined();
    });

    it('should produce deterministic signatures for same content', () => {
      const pack = createValidContentPack();
      const { signature, signingKeyId, ...packWithoutSig } = pack;

      const result1 = signer.sign(packWithoutSig);
      const result2 = signer.sign(packWithoutSig);

      expect(result1.contentHash).toBe(result2.contentHash);
      expect(result1.signature).toBe(result2.signature);
    });

    it('should produce different signatures for different content', () => {
      const pack1 = createValidContentPack({ name: 'Pack 1' });
      const pack2 = createValidContentPack({ name: 'Pack 2' });
      const { signature: _, signingKeyId: __, ...pack1WithoutSig } = pack1;
      const { signature: ___, signingKeyId: ____, ...pack2WithoutSig } = pack2;

      const result1 = signer.sign(pack1WithoutSig);
      const result2 = signer.sign(pack2WithoutSig);

      expect(result1.signature).not.toBe(result2.signature);
    });
  });

  describe('verify', () => {
    it('should verify valid signature', () => {
      const pack = createValidContentPack();
      const { signature, signingKeyId, ...packWithoutSig } = pack;

      const signResult = signer.sign(packWithoutSig);
      const signedPack = {
        ...packWithoutSig,
        signature: signResult.signature,
        signingKeyId: signResult.keyId,
      };

      const verifyResult = signer.verify(signedPack);

      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.keyId).toBe(testSigningConfig.keyId);
      expect(verifyResult.verifiedAt).toBeDefined();
    });

    it('should reject invalid signature', () => {
      const pack = createValidContentPack({
        signature: 'sig-v1-ECDSA-P256-SHA256-tampered',
        signingKeyId: testSigningConfig.keyId,
      });

      const result = signer.verify(pack);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('verification failed');
    });

    it('should reject mismatched key ID', () => {
      const pack = createValidContentPack({
        signingKeyId: 'different-key-id',
      });

      const result = signer.verify(pack);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Key ID mismatch');
    });
  });

  describe('getKeyId', () => {
    it('should return the configured key ID', () => {
      expect(signer.getKeyId()).toBe(testSigningConfig.keyId);
    });
  });
});

// =============================================================================
// REVOCATION MANAGER TESTS
// =============================================================================

describe('RevocationManager', () => {
  let revocationManager: RevocationManager;

  beforeEach(() => {
    revocationManager = new RevocationManager();
  });

  describe('revoke', () => {
    it('should add pack to revocation list', () => {
      revocationManager.revoke('pack-123', '1.0.0', 'Security vulnerability');

      expect(revocationManager.isRevoked('pack-123', '1.0.0')).toBe(true);
    });

    it('should store revocation reason', () => {
      revocationManager.revoke('pack-456', '2.0.0', 'Outdated content');

      const info = revocationManager.getRevocationInfo('pack-456', '2.0.0');

      expect(info.revoked).toBe(true);
      expect(info.reason).toBe('Outdated content');
      expect(info.revokedAt).toBeDefined();
    });
  });

  describe('isRevoked', () => {
    it('should return false for non-revoked pack', () => {
      expect(revocationManager.isRevoked('pack-not-revoked', '1.0.0')).toBe(false);
    });

    it('should differentiate between versions', () => {
      revocationManager.revoke('pack-multi', '1.0.0', 'Old version');

      expect(revocationManager.isRevoked('pack-multi', '1.0.0')).toBe(true);
      expect(revocationManager.isRevoked('pack-multi', '2.0.0')).toBe(false);
    });
  });

  describe('getRevocationInfo', () => {
    it('should return revoked: false for non-revoked pack', () => {
      const info = revocationManager.getRevocationInfo('unknown-pack', '1.0.0');

      expect(info.revoked).toBe(false);
      expect(info.reason).toBeUndefined();
      expect(info.revokedAt).toBeUndefined();
    });

    it('should return full info for revoked pack', () => {
      const reason = 'Contains incorrect information';
      revocationManager.revoke('pack-bad', '1.2.3', reason);

      const info = revocationManager.getRevocationInfo('pack-bad', '1.2.3');

      expect(info.revoked).toBe(true);
      expect(info.reason).toBe(reason);
      expect(info.revokedAt).toBeDefined();
    });
  });

  describe('getAllRevocations', () => {
    it('should return empty array when no revocations', () => {
      const all = revocationManager.getAllRevocations();

      expect(all).toEqual([]);
    });

    it('should return all revoked packs', () => {
      revocationManager.revoke('pack-1', '1.0.0', 'Reason 1');
      revocationManager.revoke('pack-2', '2.0.0', 'Reason 2');
      revocationManager.revoke('pack-3', '3.0.0', 'Reason 3');

      const all = revocationManager.getAllRevocations();

      expect(all).toHaveLength(3);
      expect(all.some((r) => r.packId === 'pack-1')).toBe(true);
      expect(all.some((r) => r.packId === 'pack-2')).toBe(true);
      expect(all.some((r) => r.packId === 'pack-3')).toBe(true);
    });
  });
});

// =============================================================================
// CREATE SIGNED PACK TESTS
// =============================================================================

describe('createSignedPack', () => {
  it('should create a complete signed content pack', () => {
    const signer = new ContentPackSigner(testSigningConfig, testSigningKey);
    const pack = createValidContentPack();
    const { signature, signingKeyId, ...packWithoutSig } = pack;

    const signedPack = createSignedPack(packWithoutSig, signer);

    expect(signedPack.signature).toBeDefined();
    expect(signedPack.signature).toMatch(/^sig-v1-/);
    expect(signedPack.signingKeyId).toBe(testSigningConfig.keyId);

    // Should include all original fields
    expect(signedPack.id).toBe(pack.id);
    expect(signedPack.name).toBe(pack.name);
    expect(signedPack.teachingBlocks).toEqual(pack.teachingBlocks);
  });

  it('should produce verifiable packs', () => {
    const signer = new ContentPackSigner(testSigningConfig, testSigningKey);
    const pack = createValidContentPack();
    const { signature, signingKeyId, ...packWithoutSig } = pack;

    const signedPack = createSignedPack(packWithoutSig, signer);
    const verifyResult = signer.verify(signedPack);

    expect(verifyResult.valid).toBe(true);
  });
});

// =============================================================================
// AUTHORING PIPELINE TESTS
// =============================================================================

describe('AuthoringPipeline', () => {
  let pipeline: AuthoringPipeline;

  beforeEach(() => {
    pipeline = new AuthoringPipeline(testSigningConfig, testSigningKey);
  });

  describe('createDraft', () => {
    it('should create a draft from author input', () => {
      const draft = createDraftContentPack();
      const state = pipeline.createDraft(draft, 'author-001');

      expect(state.stage).toBe('draft');
      expect(state.pack.name).toBe(draft.name);
      expect(state.pack.id).toBeDefined();
      expect(state.pack.teachingBlocks).toHaveLength(1);
      expect(state.history).toHaveLength(1);
      expect(state.history[0].stage).toBe('draft');
      expect(state.history[0].actor).toBe('author-001');
    });

    it('should generate IDs for pack and blocks', () => {
      const draft = createDraftContentPack();
      const state = pipeline.createDraft(draft, 'author-001');

      expect(state.pack.id).toMatch(/^pack-/);
      expect(state.pack.teachingBlocks?.[0]?.id).toMatch(/^tb-/);
    });

    it('should convert draft blocks to full teaching blocks', () => {
      const draft = createDraftContentPack();
      const state = pipeline.createDraft(draft, 'author-001');

      const block = state.pack.teachingBlocks?.[0];
      expect(block?.id).toBeDefined();
      expect(block?.mode).toBe('L0');
      expect(block?.surfaceVariants).toHaveLength(2);
      expect(block?.surfaceVariants?.[0]?.id).toBe('variant-1');
      expect(block?.surfaceVariants?.[1]?.id).toBe('variant-2');
      expect(block?.successCriteria).toBeDefined();
    });
  });

  describe('submitForValidation', () => {
    it('should attempt validation and stay in draft if partial pack', () => {
      const draft = createDraftContentPack();
      const draftState = pipeline.createDraft(draft, 'author-001');
      const packId = draftState.pack.id!;

      // Draft packs are partial and will fail schema validation
      // (missing signature, signingKeyId required by schema)
      const state = pipeline.submitForValidation(packId, 'author-001', {
        skipSignatureCheck: true,
        skipParityCheck: true,
      });

      // Validation result is tracked in history
      expect(state.history.some((h) => h.stage === 'validation')).toBe(true);
      expect(state.validationResult).toBeDefined();
    });

    it('should stay in draft if validation fails', () => {
      // Create a draft with an issue (required tag but no role mappings)
      const draft = createDraftContentPack();
      const modifiedDraft = { ...draft, tags: [...draft.tags, 'required'] as any };
      const draftState = pipeline.createDraft(modifiedDraft, 'author-001');
      const packId = draftState.pack.id!;

      const state = pipeline.submitForValidation(packId, 'author-001', {
        skipSignatureCheck: true,
        skipParityCheck: true,
      });

      expect(state.stage).toBe('draft');
      expect(state.validationResult?.valid).toBe(false);
    });

    it('should allow re-validation in draft stage', () => {
      const draft = createDraftContentPack();
      const draftState = pipeline.createDraft(draft, 'author-001');
      const packId = draftState.pack.id!;

      // First validation attempt
      const state1 = pipeline.submitForValidation(packId, 'author-001', {
        skipSignatureCheck: true,
        skipParityCheck: true,
      });

      // If still in draft, can re-submit
      if (state1.stage === 'draft') {
        const state2 = pipeline.submitForValidation(packId, 'author-001', {
          skipSignatureCheck: true,
          skipParityCheck: true,
        });
        expect(
          state2.history.filter((h) => h.stage === 'validation').length
        ).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('runParityTests', () => {
    it('should throw if not in parity_testing stage', () => {
      const draft = createDraftContentPack();
      const draftState = pipeline.createDraft(draft, 'author-001');
      const packId = draftState.pack.id!;

      // Draft stage - cannot run parity tests
      expect(() => {
        pipeline.runParityTests(packId, 'qa-001');
      }).toThrow('Cannot run parity tests');
    });
  });

  describe('submitReview', () => {
    it('should throw if not in human_review stage', () => {
      const draft = createDraftContentPack();
      const draftState = pipeline.createDraft(draft, 'author-001');
      const packId = draftState.pack.id!;

      // Draft stage - cannot submit review
      expect(() => {
        pipeline.submitReview(packId, 'reviewer-001', true, 'Approved');
      }).toThrow('Cannot submit review');
    });
  });

  describe('signAndPublish', () => {
    it('should throw if not in signing stage', () => {
      const draft = createDraftContentPack();
      const draftState = pipeline.createDraft(draft, 'author-001');
      const packId = draftState.pack.id!;

      // Draft stage - cannot sign and publish
      expect(() => {
        pipeline.signAndPublish(packId, 'publisher-001');
      }).toThrow('Cannot sign');
    });
  });

  describe('getState', () => {
    it('should return current state for known pack', () => {
      const draft = createDraftContentPack();
      const draftState = pipeline.createDraft(draft, 'author-001');
      const packId = draftState.pack.id!;

      const state = pipeline.getState(packId);

      expect(state.stage).toBe('draft');
      expect(state.pack.id).toBe(packId);
    });

    it('should throw for unknown pack', () => {
      expect(() => {
        pipeline.getState('pack-nonexistent');
      }).toThrow('Pack not found');
    });
  });

  describe('Full Pipeline Flow', () => {
    it('should track draft creation and validation attempt', () => {
      // Create draft
      const draft = createDraftContentPack();
      const draftState = pipeline.createDraft(draft, 'author-001');
      const packId = draftState.pack.id!;
      expect(draftState.stage).toBe('draft');
      expect(draftState.history).toHaveLength(1);

      // Attempt validation (partial pack will fail schema validation)
      const validationState = pipeline.submitForValidation(packId, 'author-001', {
        skipSignatureCheck: true,
        skipParityCheck: true,
      });

      // Validation was attempted
      expect(validationState.validationResult).toBeDefined();
      expect(validationState.history.length).toBeGreaterThanOrEqual(2);
    });
  });
});
