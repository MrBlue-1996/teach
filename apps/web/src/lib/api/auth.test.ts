/**
 * Tests for Auth API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authApi, type BackendAuthResponse, type BackendRefreshResponse, type User } from './auth';

// Mock the api client
vi.mock('./client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from './client';

const mockApi = api as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  describe('login', () => {
    it('should call POST /auth/login with credentials', async () => {
      mockApi.post.mockResolvedValueOnce(mockAuthResponse);

      const result = await authApi.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result).toEqual(mockAuthResponse);
    });

    it('should propagate API errors', async () => {
      const error = new Error('Invalid credentials');
      mockApi.post.mockRejectedValueOnce(error);

      await expect(authApi.login({ email: 'test@example.com', password: 'wrong' })).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });

  describe('signup', () => {
    it('should call POST /auth/register with user data', async () => {
      mockApi.post.mockResolvedValueOnce(mockAuthResponse);

      const result = await authApi.signup({
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      });

      expect(mockApi.post).toHaveBeenCalledWith('/auth/register', {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      });
      expect(result).toEqual(mockAuthResponse);
    });

    it('should handle signup without optional fields', async () => {
      mockApi.post.mockResolvedValueOnce(mockAuthResponse);

      await authApi.signup({
        email: 'minimal@example.com',
        password: 'password123',
      });

      expect(mockApi.post).toHaveBeenCalledWith('/auth/register', {
        email: 'minimal@example.com',
        password: 'password123',
      });
    });
  });

  describe('logout', () => {
    it('should call POST /auth/logout', async () => {
      mockApi.post.mockResolvedValueOnce({ message: 'Logged out' });

      const result = await authApi.logout();

      expect(mockApi.post).toHaveBeenCalledWith('/auth/logout');
      expect(result).toEqual({ message: 'Logged out' });
    });
  });

  describe('refreshToken', () => {
    it('should call POST /auth/refresh with token', async () => {
      const refreshResponse: BackendRefreshResponse = {
        message: 'Token refreshed',
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
      };
      mockApi.post.mockResolvedValueOnce(refreshResponse);

      const result = await authApi.refreshToken('old-refresh-token');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'old-refresh-token',
      });
      expect(result).toEqual(refreshResponse);
    });
  });

  describe('forgotPassword', () => {
    it('should call POST /auth/forgot-password with email', async () => {
      mockApi.post.mockResolvedValueOnce({ message: 'Reset email sent' });

      const result = await authApi.forgotPassword('test@example.com');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'test@example.com',
      });
      expect(result).toEqual({ message: 'Reset email sent' });
    });
  });

  describe('resetPassword', () => {
    it('should call POST /auth/reset-password with token and password', async () => {
      mockApi.post.mockResolvedValueOnce({ message: 'Password reset' });

      const result = await authApi.resetPassword('reset-token', 'newpassword123');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'reset-token',
        password: 'newpassword123',
      });
      expect(result).toEqual({ message: 'Password reset' });
    });
  });

  describe('verifyEmail', () => {
    it('should call POST /auth/verify-email with token', async () => {
      mockApi.post.mockResolvedValueOnce({ message: 'Email verified' });

      const result = await authApi.verifyEmail('verify-token');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/verify-email', {
        token: 'verify-token',
      });
      expect(result).toEqual({ message: 'Email verified' });
    });
  });

  describe('me', () => {
    it('should call GET /auth/me', async () => {
      mockApi.get.mockResolvedValueOnce(mockUser);

      const result = await authApi.me();

      expect(mockApi.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockUser);
    });
  });
});
