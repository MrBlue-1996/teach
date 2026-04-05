import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@topshelf/shared': resolve(__dirname, '../shared/src/index.ts'),
      '@topshelf/policy-engine': resolve(__dirname, '../_future/policy-engine/src/index.ts'),
      '@topshelf/deterministic-formatter': resolve(
        __dirname,
        '../_future/deterministic-formatter/src/index.ts'
      ),
      '@topshelf/content-authoring': resolve(__dirname, '../content-authoring/src/index.ts'),
      '@topshelf/nlp': resolve(__dirname, '../_future/nlp/src/index.ts'),
      '@topshelf/mcp-server': resolve(__dirname, '../_future/mcp-server/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['../*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/index.ts'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
    reporters: ['default'],
  },
});
