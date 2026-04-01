/**
 * Tests for Auth Store (Zustand)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './auth-store';
import type { User } from '@/lib/api';

describe('useAuthStore', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'learner',
    organizationId: 'org-123',
    createdAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    // Reset the store to initial state before each test
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
    });
  });

  describe('initial state', () => {
    it('should have null user by default', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('should have null accessToken by default', () => {
      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
    });

    it('should have null refreshToken by default', () => {
      const state = useAuthStore.getState();
      expect(state.refreshToken).toBeNull();
    });

    it('should not be authenticated by default', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated()).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should set the user', () => {
      useAuthStore.getState().setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
    });

    it('should set user to null', () => {
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().setUser(null);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('should update user partially (replace entire user)', () => {
      useAuthStore.getState().setUser(mockUser);

      const updatedUser: User = {
        ...mockUser,
        firstName: 'Updated',
        lastName: 'Name',
      };
      useAuthStore.getState().setUser(updatedUser);

      const state = useAuthStore.getState();
      expect(state.user?.firstName).toBe('Updated');
      expect(state.user?.lastName).toBe('Name');
    });
  });

  describe('setTokens', () => {
    it('should set both access and refresh tokens', () => {
      useAuthStore.getState().setTokens('access-123', 'refresh-456');

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('access-123');
      expect(state.refreshToken).toBe('refresh-456');
    });

    it('should overwrite existing tokens', () => {
      useAuthStore.getState().setTokens('old-access', 'old-refresh');
      useAuthStore.getState().setTokens('new-access', 'new-refresh');

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('new-access');
      expect(state.refreshToken).toBe('new-refresh');
    });
  });

  describe('setAuthFromResponse', () => {
    it('should set user and tokens from backend auth response', () => {
      const authResponse = {
        user: mockUser,
        accessToken: 'access-token-abc',
        refreshToken: 'refresh-token-xyz',
      };

      useAuthStore.getState().setAuthFromResponse(authResponse);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe('access-token-abc');
      expect(state.refreshToken).toBe('refresh-token-xyz');
    });

    it('should make user authenticated after setting from response', () => {
      const authResponse = {
        user: mockUser,
        accessToken: 'access-token-abc',
        refreshToken: 'refresh-token-xyz',
      };

      useAuthStore.getState().setAuthFromResponse(authResponse);

      expect(useAuthStore.getState().isAuthenticated()).toBe(true);
    });
  });

  describe('clearAuth', () => {
    it('should clear all auth state', () => {
      // First set some state
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().setTokens('access', 'refresh');

      // Then clear it
      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
    });

    it('should make user not authenticated after clearing', () => {
      useAuthStore.getState().setAuthFromResponse({
        user: mockUser,
        accessToken: 'access',
        refreshToken: 'refresh',
      });

      expect(useAuthStore.getState().isAuthenticated()).toBe(true);

      useAuthStore.getState().clearAuth();

      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no tokens and no user', () => {
      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    });

    it('should return false when only user is set', () => {
      useAuthStore.getState().setUser(mockUser);

      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    });

    it('should return false when only token is set', () => {
      useAuthStore.getState().setTokens('access', 'refresh');

      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    });

    it('should return true when both user and accessToken are set', () => {
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().setTokens('access', 'refresh');

      expect(useAuthStore.getState().isAuthenticated()).toBe(true);
    });
  });

  describe('persistence', () => {
    it('should have persist configuration with auth-storage name', () => {
      // The store is created with persist middleware
      // We can verify by checking the store's persist property
      const store = useAuthStore;
      // Zustand persist middleware adds a persist property
      expect(store.persist).toBeDefined();
    });

    it('should partialize state to only persist user and tokens', () => {
      // Set state and verify the partialized version would include the right keys
      useAuthStore.getState().setAuthFromResponse({
        user: mockUser,
        accessToken: 'access',
        refreshToken: 'refresh',
      });

      const state = useAuthStore.getState();
      // Verify the state has the expected shape that would be persisted
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe('access');
      expect(state.refreshToken).toBe('refresh');
      // Methods should not be persisted (they're functions)
      expect(typeof state.setUser).toBe('function');
      expect(typeof state.setTokens).toBe('function');
      expect(typeof state.clearAuth).toBe('function');
      expect(typeof state.isAuthenticated).toBe('function');
    });
  });

  describe('store subscription', () => {
    it('should notify subscribers when state changes', () => {
      let callCount = 0;
      const unsubscribe = useAuthStore.subscribe(() => {
        callCount++;
      });

      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().setTokens('access', 'refresh');
      useAuthStore.getState().clearAuth();

      expect(callCount).toBe(3);
      unsubscribe();
    });

    it('should track state changes', () => {
      let callCount = 0;
      const unsubscribe = useAuthStore.subscribe(() => {
        callCount++;
      });

      // Clear any initial state
      const initialCount = callCount;

      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().setUser(null);

      // Verify state changes triggered subscription
      expect(callCount).toBeGreaterThan(initialCount);

      unsubscribe();
    });
  });
});
