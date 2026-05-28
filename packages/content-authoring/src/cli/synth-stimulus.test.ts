import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const testDir = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(testDir, 'synth-stimulus.ts');

interface CliSummary {
  totalBlocks: number;
  synthesized: number;
  skipped: number;
  drafts: Array<{
    pack: string;
    block: string;
    kind?: string;
    skipped?: string;
    stimulus?: unknown;
  }>;
}

function runCli(args: string[]): CliSummary {
  const stdout = execFileSync('pnpm', ['exec', 'tsx', cliPath, ...args], {
    cwd: resolve(testDir, '../../..'),
    encoding: 'utf8',
  });
  return JSON.parse(stdout) as CliSummary;
}

function writePack(dir: string, name: string, teachingBlocks: unknown[]): string {
  const packPath = join(dir, name);
  writeFileSync(
    packPath,
    JSON.stringify(
      {
        id: name.replace(/\.json$/, ''),
        teachingBlocks,
      },
      null,
      2
    ) + '\n',
    'utf8'
  );
  return packPath;
}

describe('synth-stimulus CLI', () => {
  it('dry-runs a single block without mutating the pack', () => {
    const dir = mkdtempSync(join(tmpdir(), 'topshelf-synth-'));
    const packPath = writePack(dir, 'pack.json', [
      {
        id: 'tb-ticket',
        content: 'Table T8 ordered 2 tacos.',
      },
    ]);
    const before = readFileSync(packPath, 'utf8');

    const summary = runCli(['--pack', packPath, '--block', 'tb-ticket', '--dry-run']);

    expect(summary.totalBlocks).toBe(1);
    expect(summary.synthesized).toBe(1);
    expect(summary.drafts[0]?.block).toBe('tb-ticket');
    expect(summary.drafts[0]?.kind).toBe('ticket');
    expect(readFileSync(packPath, 'utf8')).toBe(before);
  });

  it('writes a synthesized stimulus and author-review envelope when requested', () => {
    const dir = mkdtempSync(join(tmpdir(), 'topshelf-synth-'));
    const packPath = writePack(dir, 'pack.json', [
      {
        id: 'tb-menu',
        content: "Tonight's special: chile relleno.",
      },
    ]);

    const summary = runCli(['--pack', packPath, '--write']);
    const updated = JSON.parse(readFileSync(packPath, 'utf8')) as {
      teachingBlocks: Array<{ stimulus?: { kind?: string }; _authorReview?: unknown }>;
    };

    expect(summary.synthesized).toBe(1);
    expect(updated.teachingBlocks[0]?.stimulus?.kind).toBe('menu_board');
    expect(updated.teachingBlocks[0]?._authorReview).toMatchObject({
      needsReview: true,
      heuristic: 'keyword:menu_board',
    });
  });

  it('backfills JSON packs recursively and reports skipped blocks', () => {
    const dir = mkdtempSync(join(tmpdir(), 'topshelf-synth-'));
    const nested = join(dir, 'nested');
    mkdirSync(nested);
    writePack(dir, 'root.json', [
      {
        id: 'tb-existing',
        content: 'Table T1 ordered 1 burger.',
        stimulus: { kind: 'plain_text', lines: ['already authored'] },
      },
    ]);
    writePack(nested, 'child.json', [
      {
        id: 'tb-huddle',
        content: 'Pre-shift huddle: 86 queso.',
      },
    ]);

    const summary = runCli(['--backfill', dir, '--dry-run']);

    expect(summary.totalBlocks).toBe(2);
    expect(summary.synthesized).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(summary.drafts.map((draft) => draft.block).sort()).toEqual(['tb-existing', 'tb-huddle']);
    expect(summary.drafts.find((draft) => draft.block === 'tb-existing')?.skipped).toMatch(
      /already has/
    );
  });
});
