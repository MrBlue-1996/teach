#!/usr/bin/env node

import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { createLinter } from 'actionlint';

const workflowDirectory = resolve('.github/workflows');
const workflowFiles = readdirSync(workflowDirectory)
  .filter((fileName) => fileName.endsWith('.yml') || fileName.endsWith('.yaml'))
  .map((fileName) => resolve(workflowDirectory, fileName))
  .sort();

console.log(`Linting ${workflowFiles.length} GitHub Actions workflow file(s):`);
for (const workflowFile of workflowFiles) {
  console.log(`- ${workflowFile.replace(`${process.cwd()}/`, '')}`);
}

const lintAction = await createLinter();

const results = [];

for (const workflowFile of workflowFiles) {
  const workflowContent = await readFile(workflowFile, 'utf8');
  const fileResults = lintAction(workflowContent, workflowFile);
  results.push(...fileResults);
}

if (results.length > 0) {
  for (const result of results) {
    const relativeFile = result.file.replace(`${process.cwd()}/`, '');
    console.error(`${relativeFile}:${result.line}:${result.column} ${result.kind} ${result.message}`);
  }

  process.exit(1);
}

console.log('Workflow lint passed.');
