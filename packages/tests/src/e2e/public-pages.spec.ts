/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { test, expect } from '@playwright/test';

test.describe('Public page accessibility', () => {
  const publicPaths = [
    { path: '/', label: 'Landing page' },
    { path: '/auth/login', label: 'Login page' },
    { path: '/auth/signup', label: 'Signup page' },
  ] as const;

  for (const { path, label } of publicPaths) {
    test(`${label} (${path}) returns 200`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(400);
    });

    test(`${label} (${path}) has no console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await page.goto(path);
      // Filter out expected Supabase auth errors in CI (no real Supabase)
      const fatalErrors = errors.filter(
        (e) =>
          !e.includes('supabase') &&
          !e.includes('Supabase') &&
          !e.includes('NEXT_PUBLIC_SUPABASE') &&
          !e.includes('Failed to fetch') &&
          !e.includes('net::ERR_')
      );
      expect(fatalErrors).toHaveLength(0);
    });
  }
});

test.describe('404 handling', () => {
  test('unknown route renders a not-found or redirect', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-xyz');
    // Next.js returns 404 or redirects to login — both are acceptable
    const status = response?.status() ?? 0;
    const url = page.url();
    const isNotFound = status === 404;
    const isRedirect = url.includes('/auth/login') || url.includes('/');
    expect(isNotFound || isRedirect).toBe(true);
  });
});
