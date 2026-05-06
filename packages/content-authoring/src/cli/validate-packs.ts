#!/usr/bin/env tsx
/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateContentPack } from '../validation/content-validator.js';

type ValidationIssue = {
  file: string;
  message: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(packageRoot, '../..');

const REQUIRED_PACKAGE_FILES = [path.join(packageRoot, 'src', 'index.ts')];

const CANDIDATE_DIRECTORIES = [path.join(repoRoot, 'content-packs')];

const CONTENT_PACK_FILE_PREFIX = 'content_pack_';

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectJsonFiles(rootDir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(absolutePath);
      }
    }
  }

  await walk(rootDir);
  return files.sort();
}

function isContentPackManifestFile(absoluteFile: string): boolean {
  const parentDir = path.dirname(absoluteFile);
  const fileName = path.basename(absoluteFile);

  return (
    parentDir === path.join(repoRoot, 'content-packs') &&
    fileName.startsWith(CONTENT_PACK_FILE_PREFIX)
  );
}

async function validateRequiredFiles(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  for (const requiredFile of REQUIRED_PACKAGE_FILES) {
    if (!(await pathExists(requiredFile))) {
      issues.push({
        file: path.relative(repoRoot, requiredFile),
        message: 'Required package entry file is missing.',
      });
    }
  }

  return issues;
}

async function main(): Promise<void> {
  const issues: ValidationIssue[] = [];
  const discoveredJsonFiles = new Set<string>();
  const skippedFiles: string[] = [];
  let validatedPackCount = 0;

  issues.push(...(await validateRequiredFiles()));

  const existingDirectories: string[] = [];
  for (const candidate of CANDIDATE_DIRECTORIES) {
    if (await pathExists(candidate)) {
      existingDirectories.push(candidate);
    }
  }

  if (existingDirectories.length === 0) {
    console.warn(
      '[validate:packs] No content-pack directories found. Checked:',
      CANDIDATE_DIRECTORIES.map((dir) => path.relative(repoRoot, dir)).join(', ')
    );
    process.exit(0);
  }

  for (const directory of existingDirectories) {
    const jsonFiles = await collectJsonFiles(directory);
    for (const file of jsonFiles) {
      discoveredJsonFiles.add(file);
    }
  }

  if (discoveredJsonFiles.size === 0) {
    console.warn('[validate:packs] No JSON content-pack artifacts found. Validation skipped.');
    process.exit(0);
  }

  for (const absoluteFile of Array.from(discoveredJsonFiles).sort()) {
    const relativeFile = path.relative(repoRoot, absoluteFile);

    if (!isContentPackManifestFile(absoluteFile)) {
      skippedFiles.push(relativeFile);
      continue;
    }

    try {
      const raw = await fs.readFile(absoluteFile, 'utf8');
      const parsed: unknown = JSON.parse(raw);

      const result = validateContentPack(parsed, { sourcePath: relativeFile });
      if (!result.valid) {
        for (const error of result.errors) {
          issues.push({
            file: relativeFile,
            message: `${error.code} at ${error.path || '<root>'}: ${error.message}`,
          });
        }
      } else {
        validatedPackCount += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push({
        file: relativeFile,
        message: `Invalid JSON: ${message}`,
      });
    }
  }

  if (validatedPackCount === 0 && issues.length === 0) {
    console.warn(
      '[validate:packs] No content-pack manifest files matched the current validation convention. Expected top-level content_pack_*.json files under content-packs/.'
    );
    process.exit(0);
  }

  if (issues.length > 0) {
    console.error('[validate:packs] Validation failed.');
    for (const issue of issues) {
      console.error(` - ${issue.file}: ${issue.message}`);
    }
    if (skippedFiles.length > 0) {
      console.error(
        `[validate:packs] Skipped ${skippedFiles.length} non-manifest JSON file(s): ${skippedFiles.join(', ')}`
      );
    }
    process.exit(1);
  }

  if (skippedFiles.length > 0) {
    console.log(
      `[validate:packs] Skipped ${skippedFiles.length} non-manifest JSON file(s): ${skippedFiles.join(', ')}`
    );
  }

  console.log(
    `[validate:packs] OK. Validated ${validatedPackCount} content-pack manifest file(s) across ${existingDirectories.length} content-pack directory(ies).`
  );
}

await main();
