import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
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
  external: [
    '@topshelf/shared',
    '@topshelf/policy-engine',
    '@topshelf/content-authoring',
    '@topshelf/nlp',
  ],
});
