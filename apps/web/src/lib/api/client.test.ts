/**
 * Tests for API Client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError, apiRequest, api } from './client';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ApiError', () => {
  it('should create an ApiError with all properties', () => {
    const error = new ApiError('Test error', 400, 'TEST_ERROR', { field: 'value' });

    expect(error.message).toBe('Test error');
    expect(error.status).toBe(400);
    expect(error.code).toBe('TEST_ERROR');
    expect(error.details).toEqual({ field: 'value' });
    expect(error.name).toBe('ApiError');
    expect(error instanceof Error).toBe(true);
  });

  it('should create an ApiError without optional properties', () => {
    const error = new ApiError('Test error', 500);

    expect(error.message).toBe('Test error');
    expect(error.status).toBe(500);
    expect(error.code).toBeUndefined();
    expect(error.details).toBeUndefined();
  });
});

describe('apiRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should make a GET request to the correct URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: 'test' })),
    });

    const result = await apiRequest<{ data: string }>('/test');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/v1/test');
    expect(options.method).toBeUndefined(); // Default GET
  });

  it('should add query params to URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: 'test' })),
    });

    await apiRequest('/test', { params: { foo: 'bar', baz: '123' } });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/v1/test?foo=bar&baz=123');
  });

  it('should set Content-Type header when body is provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ success: true })),
    });

    await apiRequest('/test', { method: 'POST', body: JSON.stringify({ data: 'test' }) });

    const [, options] = mockFetch.mock.calls[0];
    const headers = options.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('should not override Content-Type header if already set', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ success: true })),
    });

    await apiRequest('/test', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
      headers: { 'Content-Type': 'text/plain' },
    });

    const [, options] = mockFetch.mock.calls[0];
    const headers = options.headers as Headers;
    expect(headers.get('Content-Type')).toBe('text/plain');
  });

  it('should add auth token from localStorage', async () => {
    localStorage.setItem('auth_token', 'test-token-123');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: 'test' })),
    });

    await apiRequest('/test');

    const [, options] = mockFetch.mock.calls[0];
    const headers = options.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer test-token-123');
  });

  it('should not override Authorization header if already set', async () => {
    localStorage.setItem('auth_token', 'test-token-123');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: 'test' })),
    });

    await apiRequest('/test', { headers: { Authorization: 'Bearer custom-token' } });

    const [, options] = mockFetch.mock.calls[0];
    const headers = options.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer custom-token');
  });

  it('should parse JSON response', async () => {
    const responseData = { id: 1, name: 'Test' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(responseData)),
    });

    const result = await apiRequest<typeof responseData>('/test');

    expect(result).toEqual(responseData);
  });

  it('should handle empty response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(''),
    });

    const result = await apiRequest('/test');

    expect(result).toEqual({});
  });

  it('should throw ApiError on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: 'Not found', code: 'NOT_FOUND' }),
    });

    await expect(apiRequest('/test')).rejects.toThrow(ApiError);

    try {
      await apiRequest('/test');
    } catch (error) {
      // Need to reset mock for this catch block
    }
  });

  it('should handle error response without JSON body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Invalid JSON')),
    });

    await expect(apiRequest('/test')).rejects.toMatchObject({
      status: 500,
      message: 'HTTP error 500',
    });
  });

  it('should include error details from response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: { field: 'email', error: 'Invalid format' },
        }),
    });

    try {
      await apiRequest('/test');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.message).toBe('Validation failed');
      expect(apiError.status).toBe(400);
      expect(apiError.code).toBe('VALIDATION_ERROR');
      expect(apiError.details).toEqual({ field: 'email', error: 'Invalid format' });
    }
  });
});

describe('api convenience methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('api.get', () => {
    it('should make a GET request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: 'test' })),
      });

      await api.get('/users');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3000/api/v1/users');
      expect(options.method).toBe('GET');
    });

    it('should pass query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify([])),
      });

      await api.get('/users', { page: '1', limit: '10' });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3000/api/v1/users?page=1&limit=10');
    });
  });

  describe('api.post', () => {
    it('should make a POST request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ id: 1 })),
      });

      await api.post('/users', { name: 'Test' });

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3000/api/v1/users');
      expect(options.method).toBe('POST');
      expect(options.body).toBe('{"name":"Test"}');
    });

    it('should handle POST without body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ success: true })),
      });

      await api.post('/logout');

      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('POST');
      expect(options.body).toBeUndefined();
    });
  });

  describe('api.put', () => {
    it('should make a PUT request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ id: 1 })),
      });

      await api.put('/users/1', { name: 'Updated' });

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3000/api/v1/users/1');
      expect(options.method).toBe('PUT');
      expect(options.body).toBe('{"name":"Updated"}');
    });
  });

  describe('api.patch', () => {
    it('should make a PATCH request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ id: 1 })),
      });

      await api.patch('/users/1', { name: 'Patched' });

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3000/api/v1/users/1');
      expect(options.method).toBe('PATCH');
      expect(options.body).toBe('{"name":"Patched"}');
    });
  });

  describe('api.delete', () => {
    it('should make a DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ deleted: true })),
      });

      await api.delete('/users/1');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3000/api/v1/users/1');
      expect(options.method).toBe('DELETE');
    });
  });
});
