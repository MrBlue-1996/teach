/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

/**
 * rotate-logs.mjs
 *
 * Keeps exactly ONE log file per named slot.
 * Usage:
 *   node scripts/rotate-logs.mjs <slot>
 *
 * Resolves to <repo-root>/logs/<slot>.log
 * If the file already exists it is deleted before the caller writes a new one.
 * Print the resolved path to stdout so callers can use it:
 *
 *   LOG=$(node scripts/rotate-logs.mjs test-engine)
 *   pnpm --filter @topshelf/engine test:ci 2>&1 | tee "$LOG"
 *
 * Or use the --exec flag to run a command and capture its output directly:
 *   node scripts/rotate-logs.mjs test-engine --exec "pnpm --filter @topshelf/engine test:ci"
 */

import { spawn } from 'node:child_process';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOGS_DIR = join(ROOT, 'logs');

const args = process.argv.slice(2);
const slot = args[0];

// --clean mode: delete all *.log files in the logs directory
if (slot === '--clean') {
  if (existsSync(LOGS_DIR)) {
    const { readdirSync } = await import('node:fs');
    const files = readdirSync(LOGS_DIR).filter((f) => f.endsWith('.log'));
    for (const f of files) {
      rmSync(join(LOGS_DIR, f));
    }
    console.log(`[rotate-logs] cleaned ${files.length} log file(s) from logs/`);
  } else {
    console.log('[rotate-logs] logs/ directory does not exist — nothing to clean');
  }
  process.exit(0);
}

if (!slot) {
  console.error('Usage: node scripts/rotate-logs.mjs <slot> [--exec "command"]');
  process.exit(1);
}

// Ensure logs/ directory exists (gitignored, so not in repo — create on demand)
mkdirSync(LOGS_DIR, { recursive: true });

// Keep a .gitkeep so the empty directory is evident locally (logs/ itself is gitignored,
// so this only matters for the local working tree)
const gitkeep = join(LOGS_DIR, '.gitkeep');
if (!existsSync(gitkeep)) {
  writeFileSync(gitkeep, '');
}

const logFile = join(LOGS_DIR, `${slot}.log`);

// Delete the previous log for this slot, if any
if (existsSync(logFile)) {
  rmSync(logFile);
}

const execIndex = args.indexOf('--exec');
if (execIndex !== -1) {
  // --exec mode: run the command, stream to terminal AND capture to log file
  const cmd = args[execIndex + 1];
  if (!cmd) {
    console.error('--exec requires a command string');
    process.exit(1);
  }

  const logStream = createWriteStream(logFile, { flags: 'w' });

  const child = spawn(cmd, [], {
    shell: '/bin/bash',
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  for (const [src, dest] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
    src.on('data', (chunk) => {
      dest.write(chunk);
      logStream.write(chunk);
    });
  }

  child.on('close', (code) => {
    logStream.end(() => {
      const exitCode = code ?? 1;
      if (exitCode === 0) {
        console.error(`[rotate-logs] saved → logs/${slot}.log`);
      }
      process.exit(exitCode);
    });
  });
} else {
  // Path-emit mode: print the path so the caller can use it with tee
  console.log(logFile);
}
