/**
 * TopShelf Teaching - Auth API
 * Aligned with backend: packages/api-server/src/routes/auth.ts
 */

import { api } from './client';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  organizationId?: string;
  displayName?: string;
  emailVerified?: boolean;
  createdAt?: string;
}

export interface BackendMeResponse {
  user: User;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Backend login response shape:
 * { message: string, user: { id, email, firstName?, lastName?, role }, accessToken, refreshToken, expiresIn, tokenType }
 */
export interface BackendAuthResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * Backend refresh response shape:
 * { message: string, accessToken, refreshToken, expiresIn, tokenType }
 */
export interface BackendRefreshResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export const authApi = {
  login: (data: LoginRequest) => api.post<BackendAuthResponse>('/auth/login', data),

  /** Backend endpoint is POST /auth/register (not /auth/signup) */
  signup: (data: SignupRequest) => api.post<BackendAuthResponse>('/auth/register', data),

  logout: () => api.post<{ message: string }>('/auth/logout'),

  refreshToken: (refreshToken: string) =>
    api.post<BackendRefreshResponse>('/auth/refresh', { refreshToken }),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, password }),

  // TODO: Backend does not have a /auth/verify-email endpoint yet
  verifyEmail: (token: string) => api.post<{ message: string }>('/auth/verify-email', { token }),

  me: () => api.get<BackendMeResponse>('/auth/me'),
};
