/**
 * Device Profile Schemas (TS-DEVICE-007)
 *
 * Zod schemas for device capability validation.
 */

import { z } from 'zod';

/** Device tier */
export const deviceTierSchema = z.enum(['baseline', 'enhanced', 'full']);

/** Network quality */
export const networkQualitySchema = z.enum(['offline', 'slow', 'moderate', 'fast']);

/** Battery state */
export const batteryStateSchema = z
  .object({
    charging: z.boolean(),
    level: z.number().min(0).max(1),
    dischargingTime: z.number().nullable(),
  })
  .strict();

/** WebGL capabilities */
export const webGLCapabilitiesSchema = z
  .object({
    available: z.boolean(),
    version: z.union([z.literal(1), z.literal(2), z.null()]),
    renderer: z.string().nullable(),
  })
  .strict();

/** WebGPU capabilities */
export const webGPUCapabilitiesSchema = z
  .object({
    available: z.boolean(),
    adapterInfo: z.string().nullable(),
  })
  .strict();

/** WASM capabilities */
export const wasmCapabilitiesSchema = z
  .object({
    available: z.boolean(),
    simd: z.boolean(),
    threads: z.boolean(),
  })
  .strict();

/** Network information */
export const networkInfoSchema = z
  .object({
    effectiveType: z.enum(['2g', '3g', '4g', 'slow-2g']).nullable(),
    downlink: z.number().nullable(),
    rtt: z.number().nullable(),
    saveData: z.boolean(),
  })
  .strict();

/** Storage estimate */
export const storageEstimateSchema = z
  .object({
    quota: z.number().nullable(),
    usage: z.number().nullable(),
  })
  .strict();

/** Device capabilities */
export const deviceCapabilitiesSchema = z
  .object({
    hardwareConcurrency: z.number().int().min(1).max(256),
    deviceMemory: z.number().min(0.25).max(256).nullable(),
    webGL: webGLCapabilitiesSchema,
    webGPU: webGPUCapabilitiesSchema,
    wasm: wasmCapabilitiesSchema,
    network: networkInfoSchema,
    battery: batteryStateSchema.nullable(),
    storage: storageEstimateSchema,
    serviceWorker: z.boolean(),
    indexedDB: z.boolean(),
  })
  .strict();

/** Device features */
export const deviceFeaturesSchema = z
  .object({
    baselineUI: z.boolean(),
    deterministicFormatter: z.boolean(),
    smallPacks: z.boolean(),
    wasmInference: z.boolean(),
    localEmbeddings: z.boolean(),
    webGPU: z.boolean(),
    localLLM: z.boolean(),
    offline: z.boolean(),
    backgroundSync: z.boolean(),
  })
  .strict();

/** Device profile */
export const deviceProfileSchema = z
  .object({
    deviceId: z.string().min(1).max(64),
    tier: deviceTierSchema,
    capabilities: deviceCapabilitiesSchema,
    networkQuality: networkQualitySchema,
    availableFeatures: deviceFeaturesSchema,
    probedAt: z.string().datetime(),
  })
  .strict();

/** Cache strategy */
export const cacheStrategySchema = z.enum([
  'cache-first',
  'network-first',
  'stale-while-revalidate',
  'network-only',
  'cache-only',
]);

/** Cache configuration */
export const cacheConfigSchema = z
  .object({
    resourceType: z.enum(['ui', 'content-pack', 'event-buffer', 'learner-state', 'static-asset']),
    strategy: cacheStrategySchema,
    maxAgeSeconds: z.number().int().min(0).max(31536000), // Max 1 year
    maxEntries: z.number().int().min(1).max(10000),
  })
  .strict();

/** Performance budget */
export const performanceBudgetSchema = z
  .object({
    ttfi: z.number().int().min(0).max(30000),
    lcp: z.number().int().min(0).max(30000),
    fid: z.number().int().min(0).max(10000),
    cls: z.number().min(0).max(1),
    tbt: z.number().int().min(0).max(60000),
  })
  .strict();

/** Tiered performance budgets */
export const tieredPerformanceBudgetsSchema = z
  .object({
    baseline: performanceBudgetSchema,
    enhanced: performanceBudgetSchema,
    full: performanceBudgetSchema,
  })
  .strict();

// Type exports
export type DeviceTierSchema = z.infer<typeof deviceTierSchema>;
export type NetworkQualitySchema = z.infer<typeof networkQualitySchema>;
export type DeviceCapabilitiesSchema = z.infer<typeof deviceCapabilitiesSchema>;
export type DeviceProfileSchema = z.infer<typeof deviceProfileSchema>;
export type CacheConfigSchema = z.infer<typeof cacheConfigSchema>;
export type PerformanceBudgetSchema = z.infer<typeof performanceBudgetSchema>;
