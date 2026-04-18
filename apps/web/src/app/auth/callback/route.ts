/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const redirectPath = next?.startsWith('/') ? next : '/auth/oauth-complete';
  const errorDescription =
    searchParams.get('error_description') ?? 'Unable to sign in with Google.';

  if (!code) {
    const loginUrl = new URL('/auth/login', origin);
    loginUrl.searchParams.set('error', errorDescription);
    return NextResponse.redirect(loginUrl);
  }

  // Build a temporary response to hold Supabase cookies during exchange
  const tempResponse = NextResponse.next({ request });

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
            tempResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Exchange PKCE code for Supabase session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    const loginUrl = new URL('/auth/login', origin);
    loginUrl.searchParams.set('error', error?.message ?? 'OAuth session exchange failed');
    return NextResponse.redirect(loginUrl);
  }

  const supaUser = data.user;
  const meta = supaUser.user_metadata ?? {};

  // Extract user info from Supabase user
  const email = supaUser.email;
  if (!email) {
    const loginUrl = new URL('/auth/login', origin);
    loginUrl.searchParams.set('error', 'No email returned from provider');
    return NextResponse.redirect(loginUrl);
  }

  const firstName = (meta.given_name ?? meta.first_name ?? meta.full_name?.split(' ')[0]) as
    | string
    | undefined;
  const lastName = (meta.family_name ??
    meta.last_name ??
    meta.full_name?.split(' ').slice(1).join(' ')) as string | undefined;

  // Bridge: call our custom backend to get JWT tokens
  try {
    const backendRes = await fetch(`${API_BASE_URL}/auth/oauth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'google',
        providerAccountId: supaUser.id,
        email,
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
      }),
    });

    if (!backendRes.ok) {
      const body = await backendRes.text();
      throw new Error(body || `Backend returned ${backendRes.status}`);
    }

    const tokens = await backendRes.json();

    // Set tokens in short-lived cookies for the client page to read
    const successResponse = NextResponse.redirect(new URL(redirectPath, origin));
    const cookieOpts = {
      path: '/auth/oauth-complete',
      maxAge: 60, // 60 seconds — client reads and deletes immediately
      httpOnly: false, // Client JS needs to read these
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    };

    successResponse.cookies.set('oauth_payload', JSON.stringify(tokens), cookieOpts);

    return successResponse;
  } catch (err) {
    const loginUrl = new URL('/auth/login', origin);
    loginUrl.searchParams.set(
      'error',
      err instanceof Error ? err.message : 'Failed to complete sign-in'
    );
    return NextResponse.redirect(loginUrl);
  }
}

