/**
 * TopShelf Service LLC - Badge Routes
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { Hono } from 'hono';
import { getDatabase, badges, eq, and, desc } from '@topshelf/database';
import { notFound } from '../middleware/error-handler.js';

export function createBadgeRoutes() {
  const router = new Hono();

  // GET /badge - List user's badges
  router.get('/', async (c) => {
    const userId = c.get('userId');
    const db = getDatabase();

    const userBadges = await db.query.badges.findMany({
      where: eq(badges.userId, userId),
      orderBy: [desc(badges.issuedAt)],
      with: {
        contentPack: {
          columns: {
            title: true,
            certificationTarget: true,
          },
        },
      },
    });

    return c.json({
      badges: userBadges.map((b) => ({
        id: b.id,
        badgeType: b.badgeType,
        level: b.level,
        status: b.status,
        masteryScore: b.masteryScore,
        contentPack: b.contentPack,
        issuedAt: b.issuedAt,
        expiresAt: b.expiresAt,
      })),
    });
  });

  // GET /badge/:badgeId - Get badge details (scoped to current user)
  router.get('/:badgeId', async (c) => {
    const badgeId = c.req.param('badgeId');
    const userId = c.get('userId');
    const db = getDatabase();

    const badge = await db.query.badges.findFirst({
      where: and(eq(badges.id, badgeId), eq(badges.userId, userId)),
      with: {
        contentPack: {
          columns: {
            title: true,
            certificationTarget: true,
          },
        },
      },
    });

    if (!badge) {
      throw notFound('Badge', badgeId);
    }

    return c.json({ badge });
  });

  // GET /badge/verify/:hash - Verify badge by hash (public)
  router.get('/verify/:hash', async (c) => {
    const hash = c.req.param('hash');
    const db = getDatabase();

    const badge = await db.query.badges.findFirst({
      where: and(eq(badges.verificationHash, hash), eq(badges.status, 'issued')),
      with: {
        contentPack: {
          columns: {
            title: true,
            certificationTarget: true,
          },
        },
        user: {
          columns: {
            displayName: true,
          },
        },
      },
    });

    if (!badge) {
      return c.json({
        valid: false,
        message: 'Badge not found or has been revoked',
      });
    }

    // Check expiry
    if (badge.expiresAt && badge.expiresAt < new Date()) {
      return c.json({
        valid: false,
        message: 'Badge has expired',
        expiredAt: badge.expiresAt,
      });
    }

    return c.json({
      valid: true,
      badge: {
        holder: badge.user?.displayName,
        achievement: badge.contentPack?.title,
        certification: badge.contentPack?.certificationTarget,
        level: badge.level,
        masteryScore: badge.masteryScore,
        issuedAt: badge.issuedAt,
        expiresAt: badge.expiresAt,
      },
    });
  });

  return router;
}
