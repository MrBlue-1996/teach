#!/usr/bin/env node
/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * bench-compare.mjs — Benchmark regression detector
 *
 * Compares the latest bench-results JSON files against a committed
 * baseline to flag regressions before they merge.
 *
 * Usage:
 *   node scripts/bench-compare.mjs                    # compare against baseline
 *   node scripts/bench-compare.mjs --update-baseline  # overwrite baseline with current results
 *
 * Exit codes:
 *   0 — all benchmarks within tolerance
 *   1 — one or more regressions detected (fails CI)
 *
 * Regression threshold: >20% slower than baseline mean (configurable via
 * BENCH_REGRESSION_THRESHOLD env var, e.g. BENCH_REGRESSION_THRESHOLD=0.15).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const THRESHOLD = parseFloat(process.env.BENCH_REGRESSION_THRESHOLD ?? '0.20');
const UPDATE_BASELINE = process.argv.includes('--update-baseline');

const RESULT_FILES = [
  {
    name: 'engine',
    results: resolve(ROOT, 'packages/engine/bench-results/engine.json'),
    baseline: resolve(ROOT, 'benchmarks/baselines/engine.json'),
  },
  {
    name: 'api-server',
    results: resolve(ROOT, 'packages/api-server/bench-results/api-server.json'),
    baseline: resolve(ROOT, 'benchmarks/baselines/api-server.json'),
  },
];

// ---------------------------------------------------------------------------
// Vitest bench JSON shape
// ---------------------------------------------------------------------------

/**
 * @typedef {{ name: string; mean: number; p99: number; samples: number[] }} BenchResult
 * @typedef {{ file: string; groups: Array<{ name: string; benchmarks: BenchResult[] }> }} BenchFile
 */

/**
 * Flatten a Vitest bench JSON output into a name→mean map.
 * Vitest 2.x bench JSON shape (benchmark.outputJson):
 *   { files: [{ filepath, groups: [{ fullName, benchmarks: [{ name, hz, mean, p99, ... }] }] }] }
 *   - mean/p99 are in milliseconds
 *
 * @param {unknown} raw
 * @returns {Map<string, { mean: number; p99: number }>}
 */
function flatten(raw) {
  const map = new Map();
  const files = /** @type {any} */ (raw)?.files ?? [];
  for (const file of files) {
    for (const group of file.groups ?? []) {
      for (const bm of group.benchmarks ?? []) {
        const key = `${group.fullName} > ${bm.name}`;
        map.set(key, { mean: bm.mean ?? 0, p99: bm.p99 ?? 0 });
      }
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Update-baseline mode
// ---------------------------------------------------------------------------

if (UPDATE_BASELINE) {
  let updated = 0;
  for (const { name, results, baseline } of RESULT_FILES) {
    if (!existsSync(results)) {
      console.warn(`[bench-compare] SKIP ${name}: results file not found (run pnpm bench:ci first)`);
      continue;
    }
    // Ensure benchmarks/baselines/ directory exists
    const baselineDir = dirname(baseline);
    if (!existsSync(baselineDir)) {
      const { mkdirSync } = await import('fs');
      mkdirSync(baselineDir, { recursive: true });
    }
    const raw = readFileSync(results, 'utf8');
    writeFileSync(baseline, raw);
    console.log(`[bench-compare] ✅ Updated baseline for ${name} → ${baseline}`);
    updated++;
  }
  console.log(
    `\n[bench-compare] Baseline updated for ${updated} package(s).\n` +
    `  Commit the files in benchmarks/baselines/ to make this the new reference.`
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Comparison mode
// ---------------------------------------------------------------------------

let hasRegression = false;
let totalChecked = 0;
let totalRegressions = 0;

for (const { name, results, baseline } of RESULT_FILES) {
  if (!existsSync(results)) {
    console.warn(`[bench-compare] SKIP ${name}: results file not found (run pnpm bench:ci first)`);
    continue;
  }
  if (!existsSync(baseline)) {
    console.warn(
      `[bench-compare] SKIP ${name}: no baseline yet — run with --update-baseline to create one`
    );
    continue;
  }

  const current = flatten(JSON.parse(readFileSync(results, 'utf8')));
  const base = flatten(JSON.parse(readFileSync(baseline, 'utf8')));

  console.log(`\n📊 ${name}`);
  console.log('─'.repeat(70));

  const regressions = [];
  const improvements = [];
  const unchanged = [];

  for (const [key, cur] of current) {
    const ref = base.get(key);
    if (ref === undefined) {
      console.log(`  NEW  ${key} (mean: ${fmt(cur.mean)})`);
      continue;
    }

    totalChecked++;
    const delta = (cur.mean - ref.mean) / ref.mean; // positive = slower

    if (delta > THRESHOLD) {
      regressions.push({ key, delta, cur, ref });
      totalRegressions++;
      hasRegression = true;
    } else if (delta < -0.05) {
      improvements.push({ key, delta, cur, ref });
    } else {
      unchanged.push({ key, delta, cur, ref });
    }
  }

  // Print regressions first (loudly)
  for (const { key, delta, cur, ref } of regressions) {
    console.log(
      `  ❌ REGRESSION  ${key}\n` +
      `       baseline: ${fmt(ref.mean)} | current: ${fmt(cur.mean)} | Δ +${pct(delta)}`
    );
  }

  for (const { key, delta, cur, ref } of improvements) {
    console.log(
      `  ✅ FASTER      ${key}\n` +
      `       baseline: ${fmt(ref.mean)} | current: ${fmt(cur.mean)} | Δ ${pct(delta)}`
    );
  }

  for (const { key, delta } of unchanged) {
    console.log(`  ✓  ok          ${key}  (Δ ${pct(delta)})`);
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n' + '═'.repeat(70));
if (totalChecked === 0) {
  console.log('[bench-compare] No benchmarks compared (missing results or baseline).');
  process.exit(0);
}

if (hasRegression) {
  console.log(
    `[bench-compare] ❌ FAILED — ${totalRegressions} regression(s) exceed ${pct(THRESHOLD)} threshold.\n` +
    `  Run 'pnpm bench' locally to investigate, or 'pnpm bench:compare --update-baseline'\n` +
    `  to accept the new numbers as baseline.`
  );
  process.exit(1);
} else {
  console.log(
    `[bench-compare] ✅ PASSED — ${totalChecked} benchmarks within ${pct(THRESHOLD)} regression threshold.`
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format milliseconds (vitest bench mean unit) to a human-readable string */
function fmt(ms) {
  if (ms < 0.001) return `${(ms * 1_000_000).toFixed(1)} ns`;
  if (ms < 1) return `${(ms * 1_000).toFixed(2)} µs`;
  return `${ms.toFixed(2)} ms`;
}

/** Format a ratio as a signed percentage */
function pct(ratio) {
  const sign = ratio >= 0 ? '+' : '';
  return `${sign}${(ratio * 100).toFixed(1)}%`;
}
