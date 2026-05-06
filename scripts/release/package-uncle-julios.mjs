/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const manifestName = 'content_pack_uncle_julios_v1.json';
const manifestPath = path.join(repoRoot, 'content-packs', manifestName);
const outputDir = path.join(repoRoot, 'dist', 'content-packs', 'uncle-julios');
const stagedManifestPath = path.join(outputDir, manifestName);
const checksumPath = path.join(outputDir, `${manifestName}.sha256`);
const archivePath = path.join(outputDir, 'uncle-julios-content-pack.zip');
const metadataPath = path.join(outputDir, 'metadata.json');

const manifestBuffer = await readFile(manifestPath);
const manifest = JSON.parse(manifestBuffer.toString('utf8'));
const checksum = createHash('sha256').update(manifestBuffer).digest('hex');

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await copyFile(manifestPath, stagedManifestPath);
await writeFile(checksumPath, `${checksum}  ${manifestName}\n`, 'utf8');

const zipResult = spawnSync('zip', ['-j', '-q', archivePath, stagedManifestPath, checksumPath], {
  cwd: repoRoot,
  encoding: 'utf8',
});

if (zipResult.error !== undefined) {
  throw new Error(`Unable to execute zip: ${zipResult.error.message}`);
}

if (zipResult.status !== 0) {
  throw new Error(
    zipResult.stderr.trim() || "zip failed while packaging Uncle Julio's content pack."
  );
}

await writeFile(
  metadataPath,
  JSON.stringify(
    {
      id: manifest.id,
      version: manifest.version,
      releaseMode: manifest.integrity?.releaseMode ?? 'unspecified',
      manifestChecksum: manifest.integrity?.checksum ?? null,
      checksumEmbeddedInManifest: manifest.integrity?.checksum === checksum,
      manifest: path.basename(stagedManifestPath),
      checksumFile: path.basename(checksumPath),
      archive: path.basename(archivePath),
      checksum,
    },
    null,
    2
  ) + '\n',
  'utf8'
);

console.log(`[package:uncle-julios] Wrote ${path.relative(repoRoot, archivePath)}`);
console.log(`[package:uncle-julios] Wrote ${path.relative(repoRoot, metadataPath)}`);
console.log(
  `[package:uncle-julios] mode=${manifest.integrity?.releaseMode ?? 'unspecified'} checksum-embedded=${String(manifest.integrity?.checksum === checksum)}`
);
