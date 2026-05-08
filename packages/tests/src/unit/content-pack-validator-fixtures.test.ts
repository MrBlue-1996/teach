/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { validateContentPack } from '@topshelf/content-authoring';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixtureRoot = path.resolve(__dirname, '../../../../tests/fixtures/content-packs');

function loadFixture(fileName: string): unknown {
  const fixturePath = path.join(fixtureRoot, fileName);
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as unknown;
}

describe('fixture-backed content pack validation', () => {
  it('accepts the valid fixture through the real validator', () => {
    const result = validateContentPack(loadFixture('valid-minimal-pack.json'));

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it.each([
    {
      fileName: 'bad-missing-role-mapping.json',
      expectedCode: 'MISSING_ROLE_MAPPING',
      expectedMessage: 'role mappings',
    },
    {
      fileName: 'bad-duplicate-block-id.json',
      expectedCode: 'DUPLICATE_BLOCK_ID',
      expectedMessage: 'Duplicate teaching block ID',
    },
    {
      fileName: 'bad-missing-prerequisite.json',
      expectedCode: 'MISSING_PREREQUISITE',
      expectedMessage: 'Prerequisite',
    },
    {
      fileName: 'bad-official-claim.json',
      expectedCode: 'UNAUTHORIZED_OFFICIAL_CLAIM',
      expectedMessage: 'Official Uncle Julio',
    },
    {
      fileName: 'bad-response-cap.json',
      expectedCode: 'RESPONSE_CAP_EXCEEDED',
      expectedMessage: 'maxResponseChars',
    },
    {
      fileName: 'bad-orphan-asset.json',
      expectedCode: 'ORPHAN_FUNDAMENTAL',
      expectedMessage: 'not referenced',
    },
    {
      fileName: 'bad-missing-stimulus.json',
      expectedCode: 'STIMULUS_REQUIRED',
      expectedMessage: 'stimulus',
    },
  ])(
    'rejects $fileName through the real validator',
    ({ fileName, expectedCode, expectedMessage }) => {
      const result = validateContentPack(loadFixture(fileName));

      expect(result.valid).toBe(false);
      expect(result.errors.some((error) => error.code === expectedCode)).toBe(true);
      expect(result.errors.some((error) => error.message.includes(expectedMessage))).toBe(true);
    }
  );

  it('rejects filename and pack-id mismatches through the real validator', () => {
    const result = validateContentPack(loadFixture('valid-minimal-pack.json'), {
      sourcePath: 'content-packs/content_pack_wrong-name_v1.json',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.code === 'PACK_FILENAME_ID_MISMATCH')).toBe(true);
  });
});
