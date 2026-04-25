/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Pilot loop smoke test — validates the end-to-end learner journey against a
 * live API server. Requires the API_BASE_URL env var or falls back to
 * http://localhost:3000/api/v1. Skip this suite with SKIP_INTEGRATION=1.
 *
 * Full loop tested:
 *   register → login → browse packs → enroll → start session
 *   → submit block answer → end session → check badge
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE_URL = process.env['API_BASE_URL'] ?? 'http://localhost:3000/api/v1';
const SKIP = process.env['SKIP_INTEGRATION'] === '1';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function api(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token !== undefined) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

async function json<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }
}

// ---------------------------------------------------------------------------
// state shared across tests
// ---------------------------------------------------------------------------

let accessToken = '';
let packId = '';
let packBlockId = '';
let sessionId = '';

const testEmail = `pilot-smoke-${Date.now()}@topshelf.test`;
const testPassword = 'PilotSmoke$1!';

// ---------------------------------------------------------------------------
// suite
// ---------------------------------------------------------------------------

describe.skipIf(SKIP)('Pilot loop smoke test', () => {
  beforeAll(async () => {
    const health = await fetch(`${BASE_URL.replace('/api/v1', '')}/health`);
    if (!health.ok) {
      throw new Error(`API server not reachable at ${BASE_URL}`);
    }
  });

  afterAll(async () => {
    // Best-effort cleanup — end session if still active
    if (sessionId.length > 0 && accessToken.length > 0) {
      await api('POST', `/learner/session/${sessionId}/end`, undefined, accessToken);
    }
  });

  // -------------------------------------------------------------------------
  // 1. Register
  // -------------------------------------------------------------------------
  it('registers a new learner account', async () => {
    const res = await api('POST', '/auth/register', {
      email: testEmail,
      password: testPassword,
      firstName: 'Pilot',
      lastName: 'Smoke',
    });

    expect(res.status).toBe(201);
    const body = await json<{ accessToken: string }>(res);
    expect(body.accessToken).toBeTruthy();
    accessToken = body.accessToken;
  });

  // -------------------------------------------------------------------------
  // 2. Login
  // -------------------------------------------------------------------------
  it('can log in with the new account', async () => {
    const res = await api('POST', '/auth/login', { email: testEmail, password: testPassword });
    expect(res.status).toBe(200);
    const body = await json<{ accessToken: string }>(res);
    expect(body.accessToken).toBeTruthy();
    accessToken = body.accessToken;
  });

  // -------------------------------------------------------------------------
  // 3. Browse packs — must have at least one published
  // -------------------------------------------------------------------------
  it('finds at least one published content pack', async () => {
    const res = await api('GET', '/content/packs', undefined, accessToken);
    expect(res.status).toBe(200);
    const body = await json<{ packs: Array<{ id: string }> }>(res);
    expect(body.packs.length).toBeGreaterThan(0);
    packId = body.packs[0]!.id;
  });

  // -------------------------------------------------------------------------
  // 4. Get pack details and grab first block
  // -------------------------------------------------------------------------
  it('can get pack details with blocks', async () => {
    const res = await api('GET', `/content/packs/${packId}`, undefined, accessToken);
    expect(res.status).toBe(200);
    const body = await json<{
      pack: { blocks: Array<{ blockId: string }> };
    }>(res);
    expect(body.pack.blocks.length).toBeGreaterThan(0);
    packBlockId = body.pack.blocks[0]!.blockId;
  });

  // -------------------------------------------------------------------------
  // 5. Enroll in pack
  // -------------------------------------------------------------------------
  it('can enroll in a content pack', async () => {
    const res = await api('POST', `/content/packs/${packId}/enroll`, undefined, accessToken);
    // 200 (already enrolled) or 201 (newly enrolled) — both are fine
    expect([200, 201]).toContain(res.status);
    const body = await json<{ enrolled: boolean }>(res);
    expect(body.enrolled).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 6. Start a learning session
  // -------------------------------------------------------------------------
  it('can start a learning session', async () => {
    const res = await api('POST', '/learner/session/start', { contentPackId: packId }, accessToken);
    expect(res.status).toBe(200);
    const body = await json<{ sessionId: string }>(res);
    expect(body.sessionId).toBeTruthy();
    sessionId = body.sessionId;
  });

  // -------------------------------------------------------------------------
  // 7. Submit a block answer
  // -------------------------------------------------------------------------
  it('can submit a block answer', async () => {
    const res = await api(
      'POST',
      `/content/packs/${packId}/blocks/${packBlockId}/submit`,
      { answer: 'smoke-test-answer', sessionId, timeSpentSeconds: 5 },
      accessToken
    );
    expect(res.status).toBe(200);
    const body = await json<{ correct: boolean; correctness: number }>(res);
    expect(typeof body.correct).toBe('boolean');
    expect(body.correctness).toBeGreaterThanOrEqual(0);
  });

  // -------------------------------------------------------------------------
  // 8. Send a session event
  // -------------------------------------------------------------------------
  it('can record a session event', async () => {
    const res = await api(
      'POST',
      `/learner/session/${sessionId}/event`,
      { eventType: 'block_completed', blockId: packBlockId, correct: true },
      accessToken
    );
    expect(res.status).toBe(200);
  });

  // -------------------------------------------------------------------------
  // 9. End the session
  // -------------------------------------------------------------------------
  it('can end the session', async () => {
    const res = await api('POST', `/learner/session/${sessionId}/end`, undefined, accessToken);
    expect(res.status).toBe(200);
    const body = await json<{ message: string; badgeAwarded: boolean }>(res);
    expect(body.message).toMatch(/session ended/i);
    expect(typeof body.badgeAwarded).toBe('boolean');
    sessionId = ''; // prevent afterAll from double-ending
  });

  // -------------------------------------------------------------------------
  // 10. Verify learner stats are reachable
  // -------------------------------------------------------------------------
  it('can fetch learner stats', async () => {
    const res = await api('GET', '/learner/stats', undefined, accessToken);
    expect(res.status).toBe(200);
    const body = await json<{ stats: { totalSessions: number } }>(res);
    expect(body.stats.totalSessions).toBeGreaterThanOrEqual(1);
  });

  // -------------------------------------------------------------------------
  // 11. Verify session list contains our session
  // -------------------------------------------------------------------------
  it('session list returns sessions with pack info', async () => {
    const res = await api('GET', '/session', undefined, accessToken);
    expect(res.status).toBe(200);
    const body = await json<{
      sessions: Array<{ status: string; contentPack?: { title: string } }>;
    }>(res);
    expect(body.sessions.length).toBeGreaterThan(0);
    const completed = body.sessions.find((s) => s.status === 'completed');
    expect(completed).toBeDefined();
    expect(completed?.contentPack).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 12. Badge list is accessible (earned or empty)
  // -------------------------------------------------------------------------
  it('badge list endpoint is reachable', async () => {
    const res = await api('GET', '/badge', undefined, accessToken);
    expect(res.status).toBe(200);
    const body = await json<{ badges: unknown[] }>(res);
    expect(Array.isArray(body.badges)).toBe(true);
  });
});
