#!/usr/bin/env node

/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import os from 'node:os';
import { spawn } from 'node:child_process';

function resolveBuildProfile() {
  const override = process.env.TOPSHELF_BUILD_CONCURRENCY?.trim();

  if (override) {
    return {
      concurrency: override,
      label: 'manual override',
    };
  }

  const totalMemoryGb = os.totalmem() / 1024 / 1024 / 1024;
  const cpuCount = os.cpus().length;

  if (totalMemoryGb <= 4 || cpuCount <= 2) {
    return {
      concurrency: '1',
      label: 'low-memory device profile',
    };
  }

  if (totalMemoryGb <= 8 || cpuCount <= 4) {
    return {
      concurrency: '25%',
      label: 'compact device profile',
    };
  }

  if (totalMemoryGb <= 16) {
    return {
      concurrency: '50%',
      label: 'balanced device profile',
    };
  }

  return {
    concurrency: '100%',
    label: 'full device profile',
  };
}

const profile = resolveBuildProfile();
const forwardedArgs = process.argv.slice(2);
const hasConcurrencyOverride = forwardedArgs.some((arg) => arg.startsWith('--concurrency='));
const turboArgs = ['exec', 'turbo', 'run', 'build'];

if (!hasConcurrencyOverride) {
  turboArgs.push(`--concurrency=${profile.concurrency}`);
}

turboArgs.push(...forwardedArgs);

console.log(
  `[build] Using ${profile.label} with Turbo concurrency ${hasConcurrencyOverride ? 'from CLI override' : profile.concurrency}.`
);

const child = spawn('pnpm', turboArgs, {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(`[build] Failed to start Turbo build: ${error.message}`);
  process.exit(1);
});
