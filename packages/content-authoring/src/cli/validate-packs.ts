#!/usr/bin/env tsx
/// <reference types="node" />
/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

import { kitchenImageManifestSchema, type KitchenImageManifestSchema } from '@topshelf/shared';

import { validateContentPack } from '../validation/content-validator.js';

export type ValidationIssue = {
  code: string;
  path: string;
  message: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(packageRoot, '../..');

const REQUIRED_PACKAGE_FILES = [path.join(packageRoot, 'src', 'index.ts')];

const CANDIDATE_DIRECTORIES = [path.join(repoRoot, 'content-packs')];
const KITCHEN_IMAGE_MANIFEST_PATH = path.join(repoRoot, 'apps/web/public/kitchen/manifest.json');

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
    // CLI intentionally walks a validated local repository path.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
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

function toRepoRelative(targetPath: string): string {
  return path.relative(repoRoot, targetPath);
}

function toIssuePath(targetPath: string): string {
  const relative = toRepoRelative(targetPath);
  return relative.startsWith('..') ? targetPath : relative;
}

async function resolveJsonFiles(inputPaths: readonly string[]): Promise<string[]> {
  const discoveredJsonFiles = new Set<string>();

  for (const inputPath of inputPaths) {
    const absoluteInput = path.resolve(inputPath);
    if (!(await pathExists(absoluteInput))) {
      continue;
    }

    // CLI intentionally stats validated local input paths.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const stat = await fs.stat(absoluteInput);

    if (stat.isDirectory()) {
      for (const file of await collectJsonFiles(absoluteInput)) {
        discoveredJsonFiles.add(file);
      }
      continue;
    }

    if (stat.isFile() && absoluteInput.endsWith('.json')) {
      discoveredJsonFiles.add(absoluteInput);
    }
  }

  return Array.from(discoveredJsonFiles).sort();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function looksLikeContentPackManifest(value: unknown): value is { id?: unknown } {
  if (!isRecord(value)) {
    return false;
  }

  return Array.isArray(value.teachingBlocks);
}

function validateFilenameIdMatch(absoluteFile: string, parsed: unknown): ValidationIssue[] {
  const baseName = path.basename(absoluteFile, '.json');
  if (!baseName.startsWith(CONTENT_PACK_FILE_PREFIX) || !isRecord(parsed)) {
    return [];
  }

  const expectedId = `pack-${baseName.replace(/^content_pack_/, '').replace(/_/g, '-')}`;
  const actualId = parsed.id;
  if (typeof actualId === 'string' && actualId === expectedId) {
    return [];
  }

  return [
    {
      code: 'FILENAME_ID_MISMATCH',
      path: toIssuePath(absoluteFile),
      message: `filename implies id "${expectedId}" but pack.id is "${String(actualId)}"`,
    },
  ];
}

async function validateRequiredFiles(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  for (const requiredFile of REQUIRED_PACKAGE_FILES) {
    if (!(await pathExists(requiredFile))) {
      issues.push({
        code: 'REQUIRED_FILE_MISSING',
        path: toIssuePath(requiredFile),
        message: 'Required package entry file is missing.',
      });
    }
  }

  return issues;
}

async function loadKitchenImageManifest(): Promise<{
  manifest?: KitchenImageManifestSchema;
  issues: ValidationIssue[];
}> {
  if (!(await pathExists(KITCHEN_IMAGE_MANIFEST_PATH))) {
    return { issues: [] };
  }

  const issuePath = toIssuePath(KITCHEN_IMAGE_MANIFEST_PATH);
  try {
    // CLI intentionally reads a fixed repository manifest path.

    const raw = await fs.readFile(KITCHEN_IMAGE_MANIFEST_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    const result = kitchenImageManifestSchema.safeParse(parsed);
    if (result.success) {
      return { manifest: result.data, issues: [] };
    }

    return {
      issues: result.error.errors.map((error) => ({
        code: 'INVALID_KITCHEN_IMAGE_MANIFEST',
        path: issuePath,
        message: `${error.path.join('.') || '<root>'}: ${error.message}`,
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      issues: [
        {
          code: 'INVALID_KITCHEN_IMAGE_MANIFEST',
          path: issuePath,
          message: `Invalid kitchen image manifest: ${message}`,
        },
      ],
    };
  }
}

type ValidationArtifactsResult = {
  issues: ValidationIssue[];
  skippedFiles: string[];
  validatedPackCount: number;
};

export async function validateContentPackArtifacts(
  inputPaths: readonly string[]
): Promise<ValidationArtifactsResult> {
  const issues: ValidationIssue[] = [];
  const skippedFiles: string[] = [];
  let validatedPackCount = 0;

  issues.push(...(await validateRequiredFiles()));
  const kitchenImageManifest = await loadKitchenImageManifest();
  issues.push(...kitchenImageManifest.issues);

  const jsonFiles = await resolveJsonFiles(inputPaths);
  if (jsonFiles.length === 0) {
    return { issues, skippedFiles, validatedPackCount };
  }

  for (const absoluteFile of jsonFiles) {
    const issuePath = toIssuePath(absoluteFile);
    const baseName = path.basename(absoluteFile, '.json');
    const isManifestFileName = baseName.startsWith(CONTENT_PACK_FILE_PREFIX);

    if (!isManifestFileName) {
      skippedFiles.push(issuePath);
      continue;
    }

    try {
      // CLI intentionally reads discovered files from validated local paths.
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const raw = await fs.readFile(absoluteFile, 'utf8');
      const parsed: unknown = JSON.parse(raw);

      if (!looksLikeContentPackManifest(parsed)) {
        skippedFiles.push(issuePath);
        continue;
      }

      const result = validateContentPack(parsed, {
        sourcePath: issuePath,
        ...(kitchenImageManifest.manifest !== undefined
          ? { kitchenImageManifest: kitchenImageManifest.manifest }
          : {}),
      });
      if (!result.valid) {
        for (const error of result.errors) {
          issues.push({
            code: error.code,
            path: issuePath,
            message: `${error.code} at ${error.path || '<root>'}: ${error.message}`,
          });
        }
      } else {
        validatedPackCount += 1;
      }

      issues.push(...validateFilenameIdMatch(absoluteFile, parsed));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push({
        code: 'INVALID_JSON',
        path: issuePath,
        message: `Invalid JSON: ${message}`,
      });
    }
  }

  return { issues, skippedFiles, validatedPackCount };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const candidateInputs = args.length > 0 ? args : CANDIDATE_DIRECTORIES;
  const existingDirectories: string[] = [];
  for (const candidate of candidateInputs) {
    if (await pathExists(candidate)) {
      existingDirectories.push(candidate);
    }
  }

  if (existingDirectories.length === 0) {
    console.warn(
      '[validate:packs] No content-pack directories found. Checked:',
      candidateInputs.map((dir) => path.relative(repoRoot, path.resolve(dir))).join(', ')
    );
    process.exit(0);
  }

  const { issues, skippedFiles, validatedPackCount } =
    await validateContentPackArtifacts(existingDirectories);

  if (validatedPackCount === 0 && skippedFiles.length === 0 && issues.length === 0) {
    console.warn('[validate:packs] No JSON content-pack artifacts found. Validation skipped.');
    process.exit(0);
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
      console.error(` - ${issue.path}: ${issue.message}`);
    }
    if (skippedFiles.length > 0) {
      console.error(
        `[validate:packs] Skipped ${skippedFiles.length} non-manifest JSON file(s): ${skippedFiles.join(', ')}`
      );
    }
    process.exit(1);
  }

  if (skippedFiles.length > 0) {
    console.info(
      `[validate:packs] Skipped ${skippedFiles.length} non-manifest JSON file(s): ${skippedFiles.join(', ')}`
    );
  }

  console.info(
    `[validate:packs] OK. Validated ${validatedPackCount} content-pack manifest file(s) across ${existingDirectories.length} content-pack directory(ies).`
  );
}

await main();
