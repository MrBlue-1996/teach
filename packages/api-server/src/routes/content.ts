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
  learnerProgressEvents,
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
  // GET /content/categories - List distinct certification targets
  // ---------------------------------------------------------------------------
  router.get('/categories', async (c) => {
    const db = getDatabase();

    const packs = await db.query.contentPacks.findMany({
      where: eq(contentPacks.status, 'published'),
      columns: { certificationTarget: true },
    });

    const categories = [...new Set(packs.map((p) => p.certificationTarget).filter(Boolean))];

    return c.json({ categories });
  });

  // ---------------------------------------------------------------------------
  // POST /content/packs/:packId/blocks/:blockId/submit - Submit an answer
  // ---------------------------------------------------------------------------

  const SubmitAnswerSchema = z.object({
    answer: z.string().min(1).max(2000),
    sessionId: z.string().uuid(),
    timeSpentSeconds: z.number().int().min(0).optional(),
  });

  router.post(
    '/packs/:packId/blocks/:blockId/submit',
    zValidator('json', SubmitAnswerSchema),
    async (c) => {
      const packId = c.req.param('packId');
      const blockId = c.req.param('blockId');
      const userId = c.get('userId');
      const { answer, sessionId, timeSpentSeconds } = c.req.valid('json');
      const db = getDatabase();

      const block = await db.query.contentBlocks.findFirst({
        where: and(eq(contentBlocks.packId, packId), eq(contentBlocks.blockId, blockId)),
      });

      if (!block) {
        throw notFound('Content block', blockId);
      }

      // Evaluate correctness: compare normalised answer against stored correctAnswer
      const blockContent = block.content as Record<string, unknown>;
      const correctAnswer =
        typeof blockContent['correctAnswer'] === 'string' ? blockContent['correctAnswer'] : null;

      let correctness = 0;
      if (correctAnswer !== null) {
        const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
        correctness = norm(answer) === norm(correctAnswer) ? 1 : 0;
      }

      // Record a progress event
      const learnerState = await db.query.learnerStates.findFirst({
        where: and(eq(learnerStates.userId, userId), eq(learnerStates.contentPackId, packId)),
      });

      if (learnerState) {
        await db.insert(learnerProgressEvents).values({
          userId,
          learnerStateId: learnerState.id,
          blockId,
          eventType: 'completed',
          responseData: { answer },
          correctness,
          ...(timeSpentSeconds !== undefined ? { timeSpentSeconds } : {}),
          occurredAt: new Date(),
        });

        // Update learner state counters
        await db
          .update(learnerStates)
          .set({
            blocksCompleted: learnerState.blocksCompleted + (correctness >= 0.5 ? 1 : 0),
            currentBlockId: blockId,
            lastActivityAt: new Date(),
          })
          .where(eq(learnerStates.id, learnerState.id));
      }

      // Retrieve hints for incorrect answers
      const hints = Array.isArray(block.hints) ? (block.hints as string[]) : [];
      const explanation =
        typeof blockContent['explanation'] === 'string' ? blockContent['explanation'] : null;

      return c.json({
        correct: correctness >= 0.5,
        correctness,
        ...(correctAnswer !== null ? { correctAnswer } : {}),
        ...(explanation !== null ? { explanation } : {}),
        hints: correctness < 0.5 ? hints.slice(0, 1) : [],
        sessionId,
      });
    }
  );

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

  // ---------------------------------------------------------------------------
  // POST /content/packs/:packId/enroll - Enroll learner in a content pack
  // ---------------------------------------------------------------------------
  router.post('/packs/:packId/enroll', async (c) => {
    const userId = c.get('userId');
    const packId = c.req.param('packId');
    const db = getDatabase();

    const pack = await db.query.contentPacks.findFirst({
      where: and(eq(contentPacks.id, packId), eq(contentPacks.status, 'published')),
      columns: { id: true },
    });

    if (!pack) {
      return c.json({ error: 'Content pack not found or not published' }, 404);
    }

    const existing = await db.query.learnerStates.findFirst({
      where: and(eq(learnerStates.userId, userId), eq(learnerStates.contentPackId, packId)),
      columns: { id: true },
    });

    if (!existing) {
      await db.insert(learnerStates).values({
        userId,
        contentPackId: packId,
        currentMode: 'L1_RECALL',
        overallMastery: 0,
        totalTimeSpentSeconds: 0,
        blocksCompleted: 0,
      });
    }

    return c.json({ enrolled: true });
  });

  // ---------------------------------------------------------------------------
  // DELETE /content/packs/:packId/enroll - Unenroll learner from a content pack
  // ---------------------------------------------------------------------------
  router.delete('/packs/:packId/enroll', async (c) => {
    const userId = c.get('userId');
    const packId = c.req.param('packId');
    const db = getDatabase();

    const existing = await db.query.learnerStates.findFirst({
      where: and(eq(learnerStates.userId, userId), eq(learnerStates.contentPackId, packId)),
      columns: { id: true, blocksCompleted: true },
    });

    if (!existing) {
      return c.json({ enrolled: false });
    }

    if ((existing.blocksCompleted ?? 0) > 0) {
      return c.json(
        { error: 'Cannot unenroll: progress exists. Contact support to reset your progress.' },
        409
      );
    }

    await db
      .delete(learnerStates)
      .where(and(eq(learnerStates.userId, userId), eq(learnerStates.contentPackId, packId)));

    return c.json({ enrolled: false });
  });

  return router;
}
