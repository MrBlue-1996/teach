/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { validateContentPack } from '@topshelf/content-authoring';

const CONTENT_PACKS_DIR = join(__dirname, '../../../../content-packs');
const KITCHEN_PACKS_DIR = join(CONTENT_PACKS_DIR, 'kitchen');

const SHIPPED_MANIFESTS = [
  'content_pack_linux_v1.json',
  'content_pack_networkplus_v1.json',
  'content_pack_uncle_julios_v1.json',
  'content_pack_web-fundamentals_v1.json',
] as const;

const SHIPPED_UJ_KITCHEN_PACKS = [
  'uj-allergy-order.json',
  'uj-enchilada-rush.json',
  'uj-fajita-rush.json',
  'uj-grill-setup.json',
  'uj-line-temps.json',
  'uj-queso-scale.json',
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

type KitchenPackShape = {
  id?: string;
  slug?: string;
  recipeId?: string;
  expertRecipe?: {
    id?: string;
  };
};

function loadContentPack(filename: string): unknown {
  // Validate filename to prevent path traversal
  if (!/^[\w.-]+\.json$/.test(filename)) {
    throw new Error(`Invalid content pack filename: ${filename}`);
  }
  const filePath = join(CONTENT_PACKS_DIR, filename);
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function loadKitchenPack(filename: string): KitchenPackShape {
  if (!/^[\w.-]+\.json$/.test(filename)) {
    throw new Error(`Invalid kitchen pack filename: ${filename}`);
  }
  const filePath = join(KITCHEN_PACKS_DIR, filename);
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as KitchenPackShape;
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

    expect(pack.version).toBe('0.1.1');
    expect(pack.integrity?.releaseMode).toBe('demo');
    expect(pack.integrity?.checksum ?? null).toBeNull();
  });

  it('keeps the authoring template parseable', () => {
    expect(() => loadContentPack('template_content_pack.json')).not.toThrow();
  });

  it("keeps the Uncle Julio's kitchen challenge bundle registered consistently", () => {
    const shippedKitchenFiles = readdirSync(KITCHEN_PACKS_DIR)
      .filter((fileName) => fileName.startsWith('uj-') && fileName.endsWith('.json'))
      .sort();

    expect(shippedKitchenFiles).toEqual([...SHIPPED_UJ_KITCHEN_PACKS].sort());

    for (const fileName of SHIPPED_UJ_KITCHEN_PACKS) {
      const slug = fileName.replace(/\.json$/, '');
      const pack = loadKitchenPack(fileName);

      expect(pack.slug).toBe(slug);
      expect(pack.id).toBe(`${slug}-v1`);
      expect(pack.recipeId).toBe(pack.expertRecipe?.id);
    }
  });
});
