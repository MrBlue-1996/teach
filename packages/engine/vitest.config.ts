/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/*.bench.ts'],
    },
  },
  benchmark: {
    include: ['src/**/*.bench.ts'],
    reporters: ['default'],
    outputJson: 'bench-results/engine.json',
  },
});
