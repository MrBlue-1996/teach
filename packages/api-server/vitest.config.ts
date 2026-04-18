import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@topshelf/config': resolve(__dirname, '../config/src/index.ts'),
      '@topshelf/auth': resolve(__dirname, '../auth/src/index.ts'),
      '@topshelf/database': resolve(__dirname, '../database/src/index.ts'),
      '@topshelf/shared': resolve(__dirname, '../shared/src/index.ts'),
      '@topshelf/observability': resolve(__dirname, '../observability/src/index.ts'),
      '@topshelf/policy-engine': resolve(__dirname, '../_future/policy-engine/src/index.ts'),
      '@topshelf/nlp': resolve(__dirname, '../_future/nlp/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
    },
  },
});
