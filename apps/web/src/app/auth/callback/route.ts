/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { BackendAuthResponse } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

function getOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function extractNameParts(metadata: unknown): {
  firstName?: string;
  lastName?: string;
} {
  if (typeof metadata !== 'object' || metadata === null) {
    return {};
  }

  const record = metadata as Record<string, unknown>;
  const fullName = getOptionalString(record, 'full_name');
  const fullNameParts = fullName?.split(' ') ?? [];
  const derivedFirstName = fullNameParts[0];
  const derivedLastName = fullNameParts.slice(1).join(' ') || undefined;

  const firstName =
    getOptionalString(record, 'given_name') ??
    getOptionalString(record, 'first_name') ??
    derivedFirstName;
  const lastName =
    getOptionalString(record, 'family_name') ??
    getOptionalString(record, 'last_name') ??
    derivedLastName;

  return {
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
  };
}

function isBackendAuthResponse(value: unknown): value is BackendAuthResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.accessToken === 'string' &&
    typeof record.refreshToken === 'string' &&
    typeof record.user === 'object' &&
    record.user !== null
  );
}

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

  // Extract user info from Supabase user
  const email = supaUser.email;
  if (!email) {
    const loginUrl = new URL('/auth/login', origin);
    loginUrl.searchParams.set('error', 'No email returned from provider');
    return NextResponse.redirect(loginUrl);
  }

  const { firstName, lastName } = extractNameParts(supaUser.user_metadata);

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

    const tokensJson: unknown = await backendRes.json();
    if (!isBackendAuthResponse(tokensJson)) {
      throw new Error('Backend returned an unexpected auth payload');
    }

    const tokens = tokensJson;

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
