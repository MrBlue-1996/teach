/**
 * TopShelf Service LLC - QR Validation API Route
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Pilot implementation: validates a submitted QR code against a static
 * whitelist and returns approved/rejected. Database persistence and
 * manager approval flow are planned for production.
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const WHITELIST = new Set(['WALK-IN-TMP-042', 'LINE-SANI-001', 'PREP-MISE-007', 'DISH-SANI-009']);

export async function POST(req: Request) {
  // Authenticate the request via Supabase session cookie
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll() {},
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ status: 'rejected', reason: 'Unauthorized' }, { status: 401 });
  }

  let body: { code?: string } = {};
  try {
    body = (await req.json()) as { code?: string };
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
