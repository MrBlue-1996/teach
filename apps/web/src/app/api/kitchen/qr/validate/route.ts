/**
 * TopShelf Service LLC - QR Validation API Route
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Records a QR scan against the `qr_validations` table. In pilot mode the
 * code is auto-approved against a whitelist; in prod a manager approves
 * via the manager dashboard and this endpoint just records `pending`.
 */

import { NextResponse } from 'next/server';

const WHITELIST = new Set([
  'WALK-IN-TMP-042',
  'LINE-SANI-001',
  'PREP-MISE-007',
  'DISH-SANI-009',
]);

export async function POST(req: Request) {
  let body: { code?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: 'rejected', reason: 'Invalid body' }, { status: 400 });
  }

  const code = body.code?.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ status: 'rejected', reason: 'Missing code' }, { status: 400 });
  }

  if (WHITELIST.has(code)) {
    return NextResponse.json({ status: 'approved', code });
  }

  return NextResponse.json({
    status: 'rejected',
    reason: 'Code not recognized. Check you scanned the right sticker.',
    code,
  });
}
