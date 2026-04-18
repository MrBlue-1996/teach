'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, type User, type BackendAuthResponse, type BackendMeResponse } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_DATA_KEY = 'user_data';

export function useAuth() {
  const router = useRouter();
  const authStore = useAuthStore();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const syncAuthenticatedUser = useCallback(
    (response: BackendMeResponse) => {
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(response.user));
      authStore.setUser(response.user);
      setState({ user: response.user, isLoading: false, isAuthenticated: true });
    },
    [authStore]
  );

  const clearTokens = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    authStore.clearAuth();
  }, [authStore]);

  const tryRefresh = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        const response = await authApi.refreshToken(refreshToken);
        localStorage.setItem(AUTH_TOKEN_KEY, response.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
        authStore.setTokens(response.accessToken, response.refreshToken);

        const meResponse = await authApi.me();
        syncAuthenticatedUser(meResponse);
        return;
      } catch {
        // Refresh failed, clear everything.
      }
    }

    clearTokens();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, [authStore, clearTokens, syncAuthenticatedUser]);

  useEffect(() => {
    let cancelled = false;

    async function initializeAuth() {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        if (!cancelled) {
          setState({ user: null, isLoading: false, isAuthenticated: false });
        }
        return;
      }

      try {
        const response = await authApi.me();
        if (!cancelled) {
          syncAuthenticatedUser(response);
        }
      } catch {
        if (!cancelled) {
          await tryRefresh();
        }
      }
    }

    void initializeAuth();

    return () => {
      cancelled = true;
    };
  }, [syncAuthenticatedUser, tryRefresh]);

  /**
   * Save tokens and user data from a backend auth response.
   * Backend returns tokens at the top level: { user, accessToken, refreshToken, expiresIn, tokenType }
   */
  const saveAuthResponse = useCallback(
    (response: BackendAuthResponse) => {
      localStorage.setItem(AUTH_TOKEN_KEY, response.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(response.user));
      authStore.setTokens(response.accessToken, response.refreshToken);
      authStore.setUser(response.user);
    },
    [authStore]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login({ email, password });
      saveAuthResponse(response);
      setState({ user: response.user, isLoading: false, isAuthenticated: true });
      router.push('/dashboard');
    },
    [router, saveAuthResponse]
  );

  const signup = useCallback(
    async (email: string, password: string, firstName?: string, lastName?: string) => {
      const response = await authApi.signup({ email, password, firstName, lastName });
      saveAuthResponse(response);
      setState({ user: response.user, isLoading: false, isAuthenticated: true });
      router.push('/dashboard');
    },
    [router, saveAuthResponse]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout API errors.
    }
    clearTokens();
    setState({ user: null, isLoading: false, isAuthenticated: false });
    router.push('/');
  }, [clearTokens, router]);

  const forgotPassword = useCallback(async (email: string) => {
    await authApi.forgotPassword(email);
  }, []);

  const resetPassword = useCallback(
    async (token: string, password: string) => {
      await authApi.resetPassword(token, password);
      router.push('/auth/login');
    },
    [router]
  );

  return {
    user: state.user,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    login,
    signup,
    logout,
    forgotPassword,
    resetPassword,
  };
}
