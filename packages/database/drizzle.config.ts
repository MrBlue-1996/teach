/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// Load root .env (two levels up from packages/database/)
config({ path: '../../.env' });

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'topshelf',
    user: process.env.DB_USER ?? 'topshelf',
    password: process.env.DB_PASSWORD ?? '',
    ssl: false,
  },
});
