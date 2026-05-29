#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const steps = [
  ['pnpm', ['run', 'format:check']],
  ['pnpm', ['run', 'lint']],
  ['pnpm', ['run', 'typecheck']],
  ['pnpm', ['run', 'test']],
  ['pnpm', ['run', 'build']],
  ['pnpm', ['run', 'validate:content-packs']],
  ['pnpm', ['run', 'package:uncle-julios']],
];

function run(command, args) {
  const label = `${command} ${args.join(' ')}`;
  console.log(`\n▶ ${label}`);

  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    console.error('\n✖ Error: ' + result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error('\n✖ Failed: ' + label);
    process.exit(result.status ?? 1);
  }

  console.log(`✓ Passed: ${label}`);
}

for (const [command, args] of steps) {
  run(command, args);
}

console.log('\nDemo readiness verification passed.');
