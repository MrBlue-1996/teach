/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const redirectPath = next?.startsWith('/') ? next : '/dashboard';
  const errorDescription =
    searchParams.get('error_description') ?? 'Unable to sign in with Google.';

  if (!code) {
    const loginUrl = new URL('/auth/login', origin);
    loginUrl.searchParams.set('error', errorDescription);
    return NextResponse.redirect(loginUrl);
  }

  // Build the success redirect first so we can attach cookies to it.
  const successResponse = NextResponse.redirect(new URL(redirectPath, origin));

  // Create the Supabase client reading cookies directly from the incoming
  // NextRequest and writing them onto the outgoing NextResponse.
  // This is required for PKCE: the code verifier is stored in a request
  // cookie by the browser client, and must be readable here server-side.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            successResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (!error) {
    return successResponse;
  }

  const loginUrl = new URL('/auth/login', origin);
  loginUrl.searchParams.set('error', error.message);
  return NextResponse.redirect(loginUrl);
}
