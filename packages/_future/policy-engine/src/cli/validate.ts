#!/usr/bin/env tsx
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type ValidationIssue = {
  file: string;
  message: string;
};

type PolicyLike = Record<string, unknown>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(packageRoot, '../../..');

const REQUIRED_ENTRYPOINTS = [
  path.join(packageRoot, 'src', 'index.ts'),
  path.join(packageRoot, 'src', 'evaluator', 'index.ts'),
  path.join(packageRoot, 'src', 'signals', 'index.ts'),
];

const POLICY_DIRECTORIES = [
  path.join(repoRoot, 'policies'),
  path.join(packageRoot, 'policies'),
  path.join(packageRoot, 'fixtures', 'policies'),
  path.join(packageRoot, 'src', 'policies'),
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
  const results: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('.json')) {
        results.push(absolutePath);
      }
    }
  }

  await walk(rootDir);
  return results.sort();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function inferPolicyIdentifier(data: PolicyLike, fallback: string): string {
  for (const key of ['policyId', 'id', 'name', 'title']) {
    const value = data[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return fallback;
}

function validatePolicyShape(relativePath: string, data: PolicyLike): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const hasIdentity = ['policyId', 'id', 'name', 'title'].some((key) => {
    const value = data[key];
    return typeof value === 'string' && value.trim().length > 0;
  });

  const hasBehavior = ['rules', 'conditions', 'effect', 'action', 'signals'].some(
    (key) => key in data
  );

  if (!hasIdentity) {
    issues.push({
      file: relativePath,
      message: 'Expected one identity field: policyId, id, name, or title.',
    });
  }

  if (!hasBehavior) {
    issues.push({
      file: relativePath,
      message: 'Expected one behavior field: rules, conditions, effect, action, or signals.',
    });
  }

  if ('rules' in data && !Array.isArray(data.rules)) {
    issues.push({
      file: relativePath,
      message: 'Field "rules" must be an array when present.',
    });
  }

  if ('signals' in data && !Array.isArray(data.signals) && !isPlainObject(data.signals)) {
    issues.push({
      file: relativePath,
      message: 'Field "signals" must be an array or object when present.',
    });
  }

  return issues;
}

async function validateEntrypoints(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  for (const entrypoint of REQUIRED_ENTRYPOINTS) {
    if (!(await pathExists(entrypoint))) {
      issues.push({
        file: path.relative(repoRoot, entrypoint),
        message: 'Required policy-engine entrypoint is missing.',
      });
    }
  }

  return issues;
}

async function main(): Promise<void> {
  const issues: ValidationIssue[] = [];
  const seenIds = new Map<string, string>();
  const discoveredJsonFiles = new Set<string>();

  issues.push(...(await validateEntrypoints()));

  const existingPolicyDirs: string[] = [];
  for (const directory of POLICY_DIRECTORIES) {
    if (await pathExists(directory)) {
      existingPolicyDirs.push(directory);
    }
  }

  for (const directory of existingPolicyDirs) {
    const jsonFiles = await collectJsonFiles(directory);
    for (const file of jsonFiles) {
      discoveredJsonFiles.add(file);
    }
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

      issues.push(...validatePolicyShape(relativeFile, parsed));

      const inferredId = inferPolicyIdentifier(parsed, relativeFile);
      const existingPath = seenIds.get(inferredId);

      if (existingPath) {
        issues.push({
          file: relativeFile,
          message: `Duplicate policy identifier "${inferredId}" already seen in ${existingPath}.`,
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
    console.error('[validate:policies] Validation failed.');
    for (const issue of issues) {
      console.error(` - ${issue.file}: ${issue.message}`);
    }
    process.exit(1);
  }

  if (existingPolicyDirs.length === 0) {
    console.log(
      '[validate:policies] OK. Required entrypoints exist. No policy artifact directories were found, so artifact validation was skipped.'
    );
    return;
  }

  console.log(
    `[validate:policies] OK. Required entrypoints exist and ${discoveredJsonFiles.size} JSON policy artifact(s) were validated across ${existingPolicyDirs.length} directory(ies).`
  );
}

await main();
