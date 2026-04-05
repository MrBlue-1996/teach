/**
 * TopShelf Device Schema - Comprehensive Test Suite
 *
 * Tests for device capability validation including device profiles,
 * network info, cache configuration, and performance budgets.
 */

import { describe, it, expect } from 'vitest';
import {
  deviceTierSchema,
  networkQualitySchema,
  batteryStateSchema,
  webGLCapabilitiesSchema,
  webGPUCapabilitiesSchema,
  wasmCapabilitiesSchema,
  networkInfoSchema,
  storageEstimateSchema,
  deviceCapabilitiesSchema,
  deviceFeaturesSchema,
  deviceProfileSchema,
  cacheStrategySchema,
  cacheConfigSchema,
  performanceBudgetSchema,
  tieredPerformanceBudgetsSchema,
} from './device.schema.js';

// =============================================================================
// ENUM SCHEMAS
// =============================================================================

describe('deviceTierSchema', () => {
  it('should accept all valid device tiers', () => {
    expect(deviceTierSchema.safeParse('baseline').success).toBe(true);
    expect(deviceTierSchema.safeParse('enhanced').success).toBe(true);
    expect(deviceTierSchema.safeParse('full').success).toBe(true);
  });

  it('should reject invalid device tiers', () => {
    expect(deviceTierSchema.safeParse('premium').success).toBe(false);
    expect(deviceTierSchema.safeParse('').success).toBe(false);
    expect(deviceTierSchema.safeParse('BASELINE').success).toBe(false);
    expect(deviceTierSchema.safeParse(null).success).toBe(false);
    expect(deviceTierSchema.safeParse(undefined).success).toBe(false);
  });
});

describe('networkQualitySchema', () => {
  it('should accept all valid network qualities', () => {
    expect(networkQualitySchema.safeParse('offline').success).toBe(true);
    expect(networkQualitySchema.safeParse('slow').success).toBe(true);
    expect(networkQualitySchema.safeParse('moderate').success).toBe(true);
    expect(networkQualitySchema.safeParse('fast').success).toBe(true);
  });

  it('should reject invalid network qualities', () => {
    expect(networkQualitySchema.safeParse('very-fast').success).toBe(false);
    expect(networkQualitySchema.safeParse('').success).toBe(false);
    expect(networkQualitySchema.safeParse('OFFLINE').success).toBe(false);
  });
});

describe('cacheStrategySchema', () => {
  it('should accept all valid cache strategies', () => {
    expect(cacheStrategySchema.safeParse('cache-first').success).toBe(true);
    expect(cacheStrategySchema.safeParse('network-first').success).toBe(true);
    expect(cacheStrategySchema.safeParse('stale-while-revalidate').success).toBe(true);
    expect(cacheStrategySchema.safeParse('network-only').success).toBe(true);
    expect(cacheStrategySchema.safeParse('cache-only').success).toBe(true);
  });

  it('should reject invalid cache strategies', () => {
    expect(cacheStrategySchema.safeParse('memory-first').success).toBe(false);
    expect(cacheStrategySchema.safeParse('').success).toBe(false);
  });
});

// =============================================================================
// BATTERY STATE
// =============================================================================

describe('batteryStateSchema', () => {
  it('should accept a valid battery state', () => {
    const state = { charging: true, level: 0.75, dischargingTime: 3600 };
    expect(batteryStateSchema.safeParse(state).success).toBe(true);
  });

  it('should accept battery state with null dischargingTime', () => {
    const state = { charging: true, level: 1.0, dischargingTime: null };
    expect(batteryStateSchema.safeParse(state).success).toBe(true);
  });

  it('should accept battery level at boundary values', () => {
    expect(
      batteryStateSchema.safeParse({ charging: false, level: 0, dischargingTime: null }).success
    ).toBe(true);
    expect(
      batteryStateSchema.safeParse({ charging: false, level: 1, dischargingTime: null }).success
    ).toBe(true);
  });

  it('should reject battery level below 0', () => {
    const state = { charging: false, level: -0.1, dischargingTime: null };
    expect(batteryStateSchema.safeParse(state).success).toBe(false);
  });

  it('should reject battery level above 1', () => {
    const state = { charging: false, level: 1.1, dischargingTime: null };
    expect(batteryStateSchema.safeParse(state).success).toBe(false);
  });

  it('should reject extra properties (strict mode)', () => {
    const state = { charging: true, level: 0.5, dischargingTime: null, extraProp: 'invalid' };
    expect(batteryStateSchema.safeParse(state).success).toBe(false);
  });

  it('should reject missing required fields', () => {
    expect(batteryStateSchema.safeParse({ charging: true, level: 0.5 }).success).toBe(false);
    expect(batteryStateSchema.safeParse({ charging: true, dischargingTime: null }).success).toBe(
      false
    );
    expect(batteryStateSchema.safeParse({ level: 0.5, dischargingTime: null }).success).toBe(false);
  });
});

// =============================================================================
// WEBGL CAPABILITIES
// =============================================================================

describe('webGLCapabilitiesSchema', () => {
  it('should accept valid WebGL capabilities with version 1', () => {
    const caps = { available: true, version: 1, renderer: 'ANGLE (AMD)' };
    expect(webGLCapabilitiesSchema.safeParse(caps).success).toBe(true);
  });

  it('should accept valid WebGL capabilities with version 2', () => {
    const caps = { available: true, version: 2, renderer: 'NVIDIA GeForce' };
    expect(webGLCapabilitiesSchema.safeParse(caps).success).toBe(true);
  });

  it('should accept WebGL not available', () => {
    const caps = { available: false, version: null, renderer: null };
    expect(webGLCapabilitiesSchema.safeParse(caps).success).toBe(true);
  });

  it('should reject invalid WebGL version', () => {
    const caps = { available: true, version: 3, renderer: 'Test' };
    expect(webGLCapabilitiesSchema.safeParse(caps).success).toBe(false);
  });

  it('should reject extra properties (strict mode)', () => {
    const caps = { available: true, version: 1, renderer: 'Test', extraField: true };
    expect(webGLCapabilitiesSchema.safeParse(caps).success).toBe(false);
  });
});

// =============================================================================
// WEBGPU CAPABILITIES
// =============================================================================

describe('webGPUCapabilitiesSchema', () => {
  it('should accept valid WebGPU capabilities', () => {
    const caps = { available: true, adapterInfo: 'Intel UHD Graphics' };
    expect(webGPUCapabilitiesSchema.safeParse(caps).success).toBe(true);
  });

  it('should accept WebGPU not available', () => {
    const caps = { available: false, adapterInfo: null };
    expect(webGPUCapabilitiesSchema.safeParse(caps).success).toBe(true);
  });

  it('should reject extra properties (strict mode)', () => {
    const caps = { available: true, adapterInfo: 'Test', extraField: 'invalid' };
    expect(webGPUCapabilitiesSchema.safeParse(caps).success).toBe(false);
  });

  it('should reject missing fields', () => {
    expect(webGPUCapabilitiesSchema.safeParse({ available: true }).success).toBe(false);
  });
});

// =============================================================================
// WASM CAPABILITIES
// =============================================================================

describe('wasmCapabilitiesSchema', () => {
  it('should accept valid WASM capabilities with all features', () => {
    const caps = { available: true, simd: true, threads: true };
    expect(wasmCapabilitiesSchema.safeParse(caps).success).toBe(true);
  });

  it('should accept WASM not available', () => {
    const caps = { available: false, simd: false, threads: false };
    expect(wasmCapabilitiesSchema.safeParse(caps).success).toBe(true);
  });

  it('should accept WASM with partial features', () => {
    const caps = { available: true, simd: true, threads: false };
    expect(wasmCapabilitiesSchema.safeParse(caps).success).toBe(true);
  });

  it('should reject extra properties (strict mode)', () => {
    const caps = { available: true, simd: true, threads: true, exceptions: true };
    expect(wasmCapabilitiesSchema.safeParse(caps).success).toBe(false);
  });

  it('should reject missing required fields', () => {
    expect(wasmCapabilitiesSchema.safeParse({ available: true, simd: true }).success).toBe(false);
  });
});

// =============================================================================
// NETWORK INFO
// =============================================================================

describe('networkInfoSchema', () => {
  it('should accept valid network info', () => {
    const info = { effectiveType: '4g', downlink: 10.5, rtt: 50, saveData: false };
    expect(networkInfoSchema.safeParse(info).success).toBe(true);
  });

  it('should accept all effective types', () => {
    expect(
      networkInfoSchema.safeParse({
        effectiveType: '2g',
        downlink: null,
        rtt: null,
        saveData: false,
      }).success
    ).toBe(true);
    expect(
      networkInfoSchema.safeParse({
        effectiveType: '3g',
        downlink: null,
        rtt: null,
        saveData: false,
      }).success
    ).toBe(true);
    expect(
      networkInfoSchema.safeParse({
        effectiveType: '4g',
        downlink: null,
        rtt: null,
        saveData: false,
      }).success
    ).toBe(true);
    expect(
      networkInfoSchema.safeParse({
        effectiveType: 'slow-2g',
        downlink: null,
        rtt: null,
        saveData: false,
      }).success
    ).toBe(true);
  });

  it('should accept null values for optional metrics', () => {
    const info = { effectiveType: null, downlink: null, rtt: null, saveData: true };
    expect(networkInfoSchema.safeParse(info).success).toBe(true);
  });

  it('should reject invalid effective type', () => {
    const info = { effectiveType: '5g', downlink: 100, rtt: 10, saveData: false };
    expect(networkInfoSchema.safeParse(info).success).toBe(false);
  });

  it('should reject extra properties (strict mode)', () => {
    const info = { effectiveType: '4g', downlink: 10, rtt: 50, saveData: false, quality: 'good' };
    expect(networkInfoSchema.safeParse(info).success).toBe(false);
  });
});

// =============================================================================
// STORAGE ESTIMATE
// =============================================================================

describe('storageEstimateSchema', () => {
  it('should accept valid storage estimate', () => {
    const estimate = { quota: 1073741824, usage: 536870912 };
    expect(storageEstimateSchema.safeParse(estimate).success).toBe(true);
  });

  it('should accept null values', () => {
    const estimate = { quota: null, usage: null };
    expect(storageEstimateSchema.safeParse(estimate).success).toBe(true);
  });

  it('should accept mixed null and number values', () => {
    expect(storageEstimateSchema.safeParse({ quota: 1000000, usage: null }).success).toBe(true);
    expect(storageEstimateSchema.safeParse({ quota: null, usage: 500000 }).success).toBe(true);
  });

  it('should reject extra properties (strict mode)', () => {
    const estimate = { quota: 1000000, usage: 500000, available: 500000 };
    expect(storageEstimateSchema.safeParse(estimate).success).toBe(false);
  });
});

// =============================================================================
// DEVICE CAPABILITIES
// =============================================================================

describe('deviceCapabilitiesSchema', () => {
  function createValidCapabilities() {
    return {
      hardwareConcurrency: 8,
      deviceMemory: 8,
      webGL: { available: true, version: 2, renderer: 'NVIDIA' },
      webGPU: { available: false, adapterInfo: null },
      wasm: { available: true, simd: true, threads: true },
      network: { effectiveType: '4g', downlink: 10, rtt: 50, saveData: false },
      battery: { charging: true, level: 0.8, dischargingTime: null },
      storage: { quota: 1073741824, usage: 100000 },
      serviceWorker: true,
      indexedDB: true,
    };
  }

  it('should accept valid device capabilities', () => {
    const caps = createValidCapabilities();
    expect(deviceCapabilitiesSchema.safeParse(caps).success).toBe(true);
  });

  it('should accept null battery', () => {
    const caps = { ...createValidCapabilities(), battery: null };
    expect(deviceCapabilitiesSchema.safeParse(caps).success).toBe(true);
  });

  it('should accept null deviceMemory', () => {
    const caps = { ...createValidCapabilities(), deviceMemory: null };
    expect(deviceCapabilitiesSchema.safeParse(caps).success).toBe(true);
  });

  it('should accept boundary values for hardwareConcurrency', () => {
    expect(
      deviceCapabilitiesSchema.safeParse({ ...createValidCapabilities(), hardwareConcurrency: 1 })
        .success
    ).toBe(true);
    expect(
      deviceCapabilitiesSchema.safeParse({ ...createValidCapabilities(), hardwareConcurrency: 256 })
        .success
    ).toBe(true);
  });

  it('should reject hardwareConcurrency below minimum', () => {
    const caps = { ...createValidCapabilities(), hardwareConcurrency: 0 };
    expect(deviceCapabilitiesSchema.safeParse(caps).success).toBe(false);
  });

  it('should reject hardwareConcurrency above maximum', () => {
    const caps = { ...createValidCapabilities(), hardwareConcurrency: 257 };
    expect(deviceCapabilitiesSchema.safeParse(caps).success).toBe(false);
  });

  it('should reject non-integer hardwareConcurrency', () => {
    const caps = { ...createValidCapabilities(), hardwareConcurrency: 4.5 };
    expect(deviceCapabilitiesSchema.safeParse(caps).success).toBe(false);
  });

  it('should accept deviceMemory at boundary values', () => {
    expect(
      deviceCapabilitiesSchema.safeParse({ ...createValidCapabilities(), deviceMemory: 0.25 })
        .success
    ).toBe(true);
    expect(
      deviceCapabilitiesSchema.safeParse({ ...createValidCapabilities(), deviceMemory: 256 })
        .success
    ).toBe(true);
  });

  it('should reject deviceMemory below minimum', () => {
    const caps = { ...createValidCapabilities(), deviceMemory: 0.1 };
    expect(deviceCapabilitiesSchema.safeParse(caps).success).toBe(false);
  });

  it('should reject deviceMemory above maximum', () => {
    const caps = { ...createValidCapabilities(), deviceMemory: 300 };
    expect(deviceCapabilitiesSchema.safeParse(caps).success).toBe(false);
  });

  it('should reject extra properties (strict mode)', () => {
    const caps = { ...createValidCapabilities(), extraField: 'invalid' };
    expect(deviceCapabilitiesSchema.safeParse(caps).success).toBe(false);
  });
});

// =============================================================================
// DEVICE FEATURES
// =============================================================================

describe('deviceFeaturesSchema', () => {
  function createValidFeatures() {
    return {
      baselineUI: true,
      deterministicFormatter: true,
      smallPacks: true,
      wasmInference: true,
      localEmbeddings: false,
      webGPU: false,
      localLLM: false,
      offline: true,
      backgroundSync: true,
    };
  }

  it('should accept valid device features', () => {
    const features = createValidFeatures();
    expect(deviceFeaturesSchema.safeParse(features).success).toBe(true);
  });

  it('should accept all features disabled', () => {
    const features = {
      baselineUI: false,
      deterministicFormatter: false,
      smallPacks: false,
      wasmInference: false,
      localEmbeddings: false,
      webGPU: false,
      localLLM: false,
      offline: false,
      backgroundSync: false,
    };
    expect(deviceFeaturesSchema.safeParse(features).success).toBe(true);
  });

  it('should accept all features enabled', () => {
    const features = {
      baselineUI: true,
      deterministicFormatter: true,
      smallPacks: true,
      wasmInference: true,
      localEmbeddings: true,
      webGPU: true,
      localLLM: true,
      offline: true,
      backgroundSync: true,
    };
    expect(deviceFeaturesSchema.safeParse(features).success).toBe(true);
  });

  it('should reject extra properties (strict mode)', () => {
    const features = { ...createValidFeatures(), newFeature: true };
    expect(deviceFeaturesSchema.safeParse(features).success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const { baselineUI, ...incomplete } = createValidFeatures();
    expect(deviceFeaturesSchema.safeParse(incomplete).success).toBe(false);
  });
});

// =============================================================================
// DEVICE PROFILE
// =============================================================================

describe('deviceProfileSchema', () => {
  function createValidProfile() {
    return {
      deviceId: 'device-abc123',
      tier: 'enhanced',
      capabilities: {
        hardwareConcurrency: 8,
        deviceMemory: 8,
        webGL: { available: true, version: 2, renderer: 'NVIDIA' },
        webGPU: { available: false, adapterInfo: null },
        wasm: { available: true, simd: true, threads: true },
        network: { effectiveType: '4g', downlink: 10, rtt: 50, saveData: false },
        battery: null,
        storage: { quota: 1073741824, usage: 100000 },
        serviceWorker: true,
        indexedDB: true,
      },
      networkQuality: 'fast',
      availableFeatures: {
        baselineUI: true,
        deterministicFormatter: true,
        smallPacks: true,
        wasmInference: true,
        localEmbeddings: false,
        webGPU: false,
        localLLM: false,
        offline: true,
        backgroundSync: true,
      },
      probedAt: '2026-03-25T12:00:00Z',
    };
  }

  it('should accept a valid device profile', () => {
    const profile = createValidProfile();
    expect(deviceProfileSchema.safeParse(profile).success).toBe(true);
  });

  it('should accept all device tiers', () => {
    expect(
      deviceProfileSchema.safeParse({ ...createValidProfile(), tier: 'baseline' }).success
    ).toBe(true);
    expect(
      deviceProfileSchema.safeParse({ ...createValidProfile(), tier: 'enhanced' }).success
    ).toBe(true);
    expect(deviceProfileSchema.safeParse({ ...createValidProfile(), tier: 'full' }).success).toBe(
      true
    );
  });

  it('should accept all network qualities', () => {
    expect(
      deviceProfileSchema.safeParse({ ...createValidProfile(), networkQuality: 'offline' }).success
    ).toBe(true);
    expect(
      deviceProfileSchema.safeParse({ ...createValidProfile(), networkQuality: 'slow' }).success
    ).toBe(true);
    expect(
      deviceProfileSchema.safeParse({ ...createValidProfile(), networkQuality: 'moderate' }).success
    ).toBe(true);
    expect(
      deviceProfileSchema.safeParse({ ...createValidProfile(), networkQuality: 'fast' }).success
    ).toBe(true);
  });

  it('should reject empty deviceId', () => {
    const profile = { ...createValidProfile(), deviceId: '' };
    expect(deviceProfileSchema.safeParse(profile).success).toBe(false);
  });

  it('should reject deviceId exceeding max length', () => {
    const profile = { ...createValidProfile(), deviceId: 'a'.repeat(65) };
    expect(deviceProfileSchema.safeParse(profile).success).toBe(false);
  });

  it('should accept deviceId at max length', () => {
    const profile = { ...createValidProfile(), deviceId: 'a'.repeat(64) };
    expect(deviceProfileSchema.safeParse(profile).success).toBe(true);
  });

  it('should reject invalid datetime format', () => {
    const profile = { ...createValidProfile(), probedAt: 'not-a-date' };
    expect(deviceProfileSchema.safeParse(profile).success).toBe(false);
  });

  it('should reject invalid tier', () => {
    const profile = { ...createValidProfile(), tier: 'premium' };
    expect(deviceProfileSchema.safeParse(profile).success).toBe(false);
  });

  it('should reject extra properties (strict mode)', () => {
    const profile = { ...createValidProfile(), extraField: 'invalid' };
    expect(deviceProfileSchema.safeParse(profile).success).toBe(false);
  });
});

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

describe('cacheConfigSchema', () => {
  it('should accept valid cache configuration', () => {
    const config = {
      resourceType: 'content-pack',
      strategy: 'cache-first',
      maxAgeSeconds: 86400,
      maxEntries: 100,
    };
    expect(cacheConfigSchema.safeParse(config).success).toBe(true);
  });

  it('should accept all resource types', () => {
    const resourceTypes = ['ui', 'content-pack', 'event-buffer', 'learner-state', 'static-asset'];
    for (const resourceType of resourceTypes) {
      const config = {
        resourceType,
        strategy: 'network-first',
        maxAgeSeconds: 3600,
        maxEntries: 50,
      };
      expect(cacheConfigSchema.safeParse(config).success).toBe(true);
    }
  });

  it('should accept boundary values for maxAgeSeconds', () => {
    const base = { resourceType: 'ui', strategy: 'cache-first', maxEntries: 100 };
    expect(cacheConfigSchema.safeParse({ ...base, maxAgeSeconds: 0 }).success).toBe(true);
    expect(cacheConfigSchema.safeParse({ ...base, maxAgeSeconds: 31536000 }).success).toBe(true); // 1 year
  });

  it('should reject maxAgeSeconds exceeding maximum', () => {
    const config = {
      resourceType: 'ui',
      strategy: 'cache-first',
      maxAgeSeconds: 31536001,
      maxEntries: 100,
    };
    expect(cacheConfigSchema.safeParse(config).success).toBe(false);
  });

  it('should reject negative maxAgeSeconds', () => {
    const config = {
      resourceType: 'ui',
      strategy: 'cache-first',
      maxAgeSeconds: -1,
      maxEntries: 100,
    };
    expect(cacheConfigSchema.safeParse(config).success).toBe(false);
  });

  it('should accept boundary values for maxEntries', () => {
    const base = { resourceType: 'ui', strategy: 'cache-first', maxAgeSeconds: 3600 };
    expect(cacheConfigSchema.safeParse({ ...base, maxEntries: 1 }).success).toBe(true);
    expect(cacheConfigSchema.safeParse({ ...base, maxEntries: 10000 }).success).toBe(true);
  });

  it('should reject maxEntries below minimum', () => {
    const config = {
      resourceType: 'ui',
      strategy: 'cache-first',
      maxAgeSeconds: 3600,
      maxEntries: 0,
    };
    expect(cacheConfigSchema.safeParse(config).success).toBe(false);
  });

  it('should reject maxEntries above maximum', () => {
    const config = {
      resourceType: 'ui',
      strategy: 'cache-first',
      maxAgeSeconds: 3600,
      maxEntries: 10001,
    };
    expect(cacheConfigSchema.safeParse(config).success).toBe(false);
  });

  it('should reject non-integer values', () => {
    const config = {
      resourceType: 'ui',
      strategy: 'cache-first',
      maxAgeSeconds: 3600.5,
      maxEntries: 100,
    };
    expect(cacheConfigSchema.safeParse(config).success).toBe(false);
  });

  it('should reject invalid resource type', () => {
    const config = {
      resourceType: 'images',
      strategy: 'cache-first',
      maxAgeSeconds: 3600,
      maxEntries: 100,
    };
    expect(cacheConfigSchema.safeParse(config).success).toBe(false);
  });

  it('should reject extra properties (strict mode)', () => {
    const config = {
      resourceType: 'ui',
      strategy: 'cache-first',
      maxAgeSeconds: 3600,
      maxEntries: 100,
      priority: 'high',
    };
    expect(cacheConfigSchema.safeParse(config).success).toBe(false);
  });
});

// =============================================================================
// PERFORMANCE BUDGET
// =============================================================================

describe('performanceBudgetSchema', () => {
  function createValidBudget() {
    return {
      ttfi: 1000,
      lcp: 2500,
      fid: 100,
      cls: 0.1,
      tbt: 300,
    };
  }

  it('should accept valid performance budget', () => {
    const budget = createValidBudget();
    expect(performanceBudgetSchema.safeParse(budget).success).toBe(true);
  });

  it('should accept boundary values for ttfi', () => {
    expect(performanceBudgetSchema.safeParse({ ...createValidBudget(), ttfi: 0 }).success).toBe(
      true
    );
    expect(performanceBudgetSchema.safeParse({ ...createValidBudget(), ttfi: 30000 }).success).toBe(
      true
    );
  });

  it('should reject ttfi exceeding maximum', () => {
    const budget = { ...createValidBudget(), ttfi: 30001 };
    expect(performanceBudgetSchema.safeParse(budget).success).toBe(false);
  });

  it('should accept boundary values for lcp', () => {
    expect(performanceBudgetSchema.safeParse({ ...createValidBudget(), lcp: 0 }).success).toBe(
      true
    );
    expect(performanceBudgetSchema.safeParse({ ...createValidBudget(), lcp: 30000 }).success).toBe(
      true
    );
  });

  it('should reject lcp exceeding maximum', () => {
    const budget = { ...createValidBudget(), lcp: 30001 };
    expect(performanceBudgetSchema.safeParse(budget).success).toBe(false);
  });

  it('should accept boundary values for fid', () => {
    expect(performanceBudgetSchema.safeParse({ ...createValidBudget(), fid: 0 }).success).toBe(
      true
    );
    expect(performanceBudgetSchema.safeParse({ ...createValidBudget(), fid: 10000 }).success).toBe(
      true
    );
  });

  it('should reject fid exceeding maximum', () => {
    const budget = { ...createValidBudget(), fid: 10001 };
    expect(performanceBudgetSchema.safeParse(budget).success).toBe(false);
  });

  it('should accept boundary values for cls', () => {
    expect(performanceBudgetSchema.safeParse({ ...createValidBudget(), cls: 0 }).success).toBe(
      true
    );
    expect(performanceBudgetSchema.safeParse({ ...createValidBudget(), cls: 1 }).success).toBe(
      true
    );
  });

  it('should reject cls below minimum', () => {
    const budget = { ...createValidBudget(), cls: -0.1 };
    expect(performanceBudgetSchema.safeParse(budget).success).toBe(false);
  });

  it('should reject cls above maximum', () => {
    const budget = { ...createValidBudget(), cls: 1.1 };
    expect(performanceBudgetSchema.safeParse(budget).success).toBe(false);
  });

  it('should accept boundary values for tbt', () => {
    expect(performanceBudgetSchema.safeParse({ ...createValidBudget(), tbt: 0 }).success).toBe(
      true
    );
    expect(performanceBudgetSchema.safeParse({ ...createValidBudget(), tbt: 60000 }).success).toBe(
      true
    );
  });

  it('should reject tbt exceeding maximum', () => {
    const budget = { ...createValidBudget(), tbt: 60001 };
    expect(performanceBudgetSchema.safeParse(budget).success).toBe(false);
  });

  it('should reject non-integer values for integer fields', () => {
    expect(
      performanceBudgetSchema.safeParse({ ...createValidBudget(), ttfi: 1000.5 }).success
    ).toBe(false);
    expect(performanceBudgetSchema.safeParse({ ...createValidBudget(), lcp: 2500.5 }).success).toBe(
      false
    );
    expect(performanceBudgetSchema.safeParse({ ...createValidBudget(), fid: 100.5 }).success).toBe(
      false
    );
    expect(performanceBudgetSchema.safeParse({ ...createValidBudget(), tbt: 300.5 }).success).toBe(
      false
    );
  });

  it('should accept decimal cls values', () => {
    expect(performanceBudgetSchema.safeParse({ ...createValidBudget(), cls: 0.25 }).success).toBe(
      true
    );
    expect(performanceBudgetSchema.safeParse({ ...createValidBudget(), cls: 0.05 }).success).toBe(
      true
    );
  });

  it('should reject extra properties (strict mode)', () => {
    const budget = { ...createValidBudget(), inp: 200 };
    expect(performanceBudgetSchema.safeParse(budget).success).toBe(false);
  });
});

// =============================================================================
// TIERED PERFORMANCE BUDGETS
// =============================================================================

describe('tieredPerformanceBudgetsSchema', () => {
  function createValidBudget() {
    return { ttfi: 1000, lcp: 2500, fid: 100, cls: 0.1, tbt: 300 };
  }

  function createValidTieredBudgets() {
    return {
      baseline: createValidBudget(),
      enhanced: createValidBudget(),
      full: createValidBudget(),
    };
  }

  it('should accept valid tiered performance budgets', () => {
    const budgets = createValidTieredBudgets();
    expect(tieredPerformanceBudgetsSchema.safeParse(budgets).success).toBe(true);
  });

  it('should accept different budgets per tier', () => {
    const budgets = {
      baseline: { ttfi: 3000, lcp: 4000, fid: 300, cls: 0.25, tbt: 1000 },
      enhanced: { ttfi: 2000, lcp: 3000, fid: 200, cls: 0.15, tbt: 500 },
      full: { ttfi: 1000, lcp: 2000, fid: 100, cls: 0.1, tbt: 200 },
    };
    expect(tieredPerformanceBudgetsSchema.safeParse(budgets).success).toBe(true);
  });

  it('should reject missing tier', () => {
    const { baseline, ...incomplete } = createValidTieredBudgets();
    expect(tieredPerformanceBudgetsSchema.safeParse(incomplete).success).toBe(false);
  });

  it('should reject extra tier', () => {
    const budgets = { ...createValidTieredBudgets(), premium: createValidBudget() };
    expect(tieredPerformanceBudgetsSchema.safeParse(budgets).success).toBe(false);
  });

  it('should reject invalid budget in any tier', () => {
    const budgets = {
      ...createValidTieredBudgets(),
      baseline: { ttfi: 50000, lcp: 2500, fid: 100, cls: 0.1, tbt: 300 }, // ttfi too high
    };
    expect(tieredPerformanceBudgetsSchema.safeParse(budgets).success).toBe(false);
  });
});
