#!/usr/bin/env node

import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mode = process.argv[2];

if (mode !== 'hybrid') {
  console.error('Usage: node scripts/switch-env-mode.mjs <hybrid>');
  process.exit(1);
}

const root = process.cwd();
const sourceEnvPath = resolve(root, `.env.mode.${mode}`);
const targetEnvPath = resolve(root, '.env');
const webEnvPath = resolve(root, 'apps/web/.env.local');

if (!existsSync(sourceEnvPath)) {
  console.error(`Missing preset file: ${sourceEnvPath}`);
  process.exit(1);
}

copyFileSync(sourceEnvPath, targetEnvPath);

const envText = readFileSync(targetEnvPath, 'utf8');
const publicKeys = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SKIP_BACKEND_OAUTH_BRIDGE',
];

const selectedLines = envText
  .split(/\r?\n/)
  .filter((line) => publicKeys.some((key) => line.startsWith(`${key}=`)));

writeFileSync(webEnvPath, `${selectedLines.join('\n')}\n`, 'utf8');

console.log(`Activated ${mode} mode.`);
console.log(`- Wrote ${targetEnvPath}`);
console.log(`- Synced ${webEnvPath}`);
