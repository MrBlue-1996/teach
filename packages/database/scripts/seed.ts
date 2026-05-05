/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Content pack seed script — idempotent insert of JSON packs into the database.
 * Run: pnpm --filter @topshelf/database seed
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, readdirSync } from 'fs';
import { config } from 'dotenv';
import { loadConfig } from '@topshelf/config';
import { connectDatabase, type Database } from '../src/index.js';
import { contentPacks, contentBlocks } from '../src/schema/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REGULAR_PACK_FILES = new Set(['content_pack_uncle_julios_v1.json']);

// Load root .env (packages/database/scripts/ → 3 levels up = repo root)
config({ path: join(__dirname, '../../../.env') });

function includeHiddenContentPacks(): boolean {
  return process.env['INCLUDE_HIDDEN_CONTENT_PACKS'] === '1';
}

// =============================================================================
// TYPES
// =============================================================================

interface TeachingBlock {
  id: string;
  concept: string;
  mode: string;
  canonicalSolution: string;
  explanation: string;
  surfaceVariants: unknown[];
  timeBudgetSeconds: number;
  difficulty: string;
  prerequisites: string[];
  successCriteria: unknown;
  hints: string[];
  commonErrors: unknown[];
}

interface RegularContentPack {
  id: string;
  name: string;
  version: string;
  description: string;
  difficulty: string;
  tags: string[];
  roleMappings: string[];
  minDeviceProfile: unknown;
  teachingBlocks: TeachingBlock[];
}

interface KitchenChallengePack {
  id: string;
  slug: string;
  type: string;
  title: string;
  briefing: string;
  timeLimitSeconds: number;
  difficultyLevel: number;
  [key: string]: unknown;
}

type AnyPack = RegularContentPack | KitchenChallengePack;
type ContentPackSeedStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived';

// =============================================================================
// HELPERS
// =============================================================================

const MODE_MAP: Record<
  string,
  'L1_RECALL' | 'L2_EXPLAIN' | 'L3_APPLY' | 'L4_ANALYZE' | 'L5_EXPERT'
> = {
  L0: 'L1_RECALL',
  L1: 'L1_RECALL',
  L2: 'L2_EXPLAIN',
  L3: 'L3_APPLY',
  L4: 'L4_ANALYZE',
  L5: 'L5_EXPERT',
};

function isKitchenPack(pack: AnyPack): pack is KitchenChallengePack {
  return 'type' in pack && 'briefing' in pack && 'timeLimitSeconds' in pack;
}

function readJson(fullPath: string): AnyPack {
  return JSON.parse(readFileSync(fullPath, 'utf-8')) as AnyPack;
}

function listRegularPacks(): AnyPack[] {
  const dir = join(__dirname, '../../../content-packs');
  return readdirSync(dir)
    .filter(
      (f) =>
        f.endsWith('.json') &&
        f !== 'template_content_pack.json' &&
        (includeHiddenContentPacks() || DEFAULT_REGULAR_PACK_FILES.has(f))
    )
    .map((f) => readJson(join(dir, f)));
}

function getRegularPackSeedPolicy(pack: RegularContentPack): {
  status: ContentPackSeedStatus;
  publishedAt?: Date;
  releaseStage: 'demo' | 'production';
  sourceDataStatus: 'demo' | 'authorized';
  officialTraining: boolean;
} {
  if (pack.id === 'pack-uncle-julios-v1') {
    return {
      status: 'draft',
      releaseStage: 'demo',
      sourceDataStatus: 'demo',
      officialTraining: false,
    };
  }

  return {
    status: 'published',
    publishedAt: new Date(),
    releaseStage: 'production',
    sourceDataStatus: 'authorized',
    officialTraining: true,
  };
}

function listKitchenPacks(): KitchenChallengePack[] {
  const dir = join(__dirname, '../../../content-packs/kitchen');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json') && (includeHiddenContentPacks() || f.startsWith('uj-')))
    .map((f) => readJson(join(dir, f)) as KitchenChallengePack);
}

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

async function seedRegularPack(db: Database, pack: RegularContentPack): Promise<void> {
  console.log(`\nSeeding regular pack: ${pack.name} (${pack.id})`);
  const seedPolicy = getRegularPackSeedPolicy(pack);

  const [inserted] = await db
    .insert(contentPacks)
    .values({
      slug: pack.id,
      version: pack.version,
      title: pack.name,
      description: pack.description,
      status: seedPolicy.status,
      ...(seedPolicy.publishedAt !== undefined ? { publishedAt: seedPolicy.publishedAt } : {}),
      metadata: {
        packType: 'regular_content_pack',
        releaseStage: seedPolicy.releaseStage,
        sourceDataStatus: seedPolicy.sourceDataStatus,
        officialTraining: seedPolicy.officialTraining,
        difficulty: pack.difficulty,
        tags: pack.tags,
        roleMappings: pack.roleMappings,
        minDeviceProfile: pack.minDeviceProfile,
      },
    })
    .onConflictDoNothing()
    .returning({ id: contentPacks.id });

  if (!inserted) {
    console.log(`  skipped (already exists)`);
    return;
  }

  const packId = inserted.id;
  console.log(`  pack id: ${packId}`);

  for (const [index, block] of pack.teachingBlocks.entries()) {
    const targetMode = MODE_MAP[block.mode] ?? 'L1_RECALL';
    await db
      .insert(contentBlocks)
      .values({
        packId,
        blockId: block.id,
        title: block.concept,
        ...(block.explanation ? { objective: block.explanation.slice(0, 500) } : {}),
        targetMode,
        prerequisites: block.prerequisites,
        timeBudgetSeconds: block.timeBudgetSeconds,
        content: {
          canonicalSolution: block.canonicalSolution,
          explanation: block.explanation,
          successCriteria: block.successCriteria,
          difficulty: block.difficulty,
          commonErrors: block.commonErrors,
        },
        hints: block.hints,
        variants: block.surfaceVariants,
        sequenceOrder: index,
      })
      .onConflictDoNothing();
    console.log(`  block [${index}]: ${block.id}`);
  }

  console.log(`  ✓ ${pack.teachingBlocks.length} blocks seeded`);
}

async function seedKitchenPack(db: Database, pack: KitchenChallengePack): Promise<void> {
  console.log(`\nSeeding kitchen pack: ${pack.title} (${pack.id})`);

  const [inserted] = await db
    .insert(contentPacks)
    .values({
      slug: pack.slug,
      version: '1.0.0',
      title: pack.title,
      description: pack.briefing,
      status: 'published',
      publishedAt: new Date(),
      metadata: {
        packType: 'kitchen_challenge',
        challengeType: pack.type,
        difficultyLevel: pack.difficultyLevel,
        timeLimitSeconds: pack.timeLimitSeconds,
      },
    })
    .onConflictDoNothing()
    .returning({ id: contentPacks.id });

  if (!inserted) {
    console.log(`  skipped (already exists)`);
    return;
  }

  const packId = inserted.id;
  console.log(`  pack id: ${packId}`);

  await db
    .insert(contentBlocks)
    .values({
      packId,
      blockId: pack.id,
      title: pack.title,
      objective: pack.briefing.slice(0, 500),
      targetMode: 'L3_APPLY',
      prerequisites: [],
      timeBudgetSeconds: pack.timeLimitSeconds,
      content: {
        ...pack,
        type: 'kitchen_challenge',
        challengeType: pack.type,
      },
      hints: [],
      variants: [],
      sequenceOrder: 0,
    })
    .onConflictDoNothing();

  console.log(`  ✓ 1 kitchen_challenge block seeded`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  loadConfig();
  const { db, close } = await connectDatabase();

  try {
    const regularPacks = listRegularPacks();
    const kitchenPacks = listKitchenPacks();

    console.log(
      `Found ${regularPacks.length} regular pack(s) and ${kitchenPacks.length} kitchen pack(s).`
    );
    if (!includeHiddenContentPacks()) {
      console.log('  Hidden packs skipped. Set INCLUDE_HIDDEN_CONTENT_PACKS=1 to seed all packs.');
      console.log('  Default demo regular packs are still seeded as draft for admin review.');
    }

    for (const pack of regularPacks) {
      if (isKitchenPack(pack)) {
        await seedKitchenPack(db, pack);
      } else {
        await seedRegularPack(db, pack);
      }
    }

    for (const pack of kitchenPacks) {
      await seedKitchenPack(db, pack);
    }

    console.log('\nSeed complete.');
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
