/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { getDatabase, auditLogs } from '@topshelf/database';

export interface AuditParams {
  userId?: string | undefined;
  action: string;
  resource: string;
  resourceId?: string | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export async function insertAuditLog(params: AuditParams): Promise<void> {
  const db = getDatabase();
  await db.insert(auditLogs).values({
    action: params.action,
    resource: params.resource,
    ...(params.userId !== undefined ? { userId: params.userId } : {}),
    ...(params.resourceId !== undefined ? { resourceId: params.resourceId } : {}),
    ...(params.ipAddress !== undefined ? { ipAddress: params.ipAddress } : {}),
    ...(params.userAgent !== undefined ? { userAgent: params.userAgent } : {}),
    ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
  });
}
