/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:3001';
const CI = process.env['CI'] === 'true';

export default defineConfig({
  testDir: './src/e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 1 : undefined,
  reporter: CI ? 'github' : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      testIgnore: /.*\.mobile\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'pixel-7',
      testMatch: /.*\.mobile\.spec\.ts$/,
      use: { ...devices['Pixel 7'] },
    },
  ],

  webServer: {
    command: 'pnpm --filter @topshelf/web run dev',
    url: BASE_URL,
    reuseExistingServer: !CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_API_URL: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1',
      NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? 'ci-placeholder-anon-key',
    },
  },
});
