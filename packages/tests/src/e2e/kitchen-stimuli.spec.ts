/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { expect, test } from '@playwright/test';

const CASES = [
  {
    slug: 'uj-fajita-rush',
    kind: 'ticket',
    label: 'Ticket stimulus',
  },
  {
    slug: 'uj-enchilada-rush',
    kind: 'menu_board',
    label: 'Menu board stimulus',
  },
  {
    slug: 'uj-line-temps',
    kind: 'station_state',
    label: 'Station state stimulus',
  },
  {
    slug: 'uj-grill-setup',
    kind: 'step_bank',
    label: 'Step bank stimulus',
  },
  {
    slug: 'uj-queso-scale',
    kind: 'plain_text',
    label: 'Plain text stimulus',
  },
  {
    slug: 'uj-allergy-order',
    kind: 'huddle_notes',
    label: 'Huddle notes stimulus',
  },
] as const;

test.describe('Kitchen stimulus rendering', () => {
  for (const tc of CASES) {
    test(`renders ${tc.kind} for ${tc.slug} without runtime errors`, async ({ page }) => {
      const pageErrors: Error[] = [];
      page.on('pageerror', (err) => pageErrors.push(err));

      await page.goto(`/kitchen/challenges/${tc.slug}`);
      await page.getByRole('button', { name: 'Fire' }).click();

      await expect(page.getByLabel(tc.label)).toBeVisible();
      expect(pageErrors, `Unexpected page errors in ${tc.slug}`).toHaveLength(0);
    });
  }
});
