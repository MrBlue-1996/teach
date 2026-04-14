/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Content pack seed script — idempotent upsert of JSON packs into the database.
 * Run: pnpm --filter @topshelf/database seed
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { contentPacks, contentBlocks } from '../src/schema/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load root .env (packages/database/scripts/ → 3 levels up = repo root)
config({ path: join(__dirname, '../../../.env') });

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

interface ContentPackJson {
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

// =============================================================================
// HELPERS
// =============================================================================

const MODE_MAP: Record<string, 'L1_RECALL' | 'L2_EXPLAIN' | 'L3_APPLY' | 'L4_ANALYZE' | 'L5_EXPERT'> = {
  L0: 'L1_RECALL',
  L1: 'L1_RECALL',
  L2: 'L2_EXPLAIN',
  L3: 'L3_APPLY',
  L4: 'L4_ANALYZE',
  L5: 'L5_EXPERT',
};

function readPack(filename: string): ContentPackJson {
  const fullPath = join(__dirname, '../../../content-packs', filename);
  return JSON.parse(readFileSync(fullPath, 'utf-8')) as ContentPackJson;
}

// =============================================================================
// MAIN
// =============================================================================

async function seed() {
  const connectionString = [
    'postgres://',
    process.env.DB_USER ?? 'topshelf',
    ':',
    process.env.DB_PASSWORD ?? '',
    '@',
    process.env.DB_HOST ?? 'localhost',
    ':',
    process.env.DB_PORT ?? '5432',
    '/',
    process.env.DB_NAME ?? 'topshelf',
  ].join('');

  const client = postgres(connectionString, { max: 1, prepare: false });
  const db = drizzle(client);

  const packs: ContentPackJson[] = [
    readPack('content_pack_linux_v1.json'),
    readPack('content_pack_networkplus_v1.json'),
  ];

  for (const pack of packs) {
    console.log(`\nSeeding pack: ${pack.name} (${pack.id})`);

    // Upsert content pack
    const [inserted] = await db
      .insert(contentPacks)
      .values({
        slug: pack.id,
        version: pack.version,
        title: pack.name,
        description: pack.description,
        status: 'published',
        publishedAt: new Date(),
        metadata: {
          difficulty: pack.difficulty,
          tags: pack.tags,
          roleMappings: pack.roleMappings,
          minDeviceProfile: pack.minDeviceProfile,
        },
      })
      .onConflictDoUpdate({
        target: [contentPacks.slug, contentPacks.version],
        set: {
          title: pack.name,
          description: pack.description,
          status: 'published',
          publishedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning({ id: contentPacks.id });

    const packId = inserted.id;
    console.log(`  pack id: ${packId}`);

    // Upsert blocks
    for (const [index, block] of pack.teachingBlocks.entries()) {
      const targetMode = MODE_MAP[block.mode] ?? 'L1_RECALL';
      await db
        .insert(contentBlocks)
        .values({
          packId,
          blockId: block.id,
          title: block.concept,
          objective: block.explanation?.slice(0, 500) ?? null,
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
        .onConflictDoUpdate({
          target: [contentBlocks.packId, contentBlocks.blockId],
          set: {
            title: block.concept,
            objective: block.explanation?.slice(0, 500) ?? null,
            targetMode,
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
            updatedAt: new Date(),
          },
        });
      console.log(`  block [${index}]: ${block.id}`);
    }

    console.log(`  ✓ ${pack.teachingBlocks.length} blocks seeded`);
  }

  await client.end();
  console.log('\nSeed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
