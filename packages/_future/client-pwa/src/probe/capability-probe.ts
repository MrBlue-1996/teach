/**
 * Device Capability Probe (TS-DEVICE-007)
 *
 * Probes device capabilities to determine tier classification
 * and available features. Runs in first 200ms of page load.
 */

import {
  DEVICE_TIER_THRESHOLDS,
  hashSHA256,
  nowISO,
  type DeviceCapabilities,
  type DeviceFeatures,
  type DeviceProfile,
  type DeviceTier,
  type NetworkQuality,
} from '@topshelf/shared';

/**
 * Probe device capabilities
 */
export async function probeDeviceCapabilities(): Promise<DeviceCapabilities> {
  const [webGL, webGPU, wasm, network, battery, storage] = await Promise.all([
    probeWebGL(),
    probeWebGPU(),
    probeWasm(),
    probeNetwork(),
    probeBattery(),
    probeStorage(),
  ]);

  return {
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as NavigatorWithMemory).deviceMemory ?? null,
    webGL,
    webGPU,
    wasm,
    network,
    battery,
    storage,
    serviceWorker: 'serviceWorker' in navigator,
    indexedDB: 'indexedDB' in globalThis,
  };
}

/**
 * Probe WebGL capabilities
 */
function probeWebGL(): DeviceCapabilities['webGL'] {
  try {
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    if (gl2 !== null) {
      const debugInfo = gl2.getExtension('WEBGL_debug_renderer_info');
      return {
        available: true,
        version: 2,
        renderer:
          debugInfo !== null
            ? (gl2.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string)
            : null,
      };
    }

    const gl1 = canvas.getContext('webgl');
    if (gl1 !== null) {
      return { available: true, version: 1, renderer: null };
    }

    return { available: false, version: null, renderer: null };
  } catch {
    return { available: false, version: null, renderer: null };
  }
}

/**
 * Probe WebGPU capabilities
 */
async function probeWebGPU(): Promise<DeviceCapabilities['webGPU']> {
  try {
    if (!('gpu' in navigator)) {
      return { available: false, adapterInfo: null };
    }

    const adapter = await (navigator as NavigatorWithGPU).gpu.requestAdapter();
    if (adapter === null) {
      return { available: false, adapterInfo: null };
    }

    const info = await adapter.requestAdapterInfo?.();
    return {
      available: true,
      adapterInfo: info?.description ?? info?.device ?? null,
    };
  } catch {
    return { available: false, adapterInfo: null };
  }
}

/**
 * Probe WebAssembly capabilities
 */
function probeWasm(): DeviceCapabilities['wasm'] {
  const available = typeof WebAssembly === 'object';

  let simd = false;
  let threads = false;

  if (available) {
    // Check SIMD support
    try {
      // Simple SIMD detection
      simd = WebAssembly.validate(
        new Uint8Array([
          0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0,
          253, 15, 253, 98, 11,
        ])
      );
    } catch {
      simd = false;
    }

    // Check threads support (SharedArrayBuffer)
    threads = typeof SharedArrayBuffer !== 'undefined';
  }

  return { available, simd, threads };
}

/**
 * Probe network information
 */
function probeNetwork(): DeviceCapabilities['network'] {
  const connection = (navigator as NavigatorWithConnection).connection;

  if (connection === undefined) {
    return {
      effectiveType: null,
      downlink: null,
      rtt: null,
      saveData: false,
    };
  }

  return {
    effectiveType: connection.effectiveType ?? null,
    downlink: connection.downlink ?? null,
    rtt: connection.rtt ?? null,
    saveData: connection.saveData ?? false,
  };
}

/**
 * Probe battery status
 */
async function probeBattery(): Promise<DeviceCapabilities['battery']> {
  try {
    if (!('getBattery' in navigator)) {
      return null;
    }

    const battery = await (navigator as NavigatorWithBattery).getBattery();
    return {
      charging: battery.charging,
      level: battery.level,
      dischargingTime: battery.dischargingTime === Infinity ? null : battery.dischargingTime,
    };
  } catch {
    return null;
  }
}

/**
 * Probe storage capacity
 */
async function probeStorage(): Promise<DeviceCapabilities['storage']> {
  try {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
      return { quota: null, usage: null };
    }

    const estimate = await navigator.storage.estimate();
    return {
      quota: estimate.quota ?? null,
      usage: estimate.usage ?? null,
    };
  } catch {
    return { quota: null, usage: null };
  }
}

/**
 * Classify device into tier based on capabilities
 */
export function classifyDeviceTier(capabilities: DeviceCapabilities): DeviceTier {
  const ramMb = (capabilities.deviceMemory ?? 2) * 1024;
  const cores = capabilities.hardwareConcurrency;
  const rtt = capabilities.network.rtt ?? 100;

  // Check full tier requirements
  if (
    ramMb >= DEVICE_TIER_THRESHOLDS.full.minRamMb &&
    cores >= DEVICE_TIER_THRESHOLDS.full.minCores &&
    rtt <= DEVICE_TIER_THRESHOLDS.full.maxNetworkRtt &&
    capabilities.wasm.available &&
    capabilities.webGPU.available
  ) {
    return 'full';
  }

  // Check enhanced tier requirements
  if (
    ramMb >= DEVICE_TIER_THRESHOLDS.enhanced.minRamMb &&
    cores >= DEVICE_TIER_THRESHOLDS.enhanced.minCores &&
    rtt <= DEVICE_TIER_THRESHOLDS.enhanced.maxNetworkRtt &&
    capabilities.wasm.available
  ) {
    return 'enhanced';
  }

  // Default to baseline
  return 'baseline';
}

/**
 * Determine network quality
 */
export function classifyNetworkQuality(capabilities: DeviceCapabilities): NetworkQuality {
  const { effectiveType, rtt } = capabilities.network;

  if (effectiveType === null && rtt === null) {
    // Can't determine, assume moderate
    return 'moderate';
  }

  if (effectiveType === '4g' || (rtt !== null && rtt < 50)) {
    return 'fast';
  }

  if (effectiveType === '3g' || (rtt !== null && rtt < 200)) {
    return 'moderate';
  }

  if (effectiveType === '2g' || effectiveType === 'slow-2g') {
    return 'slow';
  }

  return 'moderate';
}

/**
 * Determine available features for device tier
 */
export function determineAvailableFeatures(
  tier: DeviceTier,
  capabilities: DeviceCapabilities
): DeviceFeatures {
  const isEnhancedOrFull = tier === 'enhanced' || tier === 'full';
  const isFull = tier === 'full';

  return {
    baselineUI: true,
    deterministicFormatter: true,
    smallPacks: true,
    wasmInference: isEnhancedOrFull ? capabilities.wasm.available : false,
    localEmbeddings: isEnhancedOrFull
      ? capabilities.wasm.available && capabilities.wasm.simd
      : false,
    webGPU: isFull ? capabilities.webGPU.available : false,
    localLLM: isFull ? capabilities.webGPU.available : false,
    offline: capabilities.serviceWorker && capabilities.indexedDB,
    backgroundSync: capabilities.serviceWorker,
  };
}

/**
 * Create complete device profile
 */
export async function createDeviceProfile(): Promise<DeviceProfile> {
  const capabilities = await probeDeviceCapabilities();
  const tier = classifyDeviceTier(capabilities);
  const networkQuality = classifyNetworkQuality(capabilities);
  const availableFeatures = determineAvailableFeatures(tier, capabilities);

  // Create privacy-preserving device ID
  const deviceFingerprint = [
    capabilities.hardwareConcurrency,
    capabilities.deviceMemory,
    capabilities.webGL.version,
    capabilities.wasm.simd,
    tier,
  ].join(':');
  const deviceId = hashSHA256(deviceFingerprint).slice(0, 16);

  return {
    deviceId,
    tier,
    capabilities,
    networkQuality,
    availableFeatures,
    probedAt: nowISO(),
  };
}

// Type extensions for browser APIs
interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
}

interface NavigatorWithConnection extends Navigator {
  connection?: {
    effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
}

interface NavigatorWithGPU extends Navigator {
  gpu: {
    requestAdapter(): Promise<GPUAdapter | null>;
  };
}

interface GPUAdapter {
  requestAdapterInfo?(): Promise<{ description?: string; device?: string }>;
}

interface NavigatorWithBattery extends Navigator {
  getBattery(): Promise<{
    charging: boolean;
    level: number;
    dischargingTime: number;
  }>;
}
