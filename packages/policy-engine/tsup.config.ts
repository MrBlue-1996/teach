import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'evaluator/index': 'src/evaluator/index.ts',
    'signals/index': 'src/signals/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: false,
  target: 'es2022',
  outDir: 'dist',
  external: ['@topshelf/shared'],
});
