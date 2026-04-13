/**
 * TopShelf Service LLC - Content Routes
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import {
  getDatabase,
  contentPacks,
  contentBlocks,
  learnerStates,
  eq,
  and,
  desc,
  asc,
} from '@topshelf/database';
import { requireRole } from '../middleware/auth.js';
import { notFound } from '../middleware/error-handler.js';

// =============================================================================
// SCHEMAS
// =============================================================================

const ListPacksQuerySchema = z.object({
  status: z.enum(['draft', 'review', 'approved', 'published', 'archived']).optional(),
  certification: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// =============================================================================
// ROUTES
// =============================================================================

export function createContentRoutes() {
  const router = new Hono();

  // ---------------------------------------------------------------------------
  // GET /content/packs - List available content packs
  // ---------------------------------------------------------------------------
  router.get('/packs', zValidator('query', ListPacksQuerySchema), async (c) => {
    const { status, certification, limit, offset } = c.req.valid('query');
    const db = getDatabase();

    const packs = await db.query.contentPacks.findMany({
      where: and(
        status ? eq(contentPacks.status, status) : eq(contentPacks.status, 'published'),
        certification ? eq(contentPacks.certificationTarget, certification) : undefined
      ),
      columns: {
        id: true,
        slug: true,
        version: true,
        title: true,
        description: true,
        certificationTarget: true,
        status: true,
        publishedAt: true,
      },
      orderBy: [desc(contentPacks.publishedAt)],
      limit,
      offset,
    });

    return c.json({
      packs,
      pagination: {
        limit,
        offset,
        hasMore: packs.length === limit,
      },
    });
  });

  // ---------------------------------------------------------------------------
  // GET /content/packs/:packId - Get content pack details
  // ---------------------------------------------------------------------------
  router.get('/packs/:packId', async (c) => {
    const packId = c.req.param('packId');
    const userId = c.get('userId');
    const db = getDatabase();

    const pack = await db.query.contentPacks.findFirst({
      where: eq(contentPacks.id, packId),
      with: {
        blocks: {
          columns: {
            id: true,
            blockId: true,
            title: true,
            objective: true,
            targetMode: true,
            timeBudgetSeconds: true,
            sequenceOrder: true,
          },
          orderBy: [asc(contentBlocks.sequenceOrder)],
        },
      },
    });

    if (!pack) {
      throw notFound('Content pack', packId);
    }

    // Get learner progress if exists
    const learnerState = await db.query.learnerStates.findFirst({
      where: and(eq(learnerStates.userId, userId), eq(learnerStates.contentPackId, packId)),
    });

    return c.json({
      pack: {
        id: pack.id,
        slug: pack.slug,
        version: pack.version,
        title: pack.title,
        description: pack.description,
        certificationTarget: pack.certificationTarget,
        status: pack.status,
        totalBlocks: pack.blocks.length,
        blocks: pack.blocks,
      },
      learnerProgress: learnerState
        ? {
            currentMode: learnerState.currentMode,
            blocksCompleted: learnerState.blocksCompleted,
            overallMastery: learnerState.overallMastery,
            currentBlockId: learnerState.currentBlockId,
          }
        : null,
    });
  });

  // ---------------------------------------------------------------------------
  // GET /content/packs/:packId/blocks/:blockId - Get specific block content
  // ---------------------------------------------------------------------------
  router.get('/packs/:packId/blocks/:blockId', async (c) => {
    const packId = c.req.param('packId');
    const blockId = c.req.param('blockId');
    const userId = c.get('userId');
    const db = getDatabase();

    const block = await db.query.contentBlocks.findFirst({
      where: and(eq(contentBlocks.packId, packId), eq(contentBlocks.blockId, blockId)),
      with: {
        pack: {
          columns: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    if (!block) {
      throw notFound('Content block', blockId);
    }

    // Get learner state to determine appropriate content variant
    const learnerState = await db.query.learnerStates.findFirst({
      where: and(eq(learnerStates.userId, userId), eq(learnerStates.contentPackId, packId)),
    });

    const currentMode = learnerState?.currentMode || 'L1_RECALL';

    return c.json({
      block: {
        id: block.id,
        blockId: block.blockId,
        title: block.title,
        objective: block.objective,
        targetMode: block.targetMode,
        timeBudgetSeconds: block.timeBudgetSeconds,
        content: block.content,
        hints: block.hints,
        variants: block.variants,
      },
      learnerMode: currentMode,
      pack: block.pack,
    });
  });

  // ---------------------------------------------------------------------------
  // GET /content/next - Get next recommended block
  // ---------------------------------------------------------------------------
  router.get('/next/:contentPackId', async (c) => {
    const contentPackId = c.req.param('contentPackId');
    const userId = c.get('userId');
    const db = getDatabase();

    // Get learner state
    const state = await db.query.learnerStates.findFirst({
      where: and(eq(learnerStates.userId, userId), eq(learnerStates.contentPackId, contentPackId)),
    });

    // Get next block based on sequence
    const nextSequence = state?.blocksCompleted || 0;

    const nextBlock = await db.query.contentBlocks.findFirst({
      where: eq(contentBlocks.packId, contentPackId),
      orderBy: [asc(contentBlocks.sequenceOrder)],
      offset: nextSequence,
    });

    if (!nextBlock) {
      return c.json({
        complete: true,
        message: 'All blocks completed',
        blocksCompleted: nextSequence,
      });
    }

    return c.json({
      complete: false,
      nextBlock: {
        id: nextBlock.id,
        blockId: nextBlock.blockId,
        title: nextBlock.title,
        objective: nextBlock.objective,
        targetMode: nextBlock.targetMode,
        sequenceOrder: nextBlock.sequenceOrder,
      },
      progress: {
        completed: nextSequence,
        currentMode: state?.currentMode || 'L1_RECALL',
      },
    });
  });

  // ---------------------------------------------------------------------------
  // ADMIN: POST /content/packs - Create new content pack (content authors only)
  // ---------------------------------------------------------------------------
  router.post(
    '/packs',
    requireRole('content_author', 'school_admin', 'district_admin', 'system_admin'),
    async (c) => {
      // Implementation for content creation
      return c.json({ message: 'Content pack creation endpoint' }, 501);
    }
  );

  return router;
}
