#!/usr/bin/env tsx
/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type ValidationIssue = {
  file: string;
  message: string;
};

type PackLike = Record<string, unknown>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(packageRoot, '../..');

const REQUIRED_PACKAGE_FILES = [path.join(packageRoot, 'src', 'index.ts')];

const CANDIDATE_DIRECTORIES = [
  path.join(repoRoot, 'content-packs'),
  path.join(repoRoot, 'content'),
  path.join(packageRoot, 'content-packs'),
  path.join(packageRoot, 'content'),
];

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function inferPackIdentifier(data: PackLike, fallback: string): string {
  const id = data.id;
  const slug = data.slug;
  const name = data.name;
  const title = data.title;

  for (const candidate of [id, slug, name, title]) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return fallback;
}

function isKitchenChallengeShape(data: PackLike): boolean {
  return (
    typeof data.type === 'string' &&
    typeof data.briefing === 'string' &&
    typeof data.timeLimitSeconds === 'number' &&
    typeof data.difficultyLevel === 'number' &&
    isPlainObject(data.expertRecipe)
  );
}

function validatePackShape(relativePath: string, data: PackLike): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const hasIdentity = ['id', 'slug', 'name', 'title'].some((key) => {
    const value = data[key];
    return typeof value === 'string' && value.trim().length > 0;
  });

  const hasStructure = ['version', 'modules', 'lessons', 'units', 'content', 'items'].some(
    (key) => key in data
  );

  const hasKitchenChallengeStructure = isKitchenChallengeShape(data);

  if (!hasIdentity) {
    issues.push({
      file: relativePath,
      message: 'Expected one identity field: id, slug, name, or title.',
    });
  }

  if (!hasStructure && !hasKitchenChallengeStructure) {
    issues.push({
      file: relativePath,
      message:
        'Expected either a content-pack structure (version, modules, lessons, units, content, or items) or a kitchen challenge structure (type, briefing, timeLimitSeconds, difficultyLevel, expertRecipe).',
    });
  }

  if ('version' in data && typeof data.version !== 'string' && typeof data.version !== 'number') {
    issues.push({
      file: relativePath,
      message: 'Field "version" must be a string or number when present.',
    });
  }

  return issues;
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
  const seenIds = new Map<string, string>();
  const discoveredJsonFiles = new Set<string>();

  issues.push(...(await validateRequiredFiles()));

  const existingDirectories: string[] = [];
  for (const candidate of CANDIDATE_DIRECTORIES) {
    if (await pathExists(candidate)) {
      existingDirectories.push(candidate);
    }
  }

  if (existingDirectories.length === 0) {
    console.warn(
      '[validate:packs] No content directories found. Checked:',
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

    try {
      const raw = await fs.readFile(absoluteFile, 'utf8');
      const parsed: unknown = JSON.parse(raw);

      if (!isPlainObject(parsed)) {
        issues.push({
          file: relativeFile,
          message: 'Expected the top-level JSON value to be an object.',
        });
        continue;
      }

      issues.push(...validatePackShape(relativeFile, parsed));

      const inferredId = inferPackIdentifier(parsed, relativeFile);
      const existingPath = seenIds.get(inferredId);

      if (existingPath !== undefined) {
        issues.push({
          file: relativeFile,
          message: `Duplicate content-pack identifier "${inferredId}" already seen in ${existingPath}.`,
        });
      } else {
        seenIds.set(inferredId, relativeFile);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push({
        file: relativeFile,
        message: `Invalid JSON: ${message}`,
      });
    }
  }

  if (issues.length > 0) {
    console.error('[validate:packs] Validation failed.');
    for (const issue of issues) {
      console.error(` - ${issue.file}: ${issue.message}`);
    }
    process.exit(1);
  }

  console.log(
    `[validate:packs] OK. Validated ${discoveredJsonFiles.size} JSON file(s) across ${existingDirectories.length} content directory(ies).`
  );
}

await main();
