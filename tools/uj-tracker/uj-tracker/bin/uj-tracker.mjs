#!/usr/bin/env node
/**
 * uj-tracker — single-file Node CLI for the UJ Pack production roadmap.
 *
 * Usage:
 *   node bin/uj-tracker.mjs status         # human-readable dashboard
 *   node bin/uj-tracker.mjs status --md    # markdown for pasting into PR
 *   node bin/uj-tracker.mjs check          # run automated gates
 *   node bin/uj-tracker.mjs check P0       # run gates for one phase
 *   node bin/uj-tracker.mjs set P0.1.1 done    # mark a task done
 *   node bin/uj-tracker.mjs set P0.1.1 in-progress
 *   node bin/uj-tracker.mjs next           # show what to work on next
 *   node bin/uj-tracker.mjs sanity         # check the week-4 sanity gate
 *
 * Stores state by overwriting tasks.yaml.
 *
 * Zero deps. Parses YAML with a tiny embedded parser sufficient for our
 * shape (no flow-style, no anchors, no fancy stuff).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TASKS_FILE = path.resolve(__dirname, '..', 'tasks.yaml');

// ============================================================================
// Tiny YAML reader/writer: round-trips our specific format.
// We don't use full js-yaml because zero deps is preferable here, and our
// schema is constrained.
// ============================================================================

function readTasks() {
  const raw = fs.readFileSync(TASKS_FILE, 'utf-8');
  return parseYaml(raw);
}

function writeTasks(data) {
  // Re-read original, mutate only `status` and `blocked_on` fields by line,
  // preserve formatting, comments, everything else. Surgical edit.
  const raw = fs.readFileSync(TASKS_FILE, 'utf-8');
  const lines = raw.split('\n');
  // walk: when we hit `id: X`, remember the id; when we hit the next
  // `status:` or `blocked_on:` at deeper indent, replace its value.
  let currentId = null;
  let currentIndent = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const idMatch = line.match(/^(\s*)-?\s*id:\s*(\S+)/);
    if (idMatch) {
      currentId = idMatch[2];
      currentIndent = idMatch[1].length;
      continue;
    }
    if (currentId) {
      const sm = line.match(/^(\s*)status:\s*(\S+)/);
      const bm = line.match(/^(\s*)blocked_on:\s*(.*)$/);
      if (sm && data.byId[currentId] && data.byId[currentId].status !== undefined) {
        const indent = sm[1];
        if (indent.length > currentIndent) {
          lines[i] = `${indent}status: ${data.byId[currentId].status}`;
        }
      }
      if (bm && data.byId[currentId] && data.byId[currentId].blocked_on !== undefined) {
        const indent = bm[1];
        if (indent.length > currentIndent) {
          const val = data.byId[currentId].blocked_on;
          lines[i] = `${indent}blocked_on: ${val === null ? 'null' : val}`;
        }
      }
    }
  }
  fs.writeFileSync(TASKS_FILE, lines.join('\n'));
}

// Minimal YAML parser for our shape. Indented mappings, sequences,
// scalars (string/null/number/boolean). No flow-style.
function parseYaml(text) {
  const lines = text.split('\n');
  const result = parseBlock(lines, 0, 0).value;
  // Build an index of all tasks/phases/batches by id for O(1) lookup
  const byId = {};
  function indexNode(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(indexNode);
      return;
    }
    if (node.id) byId[node.id] = node;
    for (const k of Object.keys(node)) indexNode(node[k]);
  }
  indexNode(result);
  return { ...result, byId };
}

function parseBlock(lines, startLine, baseIndent) {
  // Determine if this is a sequence or mapping by looking at first
  // non-blank, non-comment line at >=baseIndent.
  let i = startLine;
  while (i < lines.length) {
    const l = lines[i];
    if (l.trim() === '' || l.trim().startsWith('#')) { i++; continue; }
    const indent = l.match(/^(\s*)/)[1].length;
    if (indent < baseIndent) return { value: null, nextLine: i };
    if (l.trim().startsWith('- ')) {
      return parseSequence(lines, i, baseIndent);
    } else {
      return parseMapping(lines, i, baseIndent);
    }
  }
  return { value: null, nextLine: i };
}

function parseSequence(lines, startLine, baseIndent) {
  const items = [];
  let i = startLine;
  while (i < lines.length) {
    const l = lines[i];
    if (l.trim() === '' || l.trim().startsWith('#')) { i++; continue; }
    const indent = l.match(/^(\s*)/)[1].length;
    if (indent < baseIndent) break;
    if (indent !== baseIndent || !l.trim().startsWith('- ')) break;
    // Strip the "- " and parse the rest as a mapping starting at indent+2
    const rest = l.substring(indent + 2);
    // Replace the line with the bare key so parseMapping picks it up
    const fakeLines = [...lines];
    fakeLines[i] = ' '.repeat(indent + 2) + rest;
    const sub = parseMapping(fakeLines, i, indent + 2);
    items.push(sub.value);
    i = sub.nextLine;
  }
  return { value: items, nextLine: i };
}

function parseMapping(lines, startLine, baseIndent) {
  const obj = {};
  let i = startLine;
  while (i < lines.length) {
    const l = lines[i];
    if (l.trim() === '' || l.trim().startsWith('#')) { i++; continue; }
    const indent = l.match(/^(\s*)/)[1].length;
    if (indent < baseIndent) break;
    if (indent > baseIndent) { i++; continue; }
    // Parse "key: value" or "key:" + nested block
    const m = l.match(/^\s*([^:]+):\s*(.*)$/);
    if (!m) { i++; continue; }
    const key = m[1].trim();
    const inlineVal = m[2];
    if (inlineVal === '' || inlineVal === undefined) {
      // Nested block
      const sub = parseBlock(lines, i + 1, indent + 2);
      obj[key] = sub.value;
      i = sub.nextLine;
    } else if (inlineVal.startsWith('|')) {
      // Multiline literal
      i++;
      const childIndent = (lines[i] && lines[i].match(/^(\s*)/)[1].length) || indent + 2;
      const buf = [];
      while (i < lines.length) {
        const li = lines[i];
        if (li.trim() === '') { buf.push(''); i++; continue; }
        const ind = li.match(/^(\s*)/)[1].length;
        if (ind < childIndent) break;
        buf.push(li.substring(childIndent));
        i++;
      }
      obj[key] = buf.join('\n').trimEnd();
    } else {
      obj[key] = parseScalar(inlineVal.trim());
      i++;
    }
  }
  return { value: obj, nextLine: i };
}

function parseScalar(s) {
  if (s === 'null' || s === '~' || s === '') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  // Strip simple quotes
  if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
  // Inline list "[a, b, c]"
  if (s.startsWith('[') && s.endsWith(']')) {
    return s.slice(1, -1).split(',').map((x) => parseScalar(x.trim())).filter((x) => x !== null);
  }
  return s;
}

// ============================================================================
// Walk helpers
// ============================================================================

function allTasks(data) {
  const out = [];
  for (const x of (data.cross_cutting || [])) {
    out.push({ kind: 'cross', task: x });
  }
  for (const phase of (data.phases || [])) {
    for (const batch of (phase.batches || [])) {
      for (const task of (batch.tasks || [])) {
        out.push({ kind: 'task', phase, batch, task });
      }
    }
  }
  return out;
}

const STATUS_ICONS = {
  pending: '◯',
  'in-progress': '◐',
  blocked: '⊘',
  review: '◔',
  done: '●',
  deferred: '·',
};

function statusIcon(s) {
  return STATUS_ICONS[s] || '?';
}

// ============================================================================
// Gate checks
// ============================================================================

function expandPath(p) {
  if (!p) return p;
  return p.replace(/^~/, os.homedir());
}

function runGate(gate) {
  switch (gate.check) {
    case 'manual':
      return { status: 'manual', detail: 'must be confirmed by you' };
    case 'file_exists': {
      const fp = expandPath(gate.path);
      return fs.existsSync(fp)
        ? { status: 'pass', detail: `exists: ${fp}` }
        : { status: 'fail', detail: `missing: ${fp}` };
    }
    case 'git_branch': {
      try {
        execSync(`git rev-parse --verify ${gate.branch}`, {
          stdio: 'pipe',
          cwd: gate.cwd ? expandPath(gate.cwd) : process.cwd(),
        });
        return { status: 'pass', detail: `branch ${gate.branch} exists` };
      } catch {
        return { status: 'fail', detail: `branch ${gate.branch} not found` };
      }
    }
    case 'github_pr': {
      try {
        const out = execSync(`gh pr view ${gate.pr} --json state -q .state`, { stdio: 'pipe' }).toString().trim();
        return out === 'MERGED'
          ? { status: 'pass', detail: `PR #${gate.pr} merged` }
          : { status: 'fail', detail: `PR #${gate.pr} state: ${out}` };
      } catch (e) {
        return { status: 'fail', detail: `PR check failed: ${e.message.slice(0, 80)}` };
      }
    }
    case 'command': {
      try {
        execSync(gate.command, {
          stdio: 'pipe',
          cwd: gate.cwd ? expandPath(gate.cwd) : process.cwd(),
        });
        return { status: 'pass', detail: `cmd OK` };
      } catch (e) {
        return { status: 'fail', detail: `cmd failed: ${gate.command}` };
      }
    }
    default:
      return { status: 'unknown', detail: `unknown check ${gate.check}` };
  }
}

// ============================================================================
// Commands
// ============================================================================

function cmdStatus(args) {
  const data = readTasks();
  const md = args.includes('--md');
  const lines = [];

  if (md) {
    lines.push(`# UJ Pack — Production Tracker`);
    lines.push('');
    lines.push(`**Project:** ${data.project} · **Repo:** ${data.repo}`);
    lines.push(`**Target:** ${data.target}`);
    lines.push('');
  } else {
    lines.push(`\n  UJ Pack — Production Tracker`);
    lines.push(`  ${data.target}\n`);
  }

  const tasks = allTasks(data);
  const byStatus = {};
  for (const t of tasks) {
    const s = t.task.status || 'pending';
    byStatus[s] = (byStatus[s] || 0) + 1;
  }
  const total = tasks.length;
  const done = byStatus.done || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const summary = `${done}/${total} done (${pct}%)  ` +
    `[● ${byStatus.done || 0}  ◐ ${byStatus['in-progress'] || 0}  ◔ ${byStatus.review || 0}  ⊘ ${byStatus.blocked || 0}  ◯ ${byStatus.pending || 0}  · ${byStatus.deferred || 0}]`;
  if (md) {
    lines.push(`**Progress:** ${summary}`);
    lines.push('');
  } else {
    lines.push(`  ${summary}\n`);
  }

  // Cross-cutting
  if (md) lines.push('## Cross-cutting');
  else lines.push('  Cross-cutting');
  for (const x of (data.cross_cutting || [])) {
    const icon = statusIcon(x.status || 'pending');
    if (md) {
      lines.push(`- ${icon} **${x.id}** ${x.title} _(${x.agent}${x.status ? ', ' + x.status : ''})_`);
    } else {
      lines.push(`    ${icon}  ${x.id}  ${x.title}  [${x.agent}]`);
    }
  }
  if (md) lines.push('');

  // Phases
  for (const phase of (data.phases || [])) {
    const phaseTasks = (phase.batches || []).flatMap((b) => b.tasks || []);
    const phaseDone = phaseTasks.filter((t) => t.status === 'done').length;
    const phaseTotal = phaseTasks.length;
    const phaseLabel = `${phase.id} ${phase.title}  ${phaseDone}/${phaseTotal}`;
    if (md) {
      lines.push(`## ${phaseLabel}`);
      lines.push(`_${phase.goal}_`);
      lines.push('');
    } else {
      lines.push(`\n  ${phaseLabel}`);
      lines.push(`  ${phase.goal}\n`);
    }

    for (const batch of (phase.batches || [])) {
      if (md) {
        lines.push(`### ${batch.id} — ${batch.title}`);
        if (batch.parallelism) lines.push(`_parallelism: ${batch.parallelism}_`);
        lines.push('');
      } else {
        lines.push(`    ${batch.id}  ${batch.title}` + (batch.parallelism ? `  (∥${batch.parallelism})` : ''));
      }
      for (const task of (batch.tasks || [])) {
        const icon = statusIcon(task.status || 'pending');
        const agent = task.agent ? ` [${task.agent}]` : '';
        const blocked = task.blocked_on ? ` ⊘ ${task.blocked_on}` : '';
        if (md) {
          lines.push(`- ${icon} **${task.id}** ${task.title}${agent}${blocked}`);
        } else {
          lines.push(`      ${icon}  ${task.id.padEnd(8)} ${task.title}${agent}${blocked}`);
        }
      }
      if (md) lines.push('');
    }
  }

  if (!md) lines.push('');
  console.log(lines.join('\n'));
}

function cmdCheck(args) {
  const data = readTasks();
  const filter = args[0];
  const tasks = allTasks(data);
  const matching = filter
    ? tasks.filter((t) => t.task.id.startsWith(filter) || (t.phase && t.phase.id === filter))
    : tasks;

  console.log(`\nRunning automated gate checks${filter ? ` for ${filter}` : ''}...\n`);
  let pass = 0, fail = 0, manual = 0;
  for (const { task } of matching) {
    if (!task.gates) continue;
    for (const gate of task.gates) {
      const result = runGate(gate);
      const sym = result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : result.status === 'manual' ? '·' : '?';
      console.log(`  ${sym}  ${task.id}  ${gate.description}`);
      if (result.status !== 'manual') {
        console.log(`        ${result.detail}`);
      }
      if (result.status === 'pass') pass++;
      else if (result.status === 'fail') fail++;
      else if (result.status === 'manual') manual++;
    }
  }
  console.log(`\n${pass} passed, ${fail} failed, ${manual} manual\n`);
  process.exit(fail > 0 ? 1 : 0);
}

function cmdSet(args) {
  const [id, status] = args;
  if (!id || !status) {
    console.error('usage: uj-tracker set <id> <status>');
    console.error('  status: pending | in-progress | blocked | review | done | deferred');
    process.exit(1);
  }
  const valid = ['pending', 'in-progress', 'blocked', 'review', 'done', 'deferred'];
  if (!valid.includes(status)) {
    console.error(`bad status. valid: ${valid.join(', ')}`);
    process.exit(1);
  }
  const data = readTasks();
  if (!data.byId[id]) {
    console.error(`unknown id: ${id}`);
    process.exit(1);
  }
  data.byId[id].status = status;
  writeTasks(data);
  console.log(`${id} → ${status}`);
}

function cmdNext() {
  const data = readTasks();
  const tasks = allTasks(data);
  // Next = first task in phase order with status pending or in-progress
  // not blocked by an unfinished phase dependency.
  const phaseStatus = {};
  for (const phase of (data.phases || [])) {
    const pt = (phase.batches || []).flatMap((b) => b.tasks || []);
    const allDone = pt.length > 0 && pt.every((t) => t.status === 'done' || t.status === 'deferred');
    phaseStatus[phase.id] = allDone ? 'done' : 'open';
  }

  // Cross-cutting first
  const xcOpen = (data.cross_cutting || []).filter((x) => x.status !== 'done' && x.status !== 'deferred');

  console.log('\nNext to work on:\n');
  if (xcOpen.length) {
    console.log('  Cross-cutting (run continuously):');
    for (const x of xcOpen) {
      console.log(`    ${statusIcon(x.status || 'pending')}  ${x.id}  ${x.title}  [${x.agent}]`);
    }
  }

  for (const phase of (data.phases || [])) {
    if (phaseStatus[phase.id] === 'done') continue;
    // Check phase dependencies
    if (phase.depends_on) {
      const blocked = phase.depends_on.some((dep) => phaseStatus[dep] !== 'done');
      if (blocked) {
        console.log(`\n  ${phase.id} ${phase.title} — BLOCKED on ${phase.depends_on.join(', ')}`);
        continue;
      }
    }
    console.log(`\n  ${phase.id} ${phase.title}:`);
    for (const batch of (phase.batches || [])) {
      const batchTasks = (batch.tasks || []);
      const batchDone = batchTasks.every((t) => t.status === 'done' || t.status === 'deferred');
      if (batchDone) continue;
      // Check batch dependencies within phase
      if (batch.depends_on) {
        const blockedOn = batch.depends_on.filter((d) => {
          const dep = (phase.batches || []).find((b) => b.id === d);
          if (!dep) return false;
          return !(dep.tasks || []).every((t) => t.status === 'done' || t.status === 'deferred');
        });
        if (blockedOn.length) continue;
      }
      console.log(`    ${batch.id} ${batch.title}` + (batch.parallelism ? ` (∥${batch.parallelism})` : ''));
      for (const t of batchTasks) {
        if (t.status === 'done' || t.status === 'deferred') continue;
        console.log(`      ${statusIcon(t.status || 'pending')}  ${t.id}  ${t.title}  [${t.agent}]`);
      }
    }
    return; // Only show the current open phase
  }
  console.log('\n  All phases done. Pilot retro is the only remaining item.\n');
}

function cmdSanity() {
  const data = readTasks();
  const start = data.sanity_gate?.start_date;
  if (!start) {
    console.log('\n  Sanity gate: project not yet committed.');
    console.log('  Set sanity_gate.start_date in tasks.yaml when you commit to the bet.\n');
    return;
  }
  const startDate = new Date(start);
  const now = new Date();
  const weeks = (now - startDate) / (1000 * 60 * 60 * 24 * 7);
  const limit = data.sanity_gate.weeks_to_p1_done || 4;
  const p0 = data.byId.P0;
  const p1 = data.byId.P1;
  const p0Tasks = (p0?.batches || []).flatMap((b) => b.tasks || []);
  const p1Tasks = (p1?.batches || []).flatMap((b) => b.tasks || []);
  const p0Done = p0Tasks.length > 0 && p0Tasks.every((t) => t.status === 'done' || t.status === 'deferred');
  const p1Done = p1Tasks.length > 0 && p1Tasks.every((t) => t.status === 'done' || t.status === 'deferred');

  console.log(`\n  Sanity gate: P0 + P1 done by week ${limit}`);
  console.log(`  Project started: ${start}`);
  console.log(`  Weeks elapsed: ${weeks.toFixed(1)}`);
  console.log(`  P0 done: ${p0Done ? 'YES' : 'no'}`);
  console.log(`  P1 done: ${p1Done ? 'YES' : 'no'}`);
  if (weeks >= limit && !(p0Done && p1Done)) {
    console.log(`\n  ⚠  SANITY GATE TRIPPED — Decide:`);
    console.log(`     1. Cut scope (single-tenant localStorage demo)`);
    console.log(`     2. Bring in help (contractor 1-2 weeks @ $100-150/hr)`);
    console.log(`     3. Pause until summer\n`);
    process.exit(1);
  } else if (p0Done && p1Done) {
    console.log(`\n  ✓ Bet is on track. Continue to Phase 2.\n`);
  } else {
    const remaining = (limit - weeks).toFixed(1);
    console.log(`\n  ${remaining} weeks until sanity gate.\n`);
  }
}

// ============================================================================
// Entry
// ============================================================================

const [, , command, ...rest] = process.argv;
switch (command) {
  case 'status': cmdStatus(rest); break;
  case 'check': cmdCheck(rest); break;
  case 'set': cmdSet(rest); break;
  case 'next': cmdNext(); break;
  case 'sanity': cmdSanity(); break;
  default:
    console.log(`uj-tracker — UJ Pack production progress

Commands:
  status [--md]      Print dashboard (--md for markdown to paste in PR)
  check [filter]     Run automated gates (filter: P0, P1, X1, etc.)
  set <id> <status>  Mark a task: pending|in-progress|blocked|review|done|deferred
  next               Show what to work on next
  sanity             Check the week-4 P0+P1 sanity gate

Examples:
  node bin/uj-tracker.mjs status
  node bin/uj-tracker.mjs check P0
  node bin/uj-tracker.mjs set P0.1.1 in-progress
  node bin/uj-tracker.mjs set P0.1.1 done
  node bin/uj-tracker.mjs next
  node bin/uj-tracker.mjs sanity

State lives in tasks.yaml. Edit by hand or via 'set'.
`);
}
