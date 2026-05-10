/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { expect, test } from '@playwright/test';

test.describe('Kitchen phone emulator', () => {
  test('renders recipe surfaces on a phone-sized viewport', async ({ page }) => {
    await page.goto('/kitchen');

    await expect(page.getByRole('heading', { name: 'TopShelf Kitchen' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Recipe Book/i })).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/kitchen\/recipes/, { timeout: 15_000 }),
      page.getByRole('link', { name: /Recipe Book/i }).click(),
    ]);

    await expect(page.getByRole('heading', { name: 'Recipe Book' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Uncle Julio's: Fajita Rush/i })).toBeVisible();

    await page.goto('/kitchen/challenges/uj-grill-setup');
    await page.getByRole('button', { name: 'Fire' }).click();

    await expect(page.getByRole('button', { name: 'Show recipe' })).toBeVisible();
    await page.getByRole('button', { name: 'Show recipe' }).click();
    await expect(page.getByRole('heading', { name: 'Mesquite Grill Station Setup' })).toBeVisible();
  });
});
