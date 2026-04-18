/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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

export default function OAuthCompletePage() {
  const router = useRouter();
  const authStore = useAuthStore();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const raw = getCookie('oauth_payload');
    deleteCookie('oauth_payload', '/auth/oauth-complete');

    if (!raw) {
      router.replace('/auth/login?error=OAuth+session+expired');
      return;
    }

    try {
      const data = JSON.parse(raw) as {
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; firstName?: string; lastName?: string; role: string };
      };

      // Store tokens in localStorage (same keys as useAuth.saveAuthResponse)
      localStorage.setItem(AUTH_TOKEN_KEY, data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));

      // Sync Zustand store
      authStore.setTokens(data.accessToken, data.refreshToken);
      authStore.setUser(data.user);

      router.replace('/dashboard');
    } catch {
      router.replace('/auth/login?error=Failed+to+complete+sign-in');
    }
  }, [router, authStore]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-muted-foreground">Completing sign-in…</p>
    </div>
  );
}
