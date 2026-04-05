import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'probe/index': 'src/probe/index.ts',
    'offline/index': 'src/offline/index.ts',
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
  external: ['@topshelf/shared', '@topshelf/deterministic-formatter'],
});
