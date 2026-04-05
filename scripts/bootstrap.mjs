#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const BRAND = {
  black: '#050507',
  charcoal: '#181A1F',
  slate: '#2C3036',
  mist: '#F3F4F6',
  green: '#22C55E',
  amber: '#F59E0B',
  red: '#EF4444',
};

const LEVEL = {
  PASS: 'PASS',
  INFO: 'INFO',
  SKIP: 'SKIP',
  WARN: 'WARN',
  ERROR: 'ERROR',
  FATAL: 'FATAL',
};

const FINAL_EXIT = {
  SUCCESS: 0,
  FATAL_PRESENT: 10,
  ERROR_PRESENT: 20,
  VERIFICATION_FAILED: 30,
  INTERNAL_FAILURE: 40,
};

const CODES = {
  REPO_ROOT_INVALID: 'TSS-BS-F001',
  PACKAGE_JSON_INVALID: 'TSS-BS-F002',
  NODE_UNSUPPORTED: 'TSS-BS-F003',
  PNPM_MISSING: 'TSS-BS-F004',
  INSTALL_FAILED_NO_MODULES: 'TSS-BS-F005',

  PNPM_VERSION_MISMATCH: 'TSS-BS-W201',
  OPTIONAL_SCRIPT_MISSING: 'TSS-BS-I301',
  OPTIONAL_CHECK_FAILED: 'TSS-BS-W202',

  INSTALL_FAILED_RECOVERABLE: 'TSS-BS-E101',
  FORMAT_FAILED: 'TSS-BS-E102',
  LINT_FAILED: 'TSS-BS-E103',
  TYPECHECK_FAILED: 'TSS-BS-E104',
  TEST_FAILED: 'TSS-BS-E105',
  BUILD_FAILED: 'TSS-BS-E106',
  REQUIRED_SCRIPT_MISSING: 'TSS-BS-E107',
  ARTIFACT_VERIFICATION_FAILED: 'TSS-BS-E108',
};

const processStart = Date.now();
const repoRoot = process.cwd();
const reportDir = path.join(repoRoot, '.bootstrap');
const args = new Set(process.argv.slice(2));
const isCi = args.has('--ci') || String(process.env.CI || '').toLowerCase() === 'true';

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const value = Number.parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function colorize(text, hex, options = {}) {
  const { bold = false, dim = false } = options;
  const { r, g, b } = hexToRgb(hex);
  const open = `\u001b[${bold ? '1;' : ''}${dim ? '2;' : ''}38;2;${r};${g};${b}m`;
  const close = '\u001b[0m';
  return `${open}${text}${close}`;
}

function stripAnsi(text) {
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

function iconForLevel(level) {
  switch (level) {
    case LEVEL.PASS:
      return '✓';
    case LEVEL.INFO:
      return '•';
    case LEVEL.SKIP:
      return '↷';
    case LEVEL.WARN:
      return '▲';
    case LEVEL.ERROR:
      return '✖';
    case LEVEL.FATAL:
      return '■';
    default:
      return '?';
  }
}

function colorForLevel(level) {
  switch (level) {
    case LEVEL.PASS:
      return BRAND.green;
    case LEVEL.INFO:
    case LEVEL.SKIP:
      return BRAND.slate;
    case LEVEL.WARN:
      return BRAND.amber;
    case LEVEL.ERROR:
    case LEVEL.FATAL:
      return BRAND.red;
    default:
      return BRAND.mist;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

function tail(text, maxLines = 20, maxChars = 5000) {
  const limited = text.length > maxChars ? text.slice(text.length - maxChars) : text;
  const lines = limited.split(/\r?\n/).filter(Boolean);
  return lines.slice(-maxLines).join('\n');
}

function pad(text, width) {
  return `${text}${' '.repeat(Math.max(0, width - text.length))}`;
}

function printLine(level, code, checkpointId, message) {
  const icon = colorize(iconForLevel(level), colorForLevel(level), { bold: true });
  const levelText = colorize(level, colorForLevel(level), { bold: true });
  const codeText = colorize(code, BRAND.slate, { bold: true });
  const idText = colorize(checkpointId, BRAND.mist, { bold: true });
  console.log(`${icon} ${levelText} ${codeText} ${idText} ${message}`);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function parseRequiredNodeMajor(enginesNode) {
  if (!enginesNode) return 20;
  const match = enginesNode.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 20;
}

function parsePackageManagerVersion(packageManager) {
  if (!packageManager) return null;
  const match = packageManager.match(/^pnpm@(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
    raw: `${match[1]}.${match[2]}.${match[3]}`,
  };
}

function parseSemver(version) {
  const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
    raw: `${match[1]}.${match[2]}.${match[3]}`,
  };
}

function compareSemver(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function makeResult({
  checkpointId,
  title,
  level,
  code,
  message,
  durationMs = 0,
  blocking = false,
  details = {},
}) {
  return {
    checkpointId,
    title,
    level,
    code,
    message,
    durationMs,
    blocking,
    details,
  };
}

function successBanner(summary) {
  const lines = [
    '╔══════════════════════════════════════════════╗',
    '║                  TOP SHELF                  ║',
    '║           BOOTSTRAP VERIFIED                ║',
    '║                                              ║',
    `║  passed: ${String(summary.counts.PASS).padStart(2, ' ')}  warnings: ${String(summary.counts.WARN).padStart(2, ' ')}  skipped: ${String(summary.counts.SKIP).padStart(2, ' ')}         ║`,
    `║  duration: ${pad(summary.duration, 29)}║`,
    '╚══════════════════════════════════════════════╝',
  ];

  return lines
    .map((line, index) => {
      if (index === 1 || index === 2) {
        return colorize(line, BRAND.green, { bold: true });
      }
      return colorize(line, BRAND.mist, { bold: true });
    })
    .join('\n');
}

function summaryCounts(results) {
  const counts = {
    PASS: 0,
    INFO: 0,
    SKIP: 0,
    WARN: 0,
    ERROR: 0,
    FATAL: 0,
  };

  for (const result of results) {
    counts[result.level] += 1;
  }

  return counts;
}

async function runCommand(command, commandArgs, options = {}) {
  const start = Date.now();
  const env = {
    ...process.env,
    FORCE_COLOR: '1',
    ...(options.env || {}),
  };

  return new Promise((resolve) => {
    const child = spawn(command, commandArgs, {
      cwd: options.cwd || repoRoot,
      env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
      if (!isCi) {
        process.stdout.write(colorize(String(chunk), BRAND.slate));
      }
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
      if (!isCi) {
        process.stderr.write(colorize(String(chunk), BRAND.amber));
      }
    });

    child.on('close', (code) => {
      resolve({
        code: code ?? 1,
        stdout,
        stderr,
        durationMs: Date.now() - start,
      });
    });

    child.on('error', (error) => {
      resolve({
        code: 1,
        stdout,
        stderr: `${stderr}\n${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      });
    });
  });
}

async function detectRepoContext() {
  const packageJsonPath = path.join(repoRoot, 'package.json');
  const workspacePath = path.join(repoRoot, 'pnpm-workspace.yaml');

  if (!(await fileExists(packageJsonPath))) {
    return {
      ok: false,
      result: makeResult({
        checkpointId: 'preflight.repo-root',
        title: 'Validate repo root',
        level: LEVEL.FATAL,
        code: CODES.REPO_ROOT_INVALID,
        message: `package.json not found at ${repoRoot}`,
        blocking: true,
      }),
    };
  }

  if (!(await fileExists(workspacePath))) {
    return {
      ok: false,
      result: makeResult({
        checkpointId: 'preflight.repo-root',
        title: 'Validate repo root',
        level: LEVEL.FATAL,
        code: CODES.REPO_ROOT_INVALID,
        message: `pnpm-workspace.yaml not found at ${repoRoot}`,
        blocking: true,
      }),
    };
  }

  try {
    const packageJson = await readJson(packageJsonPath);
    return { ok: true, packageJson };
  } catch (error) {
    return {
      ok: false,
      result: makeResult({
        checkpointId: 'preflight.package-json',
        title: 'Read package.json',
        level: LEVEL.FATAL,
        code: CODES.PACKAGE_JSON_INVALID,
        message: `Failed to parse package.json: ${error instanceof Error ? error.message : String(error)}`,
        blocking: true,
      }),
    };
  }
}

async function checkpointNodeVersion(packageJson) {
  const requiredMajor = parseRequiredNodeMajor(packageJson?.engines?.node);
  const currentMajor = Number.parseInt(process.versions.node.split('.')[0] || '0', 10);

  if (currentMajor < requiredMajor) {
    return makeResult({
      checkpointId: 'preflight.node-version',
      title: 'Check Node version',
      level: LEVEL.FATAL,
      code: CODES.NODE_UNSUPPORTED,
      message: `Node ${process.versions.node} detected, requires >= ${requiredMajor}.0.0`,
      blocking: true,
    });
  }

  return makeResult({
    checkpointId: 'preflight.node-version',
    title: 'Check Node version',
    level: LEVEL.PASS,
    code: 'TSS-BS-P001',
    message: `Node ${process.versions.node} satisfies repo requirement`,
    blocking: true,
  });
}

async function checkpointPnpmVersion(packageJson) {
  const expected = parsePackageManagerVersion(packageJson?.packageManager);
  const result = await runCommand('pnpm', ['--version']);

  if (result.code !== 0) {
    return makeResult({
      checkpointId: 'preflight.pnpm',
      title: 'Check pnpm availability',
      level: LEVEL.FATAL,
      code: CODES.PNPM_MISSING,
      message: 'pnpm is not available in PATH',
      durationMs: result.durationMs,
      blocking: true,
      details: {
        stderrTail: tail(result.stderr),
      },
    });
  }

  const installed = parseSemver(result.stdout.trim());

  if (!installed || !expected) {
    return makeResult({
      checkpointId: 'preflight.pnpm',
      title: 'Check pnpm availability',
      level: LEVEL.PASS,
      code: 'TSS-BS-P002',
      message: `pnpm ${result.stdout.trim()} detected`,
      durationMs: result.durationMs,
      blocking: true,
    });
  }

  if (installed.major !== expected.major) {
    return makeResult({
      checkpointId: 'preflight.pnpm',
      title: 'Check pnpm availability',
      level: LEVEL.WARN,
      code: CODES.PNPM_VERSION_MISMATCH,
      message: `pnpm ${installed.raw} detected, packageManager is pinned to ${expected.raw}`,
      durationMs: result.durationMs,
      blocking: false,
    });
  }

  if (compareSemver(installed, expected) !== 0) {
    return makeResult({
      checkpointId: 'preflight.pnpm',
      title: 'Check pnpm availability',
      level: LEVEL.WARN,
      code: CODES.PNPM_VERSION_MISMATCH,
      message: `pnpm ${installed.raw} detected, pinned version is ${expected.raw}`,
      durationMs: result.durationMs,
      blocking: false,
    });
  }

  return makeResult({
    checkpointId: 'preflight.pnpm',
    title: 'Check pnpm availability',
    level: LEVEL.PASS,
    code: 'TSS-BS-P003',
    message: `pnpm ${installed.raw} matches packageManager pin`,
    durationMs: result.durationMs,
    blocking: true,
  });
}

async function checkpointInstall() {
  const hasLockfile = await fileExists(path.join(repoRoot, 'pnpm-lock.yaml'));
  const args = hasLockfile ? ['install', '--frozen-lockfile'] : ['install'];
  const commandResult = await runCommand('pnpm', args, {
    env: isCi ? { CI: '1' } : {},
  });

  if (commandResult.code === 0) {
    return makeResult({
      checkpointId: 'install.dependencies',
      title: 'Install dependencies',
      level: LEVEL.PASS,
      code: 'TSS-BS-P004',
      message: `Dependencies installed successfully via pnpm ${args.join(' ')}`,
      durationMs: commandResult.durationMs,
      blocking: true,
    });
  }

  const hasNodeModules = await fileExists(path.join(repoRoot, 'node_modules'));

  if (!hasNodeModules) {
    return makeResult({
      checkpointId: 'install.dependencies',
      title: 'Install dependencies',
      level: LEVEL.FATAL,
      code: CODES.INSTALL_FAILED_NO_MODULES,
      message: 'Dependency install failed and node_modules is missing',
      durationMs: commandResult.durationMs,
      blocking: true,
      details: {
        stderrTail: tail(commandResult.stderr),
        stdoutTail: tail(commandResult.stdout),
      },
    });
  }

  return makeResult({
    checkpointId: 'install.dependencies',
    title: 'Install dependencies',
    level: LEVEL.ERROR,
    code: CODES.INSTALL_FAILED_RECOVERABLE,
    message: 'Dependency install failed, continuing because node_modules already exists',
    durationMs: commandResult.durationMs,
    blocking: true,
    details: {
      stderrTail: tail(commandResult.stderr),
      stdoutTail: tail(commandResult.stdout),
    },
  });
}

async function runScriptCheckpoint({
  packageJson,
  checkpointId,
  title,
  scriptName,
  failureCode,
  failureLevel,
  blocking,
}) {
  const scripts = packageJson?.scripts || {};

  if (!scripts[scriptName]) {
    return makeResult({
      checkpointId,
      title,
      level: blocking ? LEVEL.ERROR : LEVEL.SKIP,
      code: blocking ? CODES.REQUIRED_SCRIPT_MISSING : CODES.OPTIONAL_SCRIPT_MISSING,
      message: blocking
        ? `Required script "${scriptName}" is missing in package.json`
        : `Optional script "${scriptName}" is not defined`,
      blocking,
    });
  }

  const commandResult = await runCommand('pnpm', ['run', scriptName], {
    env: isCi ? { CI: '1' } : {},
  });

  if (commandResult.code === 0) {
    return makeResult({
      checkpointId,
      title,
      level: LEVEL.PASS,
      code: 'TSS-BS-P005',
      message: `Script "${scriptName}" passed`,
      durationMs: commandResult.durationMs,
      blocking,
    });
  }

  return makeResult({
    checkpointId,
    title,
    level: failureLevel,
    code: failureCode,
    message: `Script "${scriptName}" failed`,
    durationMs: commandResult.durationMs,
    blocking,
    details: {
      stderrTail: tail(commandResult.stderr),
      stdoutTail: tail(commandResult.stdout),
    },
  });
}

async function checkpointArtifacts(previousResults) {
  const buildResult = previousResults.find((result) => result.checkpointId === 'quality.build');

  if (!buildResult || buildResult.level !== LEVEL.PASS) {
    return makeResult({
      checkpointId: 'verify.artifacts',
      title: 'Verify build artifacts',
      level: LEVEL.SKIP,
      code: CODES.OPTIONAL_SCRIPT_MISSING,
      message: 'Skipping artifact verification because build did not pass',
      blocking: true,
    });
  }

  const webRoot = path.join(repoRoot, 'apps', 'web');
  const nextDir = path.join(webRoot, '.next');
  const nextBuildId = path.join(nextDir, 'BUILD_ID');
  const distDir = path.join(repoRoot, 'dist');

  const webExists = await fileExists(webRoot);
  const nextExists = await fileExists(nextDir);
  const nextBuildIdExists = await fileExists(nextBuildId);
  const distExists = await fileExists(distDir);

  if ((webExists && (nextExists || nextBuildIdExists)) || distExists) {
    return makeResult({
      checkpointId: 'verify.artifacts',
      title: 'Verify build artifacts',
      level: LEVEL.PASS,
      code: 'TSS-BS-P006',
      message: webExists
        ? 'Verified build output under apps/web/.next'
        : 'Verified build output under dist/',
      blocking: true,
    });
  }

  return makeResult({
    checkpointId: 'verify.artifacts',
    title: 'Verify build artifacts',
    level: LEVEL.ERROR,
    code: CODES.ARTIFACT_VERIFICATION_FAILED,
    message: 'Build completed but no expected output artifacts were found',
    blocking: true,
  });
}

async function writeReports(results, summary, exitCode) {
  await ensureDir(reportDir);

  const jsonReportPath = path.join(reportDir, 'latest.json');
  const textReportPath = path.join(reportDir, 'latest.txt');

  const payload = {
    generatedAt: nowIso(),
    repoRoot,
    exitCode,
    summary,
    results,
  };

  await fs.writeFile(jsonReportPath, JSON.stringify(payload, null, 2), 'utf8');

  const lines = [
    `generatedAt=${payload.generatedAt}`,
    `repoRoot=${payload.repoRoot}`,
    `exitCode=${payload.exitCode}`,
    `duration=${summary.duration}`,
    '',
    '[summary]',
    `PASS=${summary.counts.PASS}`,
    `INFO=${summary.counts.INFO}`,
    `SKIP=${summary.counts.SKIP}`,
    `WARN=${summary.counts.WARN}`,
    `ERROR=${summary.counts.ERROR}`,
    `FATAL=${summary.counts.FATAL}`,
    '',
    '[checkpoints]',
  ];

  for (const result of results) {
    lines.push(
      `${result.checkpointId} | ${result.level} | ${result.code} | ${result.message} | ${formatDuration(result.durationMs || 0)}`
    );

    if (result.details?.stderrTail) {
      lines.push('stderr:');
      lines.push(result.details.stderrTail);
    }

    if (result.details?.stdoutTail) {
      lines.push('stdout:');
      lines.push(result.details.stdoutTail);
    }

    lines.push('');
  }

  await fs.writeFile(textReportPath, lines.join('\n'), 'utf8');
}

async function main() {
  console.log(colorize('\nTop Shelf bootstrap starting...\n', BRAND.mist, { bold: true }));

  const results = [];

  const repoContext = await detectRepoContext();

  if (!repoContext.ok) {
    results.push(repoContext.result);
    printLine(
      repoContext.result.level,
      repoContext.result.code,
      repoContext.result.checkpointId,
      repoContext.result.message
    );

    const counts = summaryCounts(results);
    const summary = {
      counts,
      duration: formatDuration(Date.now() - processStart),
    };

    await writeReports(results, summary, FINAL_EXIT.FATAL_PRESENT);
    process.exit(FINAL_EXIT.FATAL_PRESENT);
  }

  const packageJson = repoContext.packageJson;

  const checkpoints = [
    () =>
      makeResult({
        checkpointId: 'preflight.repo-root',
        title: 'Validate repo root',
        level: LEVEL.PASS,
        code: 'TSS-BS-P000',
        message: `Repo root verified at ${repoRoot}`,
        blocking: true,
      }),
    () => checkpointNodeVersion(packageJson),
    () => checkpointPnpmVersion(packageJson),
    () => checkpointInstall(),
    () =>
      runScriptCheckpoint({
        packageJson,
        checkpointId: 'quality.format',
        title: 'Check formatting',
        scriptName: 'format:check',
        failureCode: CODES.FORMAT_FAILED,
        failureLevel: LEVEL.WARN,
        blocking: false,
      }),
    () =>
      runScriptCheckpoint({
        packageJson,
        checkpointId: 'quality.lint',
        title: 'Run lint',
        scriptName: 'lint',
        failureCode: CODES.LINT_FAILED,
        failureLevel: LEVEL.ERROR,
        blocking: true,
      }),
    () =>
      runScriptCheckpoint({
        packageJson,
        checkpointId: 'quality.typecheck',
        title: 'Run typecheck',
        scriptName: 'typecheck',
        failureCode: CODES.TYPECHECK_FAILED,
        failureLevel: LEVEL.ERROR,
        blocking: true,
      }),
    () =>
      runScriptCheckpoint({
        packageJson,
        checkpointId: 'quality.test',
        title: 'Run tests',
        scriptName: packageJson?.scripts?.['test:ci'] ? 'test:ci' : 'test',
        failureCode: CODES.TEST_FAILED,
        failureLevel: LEVEL.ERROR,
        blocking: true,
      }),
    () =>
      runScriptCheckpoint({
        packageJson,
        checkpointId: 'quality.build',
        title: 'Run build',
        scriptName: 'build',
        failureCode: CODES.BUILD_FAILED,
        failureLevel: LEVEL.ERROR,
        blocking: true,
      }),
    () =>
      runScriptCheckpoint({
        packageJson,
        checkpointId: 'domain.content-packs',
        title: 'Validate content packs',
        scriptName: 'validate:content-packs',
        failureCode: CODES.OPTIONAL_CHECK_FAILED,
        failureLevel: LEVEL.WARN,
        blocking: false,
      }),
    () =>
      runScriptCheckpoint({
        packageJson,
        checkpointId: 'domain.policies',
        title: 'Validate policies',
        scriptName: 'validate:policies',
        failureCode: CODES.OPTIONAL_CHECK_FAILED,
        failureLevel: LEVEL.WARN,
        blocking: false,
      }),
  ];

  for (const checkpoint of checkpoints) {
    const result = await checkpoint();
    results.push(result);
    printLine(result.level, result.code, result.checkpointId, result.message);

    if (result.details?.stderrTail) {
      console.log(colorize(`  stderr tail:\n${result.details.stderrTail}\n`, BRAND.amber));
    }

    if (result.details?.stdoutTail && result.level !== LEVEL.PASS) {
      console.log(colorize(`  stdout tail:\n${result.details.stdoutTail}\n`, BRAND.slate));
    }

    if (result.level === LEVEL.FATAL) {
      const counts = summaryCounts(results);
      const summary = {
        counts,
        duration: formatDuration(Date.now() - processStart),
      };

      await writeReports(results, summary, FINAL_EXIT.FATAL_PRESENT);
      console.log(
        colorize(
          `\nBootstrap stopped on fatal checkpoint ${result.checkpointId}. Reports written to .bootstrap/\n`,
          BRAND.red,
          { bold: true }
        )
      );
      process.exit(FINAL_EXIT.FATAL_PRESENT);
    }
  }

  const verification = await checkpointArtifacts(results);
  results.push(verification);
  printLine(verification.level, verification.code, verification.checkpointId, verification.message);

  const counts = summaryCounts(results);
  const summary = {
    counts,
    duration: formatDuration(Date.now() - processStart),
  };

  const hasFatal = results.some((result) => result.level === LEVEL.FATAL);
  const hasBlockingErrors = results.some(
    (result) => result.level === LEVEL.ERROR && result.blocking
  );
  const verificationPassed = verification.level === LEVEL.PASS;

  let exitCode = FINAL_EXIT.SUCCESS;

  if (hasFatal) {
    exitCode = FINAL_EXIT.FATAL_PRESENT;
  } else if (hasBlockingErrors) {
    exitCode = FINAL_EXIT.ERROR_PRESENT;
  } else if (!verificationPassed) {
    exitCode = FINAL_EXIT.VERIFICATION_FAILED;
  }

  await writeReports(results, summary, exitCode);

  console.log('');
  console.log(colorize('Checkpoint summary', BRAND.mist, { bold: true }));
  console.log(
    colorize(
      `PASS=${counts.PASS} INFO=${counts.INFO} SKIP=${counts.SKIP} WARN=${counts.WARN} ERROR=${counts.ERROR} FATAL=${counts.FATAL}`,
      BRAND.slate,
      { bold: true }
    )
  );
  console.log(colorize(`Reports written to ${path.relative(repoRoot, reportDir)}`, BRAND.slate));
  console.log('');

  if (exitCode === FINAL_EXIT.SUCCESS) {
    console.log(successBanner(summary));
    console.log('');
    process.exit(FINAL_EXIT.SUCCESS);
  }

  if (exitCode === FINAL_EXIT.ERROR_PRESENT) {
    console.log(
      colorize(
        'Bootstrap completed, but one or more blocking checkpoints failed. Banner suppressed.',
        BRAND.red,
        { bold: true }
      )
    );
    process.exit(FINAL_EXIT.ERROR_PRESENT);
  }

  if (exitCode === FINAL_EXIT.VERIFICATION_FAILED) {
    console.log(
      colorize(
        'Bootstrap completed, but final verification failed. Banner suppressed.',
        BRAND.red,
        { bold: true }
      )
    );
    process.exit(FINAL_EXIT.VERIFICATION_FAILED);
  }

  console.log(
    colorize('Bootstrap terminated unexpectedly. Banner suppressed.', BRAND.red, { bold: true })
  );
  process.exit(exitCode);
}

main().catch(async (error) => {
  const fatalMessage = error instanceof Error ? error.stack || error.message : String(error);
  await ensureDir(reportDir);
  await fs.writeFile(
    path.join(reportDir, 'crash.txt'),
    `${nowIso()}\n${stripAnsi(fatalMessage)}\n`,
    'utf8'
  );
  console.error(
    colorize('\nBootstrap crashed. See .bootstrap/crash.txt\n', BRAND.red, { bold: true })
  );
  process.exit(FINAL_EXIT.INTERNAL_FAILURE);
});
