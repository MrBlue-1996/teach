import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import pluginNext from '@next/eslint-plugin-next';
import eslintConfigPrettier from 'eslint-config-prettier';
import pluginSecurity from 'eslint-plugin-security';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  // Global ignores (replaces .eslintignore)
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/build/',
      '**/.next/',
      '**/.turbo/',
      '**/coverage/',
      '**/*.min.js',
      '**/next.config.js',
      '**/postcss.config.js',
    ],
  },

  // Base config for all TS files
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.strict,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
        ...globals.node,
        ...globals.worker,
        ...globals.serviceworker,
      },
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            'packages/engine/vitest.config.ts',
            'packages/api-server/vitest.config.ts',
            'packages/tests/vitest.config.ts',
            'packages/tests/playwright.config.ts',
          ],
        },
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      security: pluginSecurity,
    },
    rules: {
      // TypeScript strict rules
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/prefer-readonly': 'error',

      // Security rules (OWASP compliance)
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-eval-with-expression': 'error',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn',
      'security/detect-possible-timing-attacks': 'warn',

      // General best practices
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
    },
  },

  // Test files — relaxed
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      'security/detect-object-injection': 'off',
    },
  },

  // CJS files
  {
    files: ['**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // React / Next.js web app — relaxed strict TS rules
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    plugins: {
      '@next/next': pluginNext,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs['core-web-vitals'].rules,
      '@next/next/no-html-link-for-pages': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
    },
  },

  // Prettier must be last
  eslintConfigPrettier
);
