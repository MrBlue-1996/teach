#!/usr/bin/env node
/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

/**
 * Drafts a structured stimulus for one or more teaching blocks that don't
 * already carry one. Heuristic-only — no LLM calls.
 *
 * Usage:
 *   tsx src/cli/synth-stimulus.ts --pack <pack.json> --block <blockId> [--dry-run|--write]
 *   tsx src/cli/synth-stimulus.ts --backfill <dir> [--write]
 *
 * `--dry-run` (default) prints drafts without modifying files. `--write` mutates
 * the pack JSON in place, embedding the draft alongside an `_authorReview`
 * envelope. After --write, packs must be re-signed before publishing.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import {
  synthesizeStimulus,
  wrapForReview,
  type SynthesisResult,
} from '../heuristics/stimulus-synth.js';

function walkJsonFiles(root: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return [];
  }
  for (const entry of entries) {
    const full = join(root, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      out.push(...walkJsonFiles(full));
    } else if (stat.isFile() && entry.endsWith('.json')) {
      out.push(full);
    }
  }
  return out;
}

interface CliArgs {
  packs: string[];
  blockId?: string;
  write: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { packs: [], write: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const nextArg = argv[i + 1];

    if (arg === '--pack' && typeof nextArg === 'string' && nextArg.length > 0) {
      args.packs.push(nextArg);
      i += 1;
    } else if (arg === '--backfill' && typeof nextArg === 'string' && nextArg.length > 0) {
      const dir = resolve(process.cwd(), nextArg);
      args.packs.push(...walkJsonFiles(dir));
      i += 1;
    } else if (arg === '--block' && typeof nextArg === 'string' && nextArg.length > 0) {
      args.blockId = nextArg;
      i += 1;
    } else if (arg === '--write') {
      args.write = true;
    } else if (arg === '--dry-run') {
      args.write = false;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

function printHelp(): void {
  // eslint-disable-next-line no-console
  console.log(`synth-stimulus — heuristic stimulus drafter

Options:
  --pack <path>      Pack JSON file to inspect (repeatable)
  --backfill <dir>   Run over every pack JSON found recursively in the directory
  --block <id>       Limit to a single block within a pack
  --write            Mutate pack JSON in place (default is --dry-run)
  --dry-run          Print drafts without writing (default)
  --help, -h         Show this message
`);
}

interface TeachingBlockLike {
  id?: string;
  blockId?: string;
  concept?: string;
  content?: string;
  canonicalSolution?: string;
  stimulus?: unknown;
}

interface PackLike {
  id?: string;
  teachingBlocks?: TeachingBlockLike[];
}

interface BlockReport {
  packPath: string;
  blockKey: string;
  result: SynthesisResult;
}

function processBlock(block: TeachingBlockLike, packPath: string): BlockReport {
  const blockKey = block.id ?? block.blockId ?? '<unnamed>';
  const result = synthesizeStimulus({
    blockId: blockKey,
    ...(block.concept !== undefined ? { concept: block.concept } : {}),
    ...(block.content !== undefined ? { content: block.content } : {}),
    ...(block.canonicalSolution !== undefined
      ? { canonicalSolution: block.canonicalSolution }
      : {}),
    hasExistingStimulus: block.stimulus !== undefined && block.stimulus !== null,
  });
  return { packPath, blockKey, result };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (args.packs.length === 0) {
    printHelp();
    process.exit(1);
  }

  const reports: BlockReport[] = [];

  for (const packPath of args.packs) {
    const abs = resolve(process.cwd(), packPath);
    let pack: PackLike;
    try {
      pack = JSON.parse(readFileSync(abs, 'utf8')) as PackLike;
    } catch (err) {
      console.error(`[skip] ${packPath}: ${(err as Error).message}`);
      continue;
    }

    const blocks = pack.teachingBlocks ?? [];
    const targetBlocks =
      args.blockId !== undefined
        ? blocks.filter((b) => b.id === args.blockId || b.blockId === args.blockId)
        : blocks;

    let mutated = false;

    for (const block of targetBlocks) {
      const report = processBlock(block, packPath);
      reports.push(report);

      if (report.result.synthesized && args.write) {
        const wrapped = wrapForReview(report.result);
        block.stimulus = wrapped.stimulus;
        // Attach review envelope in a way that survives JSON roundtrip but
        // is stripped by the signing pipeline (signer must drop _authorReview).
        (block as Record<string, unknown>)['_authorReview'] = wrapped._authorReview;
        mutated = true;
      }
    }

    if (mutated) {
      writeFileSync(abs, JSON.stringify(pack, null, 2) + '\n', 'utf8');

      console.error(`[write] ${packPath} — mutated. Remember to re-sign before publishing.`);
    }
  }

  // Print a summary as JSON on stdout
  const summary = {
    totalBlocks: reports.length,
    synthesized: reports.filter((r) => r.result.synthesized).length,
    skipped: reports.filter((r) => !r.result.synthesized).length,
    drafts: reports.map((r) => ({
      pack: r.packPath,
      block: r.blockKey,
      ...(r.result.synthesized
        ? {
            kind: r.result.kind,
            heuristic: r.result.heuristic,
            confidence: r.result.confidence,
            stimulus: r.result.stimulus,
          }
        : { skipped: r.result.reason }),
    })),
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(summary, null, 2));
}

main();
