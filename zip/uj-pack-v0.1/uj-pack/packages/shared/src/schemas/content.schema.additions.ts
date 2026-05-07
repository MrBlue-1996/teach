/**
 * UJ-PACK-V0.1 schema additions for packages/shared/src/schemas/content.schema.ts
 *
 * SPLICE INSTRUCTIONS:
 * - Each section is wrapped in BEGIN/END markers.
 * - Atomic schemas go near the top, after your existing atomic schemas, BEFORE teachingBlockSchema.
 * - commonErrorSchema additions extend your EXISTING commonErrorSchema — add the two optional fields.
 * - teachingBlockSchema additions extend your EXISTING teachingBlockSchema — add the five optional fields.
 * - Do NOT add `locale` or `translationStatus` to manifest schema (deferred to v0.2).
 *
 * All schemas use .strict() to align with the existing pattern.
 */

import { z } from 'zod';

// === BEGIN UJ-PACK-V0.1 ATOMIC SCHEMAS ===

export const sourceDataStatusSchema = z.enum([
  'demo',
  'authorized',
  'requires-client-source',
  'deprecated',
]);
export type SourceDataStatus = z.infer<typeof sourceDataStatusSchema>;

export const retentionSchema = z
  .object({
    reassessAfterDays: z.number().int().min(1).max(365),
    decayHalfLifeDays: z.number().int().min(1).max(365),
  })
  .strict();
export type Retention = z.infer<typeof retentionSchema>;

export const trainerNotesSchema = z.string().min(1).max(4000);
export type TrainerNotes = z.infer<typeof trainerNotesSchema>;

export const recoveryPlaySchema = z.string().min(1).max(400);
export type RecoveryPlay = z.infer<typeof recoveryPlaySchema>;

export const realWorldImpactSchema = z.string().min(1).max(400);
export type RealWorldImpact = z.infer<typeof realWorldImpactSchema>;

export const contentLinksSchema = z
  .object({
    sourceModuleId: z.string().regex(/^MD6-[a-zA-Z0-9_-]+$/),
    fundamentalsTaught: z.array(z.string().regex(/^FT5-[a-zA-Z0-9_-]+$/)).readonly(),
    fundamentalsReinforced: z.array(z.string().regex(/^FT5-[a-zA-Z0-9_-]+$/)).readonly(),
    downtimeDecisions: z.array(z.string().regex(/^DT8-[a-zA-Z0-9_-]+$/)).readonly(),
    chaosEvents: z.array(z.string().regex(/^CE9-[a-zA-Z0-9_-]+$/)).readonly(),
    externalAssessmentId: z
      .string()
      .regex(/^AS7-[a-zA-Z0-9_-]+$/)
      .nullable(),
    ticketFlows: z.array(z.string().regex(/^RC4-[a-zA-Z0-9_-]+$/)).readonly(),
  })
  .strict();
export type ContentLinks = z.infer<typeof contentLinksSchema>;

export const deviceConstraintsSchema = z
  .object({
    maxResponseChars: z.number().int().min(200).max(50000),
  })
  .strict();
export type DeviceConstraints = z.infer<typeof deviceConstraintsSchema>;

export const triggerRuleSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('stuck_time'),
      thresholdSeconds: z.number().int().min(15).max(600),
    })
    .strict(),
  z
    .object({
      type: z.literal('repeated_errors'),
      threshold: z.number().int().min(1).max(10),
    })
    .strict(),
  z
    .object({
      type: z.literal('help_requested'),
      enabled: z.boolean(),
    })
    .strict(),
  z
    .object({
      type: z.literal('idle_drop'),
      thresholdDays: z.number().int().min(1).max(60),
    })
    .strict(),
  z
    .object({
      type: z.literal('frequency_decline'),
      baselineDays: z.number().int().min(7).max(90),
      declineRatio: z.number().min(0.1).max(0.9),
    })
    .strict(),
]);
export type TriggerRule = z.infer<typeof triggerRuleSchema>;

// === END UJ-PACK-V0.1 ATOMIC SCHEMAS ===

// === BEGIN UJ-PACK-V0.1 commonErrorSchema EXTENSION ===
//
// Add these two optional fields to your existing commonErrorSchema definition.
// Pseudocode for what your extended schema should look like:
//
// export const commonErrorSchema = z
//   .object({
//     // ...your existing fields (description, remediation, etc)...
//     recoveryPlay: recoveryPlaySchema.optional(),     // <-- ADD
//     realWorldImpact: realWorldImpactSchema.optional(), // <-- ADD
//   })
//   .strict();
//
// === END UJ-PACK-V0.1 commonErrorSchema EXTENSION ===

// === BEGIN UJ-PACK-V0.1 teachingBlockSchema EXTENSION ===
//
// Add these five optional fields to your existing teachingBlockSchema definition.
// Pseudocode for what your extended schema should look like:
//
// export const teachingBlockSchema = z
//   .object({
//     // ...your existing fields (id, title, mode, concept, hints, etc)...
//     contentLinks: contentLinksSchema.optional(),                       // <-- ADD
//     deviceConstraints: deviceConstraintsSchema.optional(),             // <-- ADD
//     triggerRules: z.array(triggerRuleSchema).readonly().optional(),    // <-- ADD
//     retention: retentionSchema.optional(),                             // <-- ADD
//     trainerNotes: trainerNotesSchema.optional(),                       // <-- ADD
//   })
//   .strict();
//
// === END UJ-PACK-V0.1 teachingBlockSchema EXTENSION ===

// === BEGIN UJ-PACK-V0.1 contentPackManifestSchema (NO CHANGE in v0.1) ===
//
// Do NOT add `locale` or `translationStatus`. Deferred to v0.2.
// Verify your existing .strict() still rejects unknown fields.
//
// === END UJ-PACK-V0.1 contentPackManifestSchema (NO CHANGE in v0.1) ===
