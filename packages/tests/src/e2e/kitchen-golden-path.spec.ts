/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { test, expect } from '@playwright/test';

test.describe('Kitchen golden path', () => {
  test('runs the rush challenge through solve, teach, and mastery views', async ({ page }) => {
    await page.goto('/kitchen');

    await expect(page.getByRole('heading', { name: 'TopShelf Kitchen' })).toBeVisible();
    await expect(page.getByRole('link', { name: /UJ: Fajita Rush/i })).toBeVisible();
    await expect(page.getByText(/Rush Hour Simulator/i)).toHaveCount(0);

    await page.getByRole('link', { name: /Quick Challenge/i }).click();
    await expect(page).toHaveURL(/\/kitchen\/challenges\/uj-fajita-rush/);
    await expect(
      page.getByRole('heading', { level: 1, name: "Uncle Julio's: Fajita Rush" })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Fire' }).click();
    await expect(page.getByRole('timer')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Order tickets' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Walk-in inventory' })).toBeVisible();

    await page.getByRole('button', { name: /Select Marinated chicken breast \(old lot\)/ }).click();
    await expect(page.getByRole('alertdialog')).toContainText('Spoiled product grabbed');
    await page.getByRole('button', { name: 'Acknowledge' }).click();

    await page.getByRole('button', { name: 'End rush' }).click();
    await expect(page.getByText('Total cost lost')).toBeVisible();
    await expect(page.getByText(/Replay timeline/i)).toBeVisible();

    await page.getByRole('button', { name: 'Show me the right way' }).click();
    await expect(page.getByRole('heading', { name: 'The expert standard' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Mesquite-Grilled Chicken Fajitas' })
    ).toBeVisible();

    await page.getByRole('button', { name: /Why\?/ }).first().click();
    await expect(page.getByText(/prevent cross-contamination from raw chicken/i)).toBeVisible();

    await page.getByRole('button', { name: 'Skip to mastery' }).click();
    await expect(page.getByRole('heading', { name: 'Mastery scored' })).toBeVisible();

    await page.getByRole('button', { name: 'Return to kitchen' }).click();
    await expect(page).toHaveURL(/\/kitchen$/);
    await expect(page.getByRole('heading', { name: 'TopShelf Kitchen' })).toBeVisible();
  });
});
