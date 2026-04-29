/**
 * Tests for useAuth Hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from './use-auth';
import { authApi, type BackendAuthResponse, type User } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

// Mock the dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/lib/api', () => ({
  authApi: {
    login: vi.fn(),
    me: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

const mockAuthApi = authApi as unknown as {
  login: ReturnType<typeof vi.fn>;
  me: ReturnType<typeof vi.fn>;
  signup: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  refreshToken: ReturnType<typeof vi.fn>;
  forgotPassword: ReturnType<typeof vi.fn>;
  resetPassword: ReturnType<typeof vi.fn>;
};

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

const mockRouter = {
  push: vi.fn(),
};

// Override the router mock for each test
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

describe('useAuth', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'learner',
    organizationId: 'org-123',
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockAuthResponse: BackendAuthResponse = {
    message: 'Login successful',
    user: mockUser,
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-456',
    expiresIn: 3600,
    tokenType: 'Bearer',
  };

  const mockAuthStore = {
    setUser: vi.fn(),
    setTokens: vi.fn(),
    clearAuth: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseAuthStore.mockImplementation((selector?: (store: typeof mockAuthStore) => unknown) =>
      selector === undefined ? mockAuthStore : selector(mockAuthStore)
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should start with user null and not authenticated', async () => {
      const { result } = renderHook(() => useAuth());

      // Wait for initial state to settle
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // When no token is present, user should be null and not authenticated
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should set loading to false when no token exists', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should restore user from /auth/me when token exists', async () => {
      localStorage.setItem('auth_token', 'stored-token');
      mockAuthApi.me.mockResolvedValueOnce({ user: mockUser });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(mockAuthApi.me).toHaveBeenCalled();
      expect(mockAuthStore.setUser).toHaveBeenCalledWith(mockUser);
    });

    it('should attempt refresh when /auth/me fails', async () => {
      localStorage.setItem('auth_token', 'stored-token');
      localStorage.setItem('refresh_token', 'refresh-token');
      mockAuthApi.me.mockRejectedValueOnce(new Error('expired'));

      mockAuthApi.refreshToken.mockResolvedValueOnce({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
      });
      mockAuthApi.me.mockResolvedValueOnce({ user: mockUser });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(localStorage.getItem('auth_token')).toBe('new-access-token');
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should clear auth when /auth/me and refresh both fail', async () => {
      localStorage.setItem('auth_token', 'stored-token');
      localStorage.setItem('refresh_token', 'refresh-token');

      mockAuthApi.me.mockRejectedValueOnce(new Error('expired'));
      mockAuthApi.refreshToken.mockRejectedValueOnce(new Error('Invalid token'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('login', () => {
    it('should login successfully and navigate to dashboard', async () => {
      mockAuthApi.login.mockResolvedValueOnce(mockAuthResponse);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(mockAuthApi.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(localStorage.getItem('auth_token')).toBe('access-token-123');
      expect(localStorage.getItem('refresh_token')).toBe('refresh-token-456');
      expect(localStorage.getItem('user_data')).toBe(JSON.stringify(mockUser));

      expect(mockAuthStore.setTokens).toHaveBeenCalledWith('access-token-123', 'refresh-token-456');
      expect(mockAuthStore.setUser).toHaveBeenCalledWith(mockUser);
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });

    it('should propagate login errors', async () => {
      const error = new Error('Invalid credentials');
      mockAuthApi.login.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.login('test@example.com', 'wrong-password');
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('signup', () => {
    it('should signup successfully with full user data', async () => {
      mockAuthApi.signup.mockResolvedValueOnce(mockAuthResponse);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signup('test@example.com', 'password123', 'Test', 'User');
      });

      expect(mockAuthApi.signup).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(localStorage.getItem('auth_token')).toBe('access-token-123');
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });

    it('should signup with only required fields', async () => {
      mockAuthApi.signup.mockResolvedValueOnce(mockAuthResponse);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signup('test@example.com', 'password123');
      });

      expect(mockAuthApi.signup).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should propagate signup errors', async () => {
      const error = new Error('Email already exists');
      mockAuthApi.signup.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.signup('existing@example.com', 'password123');
        })
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('logout', () => {
    it('should logout and clear all auth data', async () => {
      localStorage.setItem('auth_token', 'token');
      localStorage.setItem('refresh_token', 'refresh');
      localStorage.setItem('user_data', JSON.stringify(mockUser));

      mockAuthApi.logout.mockResolvedValueOnce({ message: 'Logged out' });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(mockAuthApi.logout).toHaveBeenCalled();
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
      expect(localStorage.getItem('user_data')).toBeNull();
      expect(mockAuthStore.clearAuth).toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });

    it('should clear auth even if logout API fails', async () => {
      localStorage.setItem('auth_token', 'token');
      mockAuthApi.logout.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      // Should still clear local auth data
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(mockAuthStore.clearAuth).toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });

  describe('forgotPassword', () => {
    it('should call forgotPassword API', async () => {
      mockAuthApi.forgotPassword.mockResolvedValueOnce({ message: 'Email sent' });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.forgotPassword('test@example.com');
      });

      expect(mockAuthApi.forgotPassword).toHaveBeenCalledWith('test@example.com');
    });

    it('should propagate errors', async () => {
      const error = new Error('User not found');
      mockAuthApi.forgotPassword.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.forgotPassword('unknown@example.com');
        })
      ).rejects.toThrow('User not found');
    });
  });

  describe('resetPassword', () => {
    it('should reset password and navigate to login', async () => {
      mockAuthApi.resetPassword.mockResolvedValueOnce({ message: 'Password reset' });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.resetPassword('reset-token-123', 'new-password');
      });

      expect(mockAuthApi.resetPassword).toHaveBeenCalledWith('reset-token-123', 'new-password');
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
    });

    it('should propagate errors', async () => {
      const error = new Error('Invalid or expired token');
      mockAuthApi.resetPassword.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.resetPassword('invalid-token', 'new-password');
        })
      ).rejects.toThrow('Invalid or expired token');
    });
  });

  describe('return values', () => {
    it('should return all expected properties and functions', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.signup).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.forgotPassword).toBe('function');
      expect(typeof result.current.resetPassword).toBe('function');
    });
  });
});
