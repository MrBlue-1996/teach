import { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer } from '../src/index.js';

describe('MCP server API', () => {
  const sessionId = 'api-smoke-test';
  const server = startServer(0);
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  beforeAll(async () => {
    await fetch(`${baseUrl}/api/session/${sessionId}`, { method: 'DELETE' });
  });

  afterAll(async () => {
    await fetch(`${baseUrl}/api/session/${sessionId}`, { method: 'DELETE' });
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  it('serves the manual MVP page', async () => {
    const response = await fetch(`${baseUrl}/mvp`);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain('Click through the teaching MVP.');
  });

  it('runs the core API flow', async () => {
    const initResponse = await fetch(`${baseUrl}/api/session/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        mode: 4,
        deviceProfile: 'chromebook_standard',
      }),
    });
    const initBody = await initResponse.json();

    expect(initResponse.status).toBe(200);
    expect(initBody.sessionId).toBe(sessionId);
    expect(initBody.mode).toBe(4);

    const teachResponse = await fetch(`${baseUrl}/api/teach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        content: 'Break the problem into smaller checks before changing more code.',
        errorCount: 4,
        problemsSolved: 1,
      }),
    });
    const teachBody = await teachResponse.json();

    expect(teachResponse.status).toBe(200);
    expect(teachBody.shouldTeach).toBe(true);
    expect(teachBody.content).toContain('Tutorial:');

    const triggerResponse = await fetch(`${baseUrl}/api/triggers/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    const triggerBody = await triggerResponse.json();

    expect(triggerResponse.status).toBe(200);
    expect(triggerBody.triggers).toContain('error_repeated');

    const statusResponse = await fetch(`${baseUrl}/api/session/${sessionId}`);
    const statusBody = await statusResponse.json();

    expect(statusResponse.status).toBe(200);
    expect(statusBody.errorsEncountered).toBe(4);
    expect(statusBody.problemsSolved).toBe(1);

    const deleteResponse = await fetch(`${baseUrl}/api/session/${sessionId}`, {
      method: 'DELETE',
    });
    const deleteBody = await deleteResponse.json();

    expect(deleteResponse.status).toBe(200);
    expect(deleteBody.sessionId).toBe(sessionId);
  });
});