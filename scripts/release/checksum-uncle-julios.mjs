/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const manifestName = 'content_pack_uncle_julios_v1.json';
const manifestPath = path.join(repoRoot, 'content-packs', manifestName);
const outputDir = path.join(repoRoot, 'dist', 'content-packs', 'uncle-julios');
const checksumPath = path.join(outputDir, `${manifestName}.sha256`);

const manifestBuffer = await readFile(manifestPath);
const manifest = JSON.parse(manifestBuffer.toString('utf8'));
const checksum = createHash('sha256').update(manifestBuffer).digest('hex');

await mkdir(outputDir, { recursive: true });
await writeFile(checksumPath, `${checksum}  ${manifestName}\n`, 'utf8');

console.log(`[checksum:uncle-julios] Wrote ${path.relative(repoRoot, checksumPath)}`);
console.log(
  `[checksum:uncle-julios] mode=${manifest.integrity?.releaseMode ?? 'unspecified'} manifest-checksum=${manifest.integrity?.checksum ?? 'null'}`
);
console.log(`[checksum:uncle-julios] sha256=${checksum}`);
