'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { authApi, type User, type BackendAuthResponse } from '@/lib/api';
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

  // Load user on mount from stored data
  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      // Since backend has no /auth/me endpoint, restore user from localStorage
      const storedUser = localStorage.getItem(USER_DATA_KEY);
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser) as User;
          setState({ user, isLoading: false, isAuthenticated: true });
          authStore.setUser(user);
          return;
        } catch {
          // Invalid stored data, fall through to clear
        }
      }
      // If we have a token but no stored user, try to refresh to validate
      tryRefresh();
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const tryRefresh = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        const response = await authApi.refreshToken(refreshToken);
        // Refresh only returns new tokens, not user data
        localStorage.setItem(AUTH_TOKEN_KEY, response.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
        authStore.setTokens(response.accessToken, response.refreshToken);

        // Restore user from stored data (refresh doesn't return user)
        const storedUser = localStorage.getItem(USER_DATA_KEY);
        if (storedUser) {
          const user = JSON.parse(storedUser) as User;
          setState({ user, isLoading: false, isAuthenticated: true });
          authStore.setUser(user);
          return;
        }
      } catch {
        // Refresh failed, clear everything
      }
    }
    clearTokens();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  /**
   * Save tokens and user data from a backend auth response.
   * Backend returns tokens at the top level: { user, accessToken, refreshToken, expiresIn, tokenType }
   */
  const saveAuthResponse = (response: BackendAuthResponse) => {
    localStorage.setItem(AUTH_TOKEN_KEY, response.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(response.user));
    authStore.setTokens(response.accessToken, response.refreshToken);
    authStore.setUser(response.user);
  };

  const clearTokens = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    authStore.clearAuth();
  };

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login({ email, password });
      saveAuthResponse(response);
      setState({ user: response.user, isLoading: false, isAuthenticated: true });
      router.push('/dashboard');
    },
    [router]
  );

  const signup = useCallback(
    async (email: string, password: string, firstName?: string, lastName?: string) => {
      const response = await authApi.signup({ email, password, firstName, lastName });
      saveAuthResponse(response);
      setState({ user: response.user, isLoading: false, isAuthenticated: true });
      router.push('/dashboard');
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout API errors
    }
    clearTokens();
    setState({ user: null, isLoading: false, isAuthenticated: false });
    router.push('/');
  }, [router]);

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
