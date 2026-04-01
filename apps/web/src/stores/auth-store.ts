import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { User } from '@/lib/api';

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  /**
   * Handle a full backend auth response where tokens are at the top level:
   * { user, accessToken, refreshToken, expiresIn, tokenType }
   */
  setAuthFromResponse: (response: {
    user: User;
    accessToken: string;
    refreshToken: string;
  }) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setUser: (user) => set({ user }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setAuthFromResponse: (response) =>
        set({
          user: response.user,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
        }),
      clearAuth: () => set({ user: null, accessToken: null, refreshToken: null }),
      isAuthenticated: () => {
        const state = get();
        return state.accessToken !== null && state.user !== null;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
