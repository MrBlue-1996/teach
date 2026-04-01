/**
 * Device Profile Types (TS-DEVICE-007)
 *
 * Types for capability probing, device classification,
 * and progressive enhancement.
 */

/** Device tier classification */
export type DeviceTier = 'baseline' | 'enhanced' | 'full';

/** Network quality classification */
export type NetworkQuality = 'offline' | 'slow' | 'moderate' | 'fast';

/** Battery state */
export interface BatteryState {
  /** Whether device is charging */
  readonly charging: boolean;
  /** Battery level [0, 1] */
  readonly level: number;
  /** Estimated discharge time in seconds */
  readonly dischargingTime: number | null;
}

/** Device capabilities from probe (TS-DEVICE-007) */
export interface DeviceCapabilities {
  /** Number of logical CPU cores */
  readonly hardwareConcurrency: number;
  /** Device memory in GB */
  readonly deviceMemory: number | null;
  /** WebGL availability and version */
  readonly webGL: {
    readonly available: boolean;
    readonly version: 1 | 2 | null;
    readonly renderer: string | null;
  };
  /** WebGPU availability */
  readonly webGPU: {
    readonly available: boolean;
    readonly adapterInfo: string | null;
  };
  /** WASM support */
  readonly wasm: {
    readonly available: boolean;
    readonly simd: boolean;
    readonly threads: boolean;
  };
  /** Network information */
  readonly network: {
    readonly effectiveType: '2g' | '3g' | '4g' | 'slow-2g' | null;
    readonly downlink: number | null;
    readonly rtt: number | null;
    readonly saveData: boolean;
  };
  /** Battery state */
  readonly battery: BatteryState | null;
  /** Storage estimate */
  readonly storage: {
    readonly quota: number | null;
    readonly usage: number | null;
  };
  /** Service worker support */
  readonly serviceWorker: boolean;
  /** IndexedDB support */
  readonly indexedDB: boolean;
}

/** Normalized device profile */
export interface DeviceProfile {
  /** Unique device fingerprint (privacy-preserving) */
  readonly deviceId: string;
  /** Device tier classification */
  readonly tier: DeviceTier;
  /** Raw capabilities */
  readonly capabilities: DeviceCapabilities;
  /** Network quality at time of probe */
  readonly networkQuality: NetworkQuality;
  /** Available features based on tier */
  readonly availableFeatures: DeviceFeatures;
  /** ISO 8601 timestamp of probe */
  readonly probedAt: string;
}

/** Features available on device */
export interface DeviceFeatures {
  /** HTML/CSS/JS baseline UI */
  readonly baselineUI: boolean;
  /** Deterministic formatter */
  readonly deterministicFormatter: boolean;
  /** Small content packs */
  readonly smallPacks: boolean;
  /** WASM inference */
  readonly wasmInference: boolean;
  /** Local embeddings */
  readonly localEmbeddings: boolean;
  /** WebGPU acceleration */
  readonly webGPU: boolean;
  /** Quantized local LLMs */
  readonly localLLM: boolean;
  /** Offline mode */
  readonly offline: boolean;
  /** Background sync */
  readonly backgroundSync: boolean;
}

/** Service worker cache strategy */
export type CacheStrategy =
  | 'cache-first'
  | 'network-first'
  | 'stale-while-revalidate'
  | 'network-only'
  | 'cache-only';

/** Cache configuration per resource type */
export interface CacheConfig {
  /** Resource type */
  readonly resourceType: 'ui' | 'content-pack' | 'event-buffer' | 'learner-state' | 'static-asset';
  /** Caching strategy */
  readonly strategy: CacheStrategy;
  /** Maximum age in seconds */
  readonly maxAgeSeconds: number;
  /** Maximum entries in cache */
  readonly maxEntries: number;
}

/** Performance budget */
export interface PerformanceBudget {
  /** Time to first interactive in milliseconds */
  readonly ttfi: number;
  /** Largest contentful paint in milliseconds */
  readonly lcp: number;
  /** First input delay in milliseconds */
  readonly fid: number;
  /** Cumulative layout shift */
  readonly cls: number;
  /** Total blocking time in milliseconds */
  readonly tbt: number;
}

/** Performance budget by device tier */
export interface TieredPerformanceBudgets {
  readonly baseline: PerformanceBudget;
  readonly enhanced: PerformanceBudget;
  readonly full: PerformanceBudget;
}
