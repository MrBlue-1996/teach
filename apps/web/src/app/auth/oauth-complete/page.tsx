/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';

const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_DATA_KEY = 'user_data';

function getCookie(name: string): string | null {
  const prefix = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie.split('; ').find((entry) => entry.startsWith(prefix));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(prefix.length));
}

function deleteCookie(name: string, path: string) {
  document.cookie = `${name}=; path=${path}; max-age=0`;
}

function isOAuthPayload(
  value: unknown
): value is {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; firstName?: string; lastName?: string; role: string };
} {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const user = record['user'];
  if (typeof user !== 'object' || user === null) {
    return false;
  }

  const userRecord = user as Record<string, unknown>;
  return (
    typeof record['accessToken'] === 'string' &&
    typeof record['refreshToken'] === 'string' &&
    typeof userRecord['id'] === 'string' &&
    typeof userRecord['email'] === 'string' &&
    typeof userRecord['role'] === 'string'
  );
}

function redirectTo(path: string): void {
  window.location.replace(path);
}

export default function OAuthCompletePage() {
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) {
      return;
    }

    processed.current = true;

    const raw = getCookie('oauth_payload');
    deleteCookie('oauth_payload', '/auth/oauth-complete');
    deleteCookie('oauth_warning', '/auth/oauth-complete');

    if (!raw) {
      redirectTo('/auth/login?error=OAuth+session+expired');
      return;
    }

    try {
      const data: unknown = JSON.parse(raw);
      if (!isOAuthPayload(data)) {
        throw new Error('Invalid OAuth payload');
      }

      const { setTokens, setUser } = useAuthStore.getState();

      // Store tokens in localStorage (same keys as useAuth.saveAuthResponse)
      localStorage.setItem(AUTH_TOKEN_KEY, data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));

      // Sync Zustand store
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);

      redirectTo('/dashboard');
    } catch {
      redirectTo('/auth/login?error=Failed+to+complete+sign-in');
    }
  }, []);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-muted-foreground">Completing sign-in…</p>
    </div>
  );
}
