/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the TopShelf brand name', async ({ page }) => {
    await expect(page.getByText('TopShelf').first()).toBeVisible();
  });

  test('shows the hero headline', async ({ page }) => {
    // The landing page copy references "learn" and "AI"
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('has a Sign In link pointing to /auth/login', async ({ page }) => {
    const signIn = page.getByRole('link', { name: /sign in/i });
    await expect(signIn).toBeVisible();
    await expect(signIn).toHaveAttribute('href', '/auth/login');
  });

  test('has a Start Free link pointing to /auth/signup', async ({ page }) => {
    const startFree = page.getByRole('link', { name: /start free/i }).first();
    await expect(startFree).toBeVisible();
    await expect(startFree).toHaveAttribute('href', '/auth/signup');
  });

  test('navigates to login when Sign In is clicked', async ({ page }) => {
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('navigates to signup when Start Free is clicked', async ({ page }) => {
    await page
      .getByRole('link', { name: /start free/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test('page title contains TopShelf', async ({ page }) => {
    await expect(page).toHaveTitle(/top shelf/i);
  });
});
