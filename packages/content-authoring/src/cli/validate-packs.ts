#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Content Pack Validation CLI
 *
 * Validates all content packs in the content-packs directory.
 * Used by CI to ensure content packs are valid before deployment.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateContentPack } from '../validation/content-validator.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CONTENT_PACKS_DIR = resolve(__dirname, '../../../../content-packs');

interface ValidationSummary {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
}

function main(): void {
  console.log('Content Pack Validation');
  console.log('=======================\n');

  if (!existsSync(CONTENT_PACKS_DIR)) {
    console.log(`Content packs directory not found: ${CONTENT_PACKS_DIR}`);
    console.log('No content packs to validate.\n');
    process.exit(0);
  }

  const files = readdirSync(CONTENT_PACKS_DIR).filter(
    (f) => f.endsWith('.json') && !f.startsWith('template')
  );

  if (files.length === 0) {
    console.log('No content pack files found.\n');
    process.exit(0);
  }

  console.log(`Found ${files.length} content pack(s) to validate.\n`);

  const summary: ValidationSummary = {
    total: files.length,
    passed: 0,
    failed: 0,
    warnings: 0,
  };

  for (const file of files) {
    const filePath = join(CONTENT_PACKS_DIR, file);
    console.log(`Validating: ${file}`);

    try {
      const content = readFileSync(filePath, 'utf-8');
      const pack = JSON.parse(content) as unknown;

      const result = validateContentPack(pack, { skipSignatureCheck: true });

      if (result.valid) {
        console.log(`  Status: PASSED`);
        summary.passed++;

        if (result.warnings.length > 0) {
          summary.warnings += result.warnings.length;
          console.log(`  Warnings: ${result.warnings.length}`);
          for (const warning of result.warnings) {
            console.log(`    - [${warning.code}] ${warning.message}`);
          }
        }
      } else {
        console.log(`  Status: FAILED`);
        summary.failed++;

        for (const error of result.errors) {
          console.log(`    - [${error.code}] ${error.path}: ${error.message}`);
        }
      }
    } catch (err) {
      console.log(`  Status: ERROR`);
      console.log(`    - Failed to parse: ${err instanceof Error ? err.message : String(err)}`);
      summary.failed++;
    }

    console.log('');
  }

  // Print summary
  console.log('Summary');
  console.log('-------');
  console.log(`Total:    ${summary.total}`);
  console.log(`Passed:   ${summary.passed}`);
  console.log(`Failed:   ${summary.failed}`);
  console.log(`Warnings: ${summary.warnings}`);
  console.log('');

  if (summary.failed > 0) {
    console.log('Content pack validation FAILED.\n');
    process.exit(1);
  }

  console.log('All content packs validated successfully.\n');
  process.exit(0);
}

main();
