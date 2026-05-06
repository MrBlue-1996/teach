/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { validateContentPack } from '@topshelf/content-authoring';

const CONTENT_PACKS_DIR = join(__dirname, '../../../../content-packs');

const SHIPPED_MANIFESTS = [
  'content_pack_linux_v1.json',
  'content_pack_networkplus_v1.json',
  'content_pack_uncle_julios_v1.json',
  'content_pack_web-fundamentals_v1.json',
] as const;

type PackBlock = {
  id?: string;
  prerequisites?: readonly string[];
};

type PackShape = {
  version?: string;
  integrity?: {
    releaseMode?: string;
    checksum?: string | null;
  };
  teachingBlocks?: readonly PackBlock[];
};

function loadContentPack(filename: string): unknown {
  const filePath = join(CONTENT_PACKS_DIR, filename);
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

describe('shipped content pack manifests', () => {
  it.each(SHIPPED_MANIFESTS)('validates %s through the real validator', (fileName) => {
    const result = validateContentPack(loadContentPack(fileName), {
      sourcePath: `content-packs/${fileName}`,
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("keeps the Uncle Julio's golden path intact", () => {
    const pack = loadContentPack('content_pack_uncle_julios_v1.json') as PackShape;

    expect(pack.teachingBlocks).toHaveLength(8);
    expect(pack.teachingBlocks?.[0]?.id).toBe('tb-uj-orientation-safety');
    expect(pack.teachingBlocks?.[7]?.id).toBe('tb-uj-assessment-gate');

    const blockIds = new Set((pack.teachingBlocks ?? []).map((block) => block.id));
    for (const block of pack.teachingBlocks ?? []) {
      for (const prerequisite of block.prerequisites ?? []) {
        expect(blockIds.has(prerequisite)).toBe(true);
      }
    }
  });

  it("keeps the Uncle Julio's pack in demo mode", () => {
    const pack = loadContentPack('content_pack_uncle_julios_v1.json') as PackShape;

    expect(pack.version).toBe('0.1.0-demo');
    expect(pack.integrity?.releaseMode).toBe('demo');
    expect(pack.integrity?.checksum ?? null).toBeNull();
  });

  it('keeps the authoring template parseable', () => {
    expect(() => loadContentPack('template_content_pack.json')).not.toThrow();
  });
});
