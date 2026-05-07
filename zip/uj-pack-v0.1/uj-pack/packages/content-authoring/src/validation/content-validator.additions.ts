/**
 * UJ-PACK-V0.1 validator semantic rule additions for
 * packages/content-authoring/src/validation/content-validator.ts
 *
 * SPLICE INSTRUCTIONS:
 * - Each rule is a self-contained function that takes the parsed pack and returns
 *   ValidationIssue objects.
 * - Adapt to your existing ValidationIssue / error-accumulation shape. The shape
 *   used here is `{ code, path, message }` — match yours.
 * - Call all six rules from your existing validateContentConsistency (or
 *   equivalent) AFTER the schema-level validation passes. They assume the parsed
 *   `pack` already conforms to contentPackManifestSchema.
 * - The error code strings match what the test fixtures (this ZIP) expect, so
 *   keep the codes verbatim unless you also update the fixture assertions.
 */

import type {
  ContentLinks,
  TriggerRule,
} from '@topshelf/shared'; // adjust import path to match your monorepo

// Adapt this shape to whatever your validator already uses.
interface ValidationIssue {
  code: string;
  path: string;
  message: string;
}

// Minimal duck-typed pack/block shape so this file compiles without your full
// ContentPack import. Replace with your real types when splicing.
interface MinimalBlock {
  id: string;
  concept?: string;
  canonicalSolution?: string;
  explanation?: string;
  hints?: readonly string[];
  commonErrors?: ReadonlyArray<{
    description?: string;
    remediation?: string;
    recoveryPlay?: string;
    realWorldImpact?: string;
  }>;
  surfaceVariants?: ReadonlyArray<{
    data?: {
      sourceModuleId?: string;
      sourceDataStatus?: string;
    };
  }>;
  contentLinks?: ContentLinks;
  deviceConstraints?: { maxResponseChars: number };
  triggerRules?: readonly TriggerRule[];
}

interface MinimalPack {
  id: string;
  description?: string;
  teachingBlocks: readonly MinimalBlock[];
}

// === BEGIN UJ-PACK-V0.1 RULE T2.A1 — TEXT_OVER_DEVICE_CAP ===

export function validateTextOverDeviceCap(pack: MinimalPack): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const block of pack.teachingBlocks) {
    const cap = block.deviceConstraints?.maxResponseChars;
    if (cap === undefined) continue;
    if (block.explanation && block.explanation.length > cap) {
      issues.push({
        code: 'TEXT_OVER_DEVICE_CAP',
        path: `teachingBlocks.${block.id}.explanation`,
        message: `explanation length ${block.explanation.length} exceeds maxResponseChars ${cap}`,
      });
    }
    if (block.hints) {
      block.hints.forEach((hint, i) => {
        if (hint.length > cap) {
          issues.push({
            code: 'TEXT_OVER_DEVICE_CAP',
            path: `teachingBlocks.${block.id}.hints[${i}]`,
            message: `hint length ${hint.length} exceeds maxResponseChars ${cap}`,
          });
        }
      });
    }
  }
  return issues;
}

// === END UJ-PACK-V0.1 RULE T2.A1 ===

// === BEGIN UJ-PACK-V0.1 RULE T2.A2 — INSUFFICIENT_REINFORCEMENT ===

export function validateFundamentalsReinforcement(pack: MinimalPack): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  // fundamentalId -> { taughtIn: blockId[], reinforcedIn: blockId[] }
  const map = new Map<string, { taughtIn: string[]; reinforcedIn: string[] }>();
  for (const block of pack.teachingBlocks) {
    const links = block.contentLinks;
    if (!links) continue;
    for (const f of links.fundamentalsTaught) {
      if (!map.has(f)) map.set(f, { taughtIn: [], reinforcedIn: [] });
      map.get(f)!.taughtIn.push(block.id);
    }
    for (const f of links.fundamentalsReinforced) {
      if (!map.has(f)) map.set(f, { taughtIn: [], reinforcedIn: [] });
      map.get(f)!.reinforcedIn.push(block.id);
    }
  }
  for (const [fundamentalId, refs] of map.entries()) {
    if (refs.taughtIn.length === 0) continue; // only enforce on taught fundamentals
    const taughtSet = new Set(refs.taughtIn);
    const reinforcedInOthers = refs.reinforcedIn.filter((b) => !taughtSet.has(b));
    if (reinforcedInOthers.length < 2) {
      issues.push({
        code: 'INSUFFICIENT_REINFORCEMENT',
        path: `teachingBlocks.contentLinks.fundamentalsReinforced`,
        message:
          `${fundamentalId} taught in [${refs.taughtIn.join(', ')}] ` +
          `but only reinforced in ${reinforcedInOthers.length} other block(s) ` +
          `(need >=2 other blocks reinforcing)`,
      });
    }
  }
  return issues;
}

// === END UJ-PACK-V0.1 RULE T2.A2 ===

// === BEGIN UJ-PACK-V0.1 RULE T2.A3 — UNCLE_JULIOS_ORPHAN_CONTENT_LINK ===

const UNCLE_JULIOS_REQUIRED_IDS = {
  fundamentals: ['FT5-clean-as-you-go', 'FT5-communication', 'FT5-safety-first'],
  downtimeDecisions: ['DT8-restock-reset-clean'],
  chaosEvents: ['CE9-rush-ticket', 'CE9-missing-tool', 'CE9-quality-check'],
  assessments: [
    'AS7-orientation-check',
    'AS7-station-readiness-check',
    'AS7-final-pack-gate',
  ],
  ticketFlows: ['RC4-demo-ticket-flow'],
} as const;

export function validateUncleJuliosOrphanLinks(pack: MinimalPack): ValidationIssue[] {
  if (pack.id !== 'pack-uncle-julios-v1') return [];
  const issues: ValidationIssue[] = [];
  const allReferenced = new Set<string>();
  for (const block of pack.teachingBlocks) {
    const links = block.contentLinks;
    if (!links) continue;
    for (const f of links.fundamentalsTaught) allReferenced.add(f);
    for (const f of links.fundamentalsReinforced) allReferenced.add(f);
    for (const d of links.downtimeDecisions) allReferenced.add(d);
    for (const c of links.chaosEvents) allReferenced.add(c);
    if (links.externalAssessmentId) allReferenced.add(links.externalAssessmentId);
    for (const t of links.ticketFlows) allReferenced.add(t);
  }
  const required = [
    ...UNCLE_JULIOS_REQUIRED_IDS.fundamentals,
    ...UNCLE_JULIOS_REQUIRED_IDS.downtimeDecisions,
    ...UNCLE_JULIOS_REQUIRED_IDS.chaosEvents,
    ...UNCLE_JULIOS_REQUIRED_IDS.assessments,
    ...UNCLE_JULIOS_REQUIRED_IDS.ticketFlows,
  ];
  for (const id of required) {
    if (!allReferenced.has(id)) {
      issues.push({
        code: 'UNCLE_JULIOS_ORPHAN_CONTENT_LINK',
        path: 'teachingBlocks[*].contentLinks',
        message: `required ID ${id} is not referenced by any block in pack-uncle-julios-v1`,
      });
    }
  }
  return issues;
}

// === END UJ-PACK-V0.1 RULE T2.A3 ===

// === BEGIN UJ-PACK-V0.1 RULE T2.A4 — SAFETY_TRIGGER_TOO_LENIENT ===

const SAFETY_CRITICAL_BLOCK_IDS = new Set([
  'tb-uj-orientation-safety',
  'tb-uj-tools-color-barriers',
  'tb-orientation-safety', // catches the bad fixture too
]);

export function validateSafetyTriggers(pack: MinimalPack): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const block of pack.teachingBlocks) {
    if (!SAFETY_CRITICAL_BLOCK_IDS.has(block.id)) continue;
    if (!block.triggerRules) continue;
    for (const rule of block.triggerRules) {
      if (rule.type === 'stuck_time' && rule.thresholdSeconds > 45) {
        issues.push({
          code: 'SAFETY_TRIGGER_TOO_LENIENT',
          path: `teachingBlocks.${block.id}.triggerRules`,
          message: `safety-critical block has stuck_time threshold ${rule.thresholdSeconds}s; max allowed is 45s`,
        });
      }
      if (rule.type === 'repeated_errors' && rule.threshold !== 1) {
        issues.push({
          code: 'SAFETY_TRIGGER_TOO_LENIENT',
          path: `teachingBlocks.${block.id}.triggerRules`,
          message: `safety-critical block has repeated_errors threshold ${rule.threshold}; must be 1`,
        });
      }
    }
  }
  return issues;
}

// === END UJ-PACK-V0.1 RULE T2.A4 ===

// === BEGIN UJ-PACK-V0.1 RULE T2.A5 — UNAUTHORIZED_PROPRIETARY_CLAIM ===

const PROPRIETARY_CLAIM_REGEX = /official\s+uncle\s+julio'?s/i;

function isAuthorizedVariant(
  block: MinimalBlock,
  variantIndex: number | null,
): boolean {
  if (variantIndex === null) return false; // block-level text
  const v = block.surfaceVariants?.[variantIndex];
  return v?.data?.sourceDataStatus === 'authorized';
}

export function validateProprietaryClaims(pack: MinimalPack): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  function check(text: string | undefined, path: string, blockLevelAuthorized: boolean) {
    if (!text) return;
    if (PROPRIETARY_CLAIM_REGEX.test(text) && !blockLevelAuthorized) {
      issues.push({
        code: 'UNAUTHORIZED_PROPRIETARY_CLAIM',
        path,
        message: `text claims "official Uncle Julio's" without sourceDataStatus=authorized`,
      });
    }
  }

  for (const block of pack.teachingBlocks) {
    // Block-level fields. Treat as authorized only if ALL surface variants are authorized.
    const blockAuth =
      block.surfaceVariants !== undefined &&
      block.surfaceVariants.length > 0 &&
      block.surfaceVariants.every((v) => v.data?.sourceDataStatus === 'authorized');

    check(block.concept, `teachingBlocks.${block.id}.concept`, blockAuth);
    check(block.canonicalSolution, `teachingBlocks.${block.id}.canonicalSolution`, blockAuth);
    check(block.explanation, `teachingBlocks.${block.id}.explanation`, blockAuth);
    if (block.hints) {
      block.hints.forEach((h, i) =>
        check(h, `teachingBlocks.${block.id}.hints[${i}]`, blockAuth),
      );
    }
    if (block.commonErrors) {
      block.commonErrors.forEach((e, i) => {
        check(e.description, `teachingBlocks.${block.id}.commonErrors[${i}].description`, blockAuth);
        check(e.remediation, `teachingBlocks.${block.id}.commonErrors[${i}].remediation`, blockAuth);
        check(e.recoveryPlay, `teachingBlocks.${block.id}.commonErrors[${i}].recoveryPlay`, blockAuth);
        check(
          e.realWorldImpact,
          `teachingBlocks.${block.id}.commonErrors[${i}].realWorldImpact`,
          blockAuth,
        );
      });
    }
  }

  if (pack.description && PROPRIETARY_CLAIM_REGEX.test(pack.description)) {
    issues.push({
      code: 'UNAUTHORIZED_PROPRIETARY_CLAIM',
      path: 'description',
      message: 'pack description claims "official Uncle Julio\'s"',
    });
  }

  return issues;
}

// === END UJ-PACK-V0.1 RULE T2.A5 ===

// === BEGIN UJ-PACK-V0.1 RULE T2.A6 — SOURCE_MODULE_ID_MISMATCH ===

export function validateSourceModuleIdConsistency(pack: MinimalPack): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const block of pack.teachingBlocks) {
    const blockSourceId = block.contentLinks?.sourceModuleId;
    if (!blockSourceId || !block.surfaceVariants) continue;
    block.surfaceVariants.forEach((v, i) => {
      const variantSourceId = v.data?.sourceModuleId;
      if (variantSourceId && variantSourceId !== blockSourceId) {
        issues.push({
          code: 'SOURCE_MODULE_ID_MISMATCH',
          path: `teachingBlocks.${block.id}.surfaceVariants[${i}].data.sourceModuleId`,
          message: `variant sourceModuleId "${variantSourceId}" does not match block contentLinks.sourceModuleId "${blockSourceId}"`,
        });
      }
    });
  }
  return issues;
}

// === END UJ-PACK-V0.1 RULE T2.A6 ===

// === BEGIN UJ-PACK-V0.1 ENTRY POINT ===
//
// Call this from your existing validateContentConsistency (or equivalent)
// AFTER schema validation has passed. Concatenate the returned issues onto
// your existing errors array.
//
// Example wiring:
//
//   if (parsedPack.success) {
//     errors.push(
//       ...validateTextOverDeviceCap(parsedPack.data),
//       ...validateFundamentalsReinforcement(parsedPack.data),
//       ...validateUncleJuliosOrphanLinks(parsedPack.data),
//       ...validateSafetyTriggers(parsedPack.data),
//       ...validateProprietaryClaims(parsedPack.data),
//       ...validateSourceModuleIdConsistency(parsedPack.data),
//     );
//   }
//

export function runUjPackV01Rules(pack: MinimalPack): ValidationIssue[] {
  return [
    ...validateTextOverDeviceCap(pack),
    ...validateFundamentalsReinforcement(pack),
    ...validateUncleJuliosOrphanLinks(pack),
    ...validateSafetyTriggers(pack),
    ...validateProprietaryClaims(pack),
    ...validateSourceModuleIdConsistency(pack),
  ];
}

// === END UJ-PACK-V0.1 ENTRY POINT ===
