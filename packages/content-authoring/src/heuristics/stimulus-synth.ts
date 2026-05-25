/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

/**
 * Pure-function heuristic library that drafts a structured stimulus
 * (ticket / recipe / station_state / huddle_notes / menu_board / step_bank /
 * plain_text) from a teaching block's question + canonical solution.
 *
 * No LLM calls. Deterministic. Output is always one of:
 * - a `synthesized: true` result with a valid `challengeStimulusSchema` draft, or
 * - a `synthesized: false` result with `reason` explaining why no heuristic fit.
 *
 * Drafts include an `_authorReview` envelope so authors can audit before signing.
 */

import { challengeStimulusSchema } from '@topshelf/shared';
import type { z } from 'zod';

export type ChallengeStimulusDraft = z.infer<typeof challengeStimulusSchema>;

export type StimulusKind = ChallengeStimulusDraft['kind'];

export interface SynthesisSuccess {
  synthesized: true;
  kind: StimulusKind;
  heuristic: string;
  confidence: number;
  stimulus: ChallengeStimulusDraft;
}

export interface SynthesisSkip {
  synthesized: false;
  reason: string;
}

export type SynthesisResult = SynthesisSuccess | SynthesisSkip;

export interface SynthesisInput {
  blockId: string;
  concept?: string;
  content?: string;
  canonicalSolution?: string;
  /** Existing stimulus on the block; if present, skip synthesis. */
  hasExistingStimulus?: boolean;
}

interface KindMatcher {
  kind: StimulusKind;
  pattern: RegExp;
  specificity: number; // higher beats lower on ties
  draft: (text: string) => ChallengeStimulusDraft | null;
}

const RECIPE_UNITS = new Set([
  'cup',
  'cups',
  'tbsp',
  'tbsps',
  'tsp',
  'tsps',
  'oz',
  'g',
  'lb',
  'lbs',
  'kg',
  'ml',
  'l',
]);

const KIND_MATCHERS: readonly KindMatcher[] = [
  {
    kind: 'ticket',
    pattern:
      /\btable\s+[A-Za-z0-9-]+\b|\border\s+(?:#|number)|\bticket\b|\bserver\s+brought\b|\bguest(?:s)? ordered\b/i,
    specificity: 10,
    draft: draftTicket,
  },
  {
    kind: 'recipe',
    pattern: /\brecipe\b|\byield(?:s)?\b|\bingredient(?:s)?\b|\bprep time\b|\bcook time\b/i,
    specificity: 8,
    draft: draftRecipe,
  },
  {
    kind: 'huddle_notes',
    pattern:
      /\bhuddle\b|\bpre-?shift\b|\bmanager (?:said|noted)\b|\bshift notes?\b|\b86(?:ed)? items?\b/i,
    specificity: 7,
    draft: draftHuddleNotes,
  },
  {
    kind: 'station_state',
    pattern: /\bstation\b|\bgrill at\b|\bfryer (?:reading|at|empty)\b|\bprep area\b|\bexpediter\b/i,
    specificity: 6,
    draft: draftStationState,
  },
  {
    kind: 'menu_board',
    pattern: /\bmenu\b|\bspecial(?:s)?\b|\bfeatures? today\b|\btonight'?s\b|\bweekend brunch\b/i,
    specificity: 5,
    draft: draftMenuBoard,
  },
  {
    kind: 'step_bank',
    pattern: /\bsteps to\b|\border of operations\b|\bfirst (?:do|step)\b|\bfinally\b|\bsequence\b/i,
    specificity: 4,
    draft: draftStepBank,
  },
  {
    kind: 'image',
    pattern:
      /\bidentify (?:this|the photo|the image)\b|\bwhat is wrong with the (?:photo|image)\b|\bspot the hazard\b/i,
    specificity: 3,
    draft: () => null, // Image synthesis requires an explicit imageRef the author provides
  },
  {
    kind: 'plain_text',
    pattern: /^\s*\d+°[FC]?(?:\s|$)|\s\d+\s*(?:g|oz|lb|kg)\b|\btemperature log\b/i,
    specificity: 1,
    draft: draftPlainText,
  },
];

export function synthesizeStimulus(input: SynthesisInput): SynthesisResult {
  if (input.hasExistingStimulus === true) {
    return { synthesized: false, reason: 'block already has a stimulus' };
  }

  const text = [input.concept, input.content, input.canonicalSolution]
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .join('\n');

  if (text.trim().length === 0) {
    return { synthesized: false, reason: 'no question/concept/solution text to analyze' };
  }

  // Find matchers whose pattern hits, sort by specificity desc
  const hits = KIND_MATCHERS.filter((m) => m.pattern.test(text)).sort(
    (a, b) => b.specificity - a.specificity
  );

  for (const matcher of hits) {
    const draft = matcher.draft(text);
    if (!draft) continue;

    const parsed = challengeStimulusSchema.safeParse(draft);
    if (!parsed.success) continue;

    return {
      synthesized: true,
      kind: matcher.kind,
      heuristic: `keyword:${matcher.kind}`,
      confidence: matcher.specificity / 10,
      stimulus: parsed.data,
    };
  }

  return { synthesized: false, reason: 'no heuristic match' };
}

// ---------------------------------------------------------------------------
// Per-kind drafters — kept small and intentionally conservative.
// ---------------------------------------------------------------------------

function draftTicket(text: string): ChallengeStimulusDraft | null {
  const tableMatch = text.match(/\btable\s+([A-Za-z0-9-]+)/i);
  const table = tableMatch?.[1] ?? 'T1';

  // Pull items like "2 fajitas" or "3 x burger"
  const items: { quantity: number; name: string }[] = [];
  const segments = text.split(/[,.\n]/);
  for (const segment of segments) {
    const normalized = segment.trim().replace(/\s+/g, ' ');
    if (normalized.length === 0) {
      continue;
    }

    const parts = normalized.split(' ');
    const qtyToken = parts[0];
    if (qtyToken === undefined || !/^\d{1,2}$/.test(qtyToken)) {
      continue;
    }

    const qty = parseInt(qtyToken, 10);
    const nameStartIndex = parts[1]?.toLowerCase() === 'x' ? 2 : 1;
    const name = parts.slice(nameStartIndex).join(' ').trim();

    if (qty < 1 || qty > 99) continue;
    if (!isPlainItemName(name)) continue;
    if (/^(?:minutes?|seconds?|degrees?|guests?|server)$/i.test(name)) continue;
    items.push({ quantity: qty, name });
  }

  if (items.length === 0) {
    items.push({ quantity: 1, name: 'Item' });
  }

  return {
    kind: 'ticket',
    table,
    items: items.slice(0, 20),
  };
}

function draftRecipe(text: string): ChallengeStimulusDraft | null {
  const titleMatch = text.match(/\brecipe\s*[:\-]?\s*([A-Z][A-Za-z\s'-]{2,60})/i);
  const title = (titleMatch?.[1] ?? 'Untitled recipe').trim();

  // Pull bulleted ingredient lines
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const ingredients: { quantity: string; item: string }[] = [];
  for (const line of lines) {
    const normalized = line.replace(/^[-*•]?\s*/, '');
    const parts = normalized.split(/\s+/);
    const amount = parts[0];
    const unit = parts[1];
    const item = parts.slice(2).join(' ').trim();

    if (
      amount !== undefined &&
      isQuantityToken(amount) &&
      unit !== undefined &&
      RECIPE_UNITS.has(unit.toLowerCase()) &&
      item.length > 0
    ) {
      ingredients.push({ quantity: `${amount} ${unit}`, item });
    }
  }
  if (ingredients.length === 0) {
    ingredients.push({ quantity: '1', item: 'TODO: ingredient' });
  }

  const steps = extractOrderedSteps(text);

  return {
    kind: 'recipe',
    title: title.slice(0, 120),
    ingredients,
    steps: steps.length > 0 ? steps : ['TODO: first step'],
  };
}

function draftHuddleNotes(text: string): ChallengeStimulusDraft | null {
  const notes: { label: string; detail: string }[] = [];

  // "86 X" → label "86 X", detail "Out for service"
  const eightySix = text.match(/\b86\s+([A-Za-z][A-Za-z\s]{2,40})\b/i);
  const eightySixItem = eightySix?.[1];
  if (typeof eightySixItem === 'string' && eightySixItem.trim().length > 0) {
    notes.push({ label: `86 ${eightySixItem.trim()}`, detail: 'Out for service' });
  }

  // "Manager said X" → label "Manager note"
  const managerSaid = text.match(/manager (?:said|noted)\s+(.+?)(?:[.!]|$)/i);
  const managerNote = managerSaid?.[1];
  if (typeof managerNote === 'string' && managerNote.trim().length > 0) {
    notes.push({ label: 'Manager note', detail: managerNote.trim().slice(0, 200) });
  }

  if (notes.length === 0) {
    notes.push({ label: 'Pre-shift note', detail: 'Review menu changes' });
  }

  return {
    kind: 'huddle_notes',
    notes: notes.slice(0, 15),
  };
}

function draftStationState(text: string): ChallengeStimulusDraft | null {
  const observations: string[] = [];
  // "Grill at 400°F", "Fryer is empty", "Prep table clean"
  const obsRegex = /\b(grill|fryer|saute|cold station|prep table|oven|expediter)\b[^.!?]{0,80}/gi;
  let m: RegExpExecArray | null;
  while ((m = obsRegex.exec(text)) !== null && observations.length < 15) {
    const obs = m[0].trim().replace(/\s+/g, ' ');
    if (obs.length >= 3 && obs.length <= 200) {
      observations.push(obs);
    }
  }
  if (observations.length === 0) {
    observations.push('Station ready for service');
  }

  return {
    kind: 'station_state',
    observations: observations.slice(0, 15),
  };
}

function draftMenuBoard(text: string): ChallengeStimulusDraft | null {
  const features: string[] = [];
  // pull "Special: X" or "Feature: X"
  const specialMatches = text.matchAll(
    /\b(?:special|feature|tonight'?s)\s*[:\-]?\s*([^.!?\n]{3,200})/gi
  );
  for (const sm of specialMatches) {
    const feature = sm[1];
    if (typeof feature === 'string' && feature.trim().length > 0) {
      features.push(feature.trim());
    }
    if (features.length >= 10) break;
  }

  return {
    kind: 'menu_board',
    ...(features.length > 0 ? { features } : {}),
  };
}

function draftStepBank(text: string): ChallengeStimulusDraft | null {
  const steps = extractOrderedSteps(text);
  if (steps.length < 2) {
    return null;
  }
  return {
    kind: 'step_bank',
    steps: steps.slice(0, 15),
  };
}

function draftPlainText(text: string): ChallengeStimulusDraft | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l.length <= 200);
  if (lines.length === 0) return null;

  const looksTabular = lines.every((l) => /^[\d\s°FCxgozlb%./:,-]+$/i.test(l));

  return {
    kind: 'plain_text',
    ...(looksTabular ? { monospace: true } : {}),
    lines: lines.slice(0, 30),
  };
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

function isPlainItemName(value: string): boolean {
  if (value.length < 3 || value.length > 40) {
    return false;
  }

  const [firstChar] = value;
  if (firstChar === undefined || !isAsciiLetter(firstChar)) {
    return false;
  }

  for (const char of value) {
    if (isAsciiLetter(char) || char === ' ' || char === "'" || char === '-') {
      continue;
    }

    return false;
  }

  return true;
}

function isAsciiLetter(value: string): boolean {
  return /^[A-Za-z]$/.test(value);
}

function isQuantityToken(value: string): boolean {
  if (value.length === 0) {
    return false;
  }

  let separatorCount = 0;
  let digitCount = 0;

  for (const char of value) {
    if (char >= '0' && char <= '9') {
      digitCount += 1;
      continue;
    }

    if (char === '/' || char === '.') {
      separatorCount += 1;
      if (separatorCount > 1) {
        return false;
      }
      continue;
    }

    return false;
  }

  return digitCount > 0;
}

function extractOrderedSteps(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const numbered = lines
    .map((l) => l.match(/^(?:\d+[.)]|step\s+\d+:)\s*(.+)$/i))
    .filter((m): m is RegExpMatchArray => m !== null)
    .flatMap((m) => {
      const step = m[1];
      return typeof step === 'string' && step.trim().length > 0 ? [step.trim()] : [];
    });

  if (numbered.length >= 2) return numbered;

  // Split a single line on "first / then / next / finally"
  const flat = text.replace(/\n+/g, ' ');
  const sequenceParts = flat
    .split(/\b(?:first|step 1|then|next|second|step 2|finally|step 3)\b[: ,]*/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => part.replace(/[.!]+$/, '').trim())
    .filter((part) => part.length > 0)
    .map((part) => part.slice(0, 300));

  if (sequenceParts.length >= 2) {
    return sequenceParts.slice(0, 3);
  }

  return [];
}

export interface ReviewEnvelope {
  synthesizedAt: string;
  heuristic: string;
  needsReview: true;
  confidence: number;
}

export function wrapForReview(result: SynthesisSuccess): {
  stimulus: ChallengeStimulusDraft;
  _authorReview: ReviewEnvelope;
} {
  return {
    stimulus: result.stimulus,
    _authorReview: {
      synthesizedAt: new Date().toISOString(),
      heuristic: result.heuristic,
      needsReview: true,
      confidence: result.confidence,
    },
  };
}
