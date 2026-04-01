/**
 * TopShelf Teaching - Client PWA
 *
 * Progressive Web App client with offline support,
 * capability probing, and deterministic formatting.
 */

// Capability probing
export {
  probeDeviceCapabilities,
  classifyDeviceTier,
  classifyNetworkQuality,
  determineAvailableFeatures,
  createDeviceProfile,
} from './probe/index.js';

// Offline support
export { OfflineCacheManager, getServiceWorkerCacheStrategy } from './offline/index.js';

// Re-export types
export type {
  DeviceCapabilities,
  DeviceProfile,
  DeviceTier,
  NetworkQuality,
  DeviceFeatures,
  CacheStrategy,
  ContentPackManifest,
  LearnerState,
  LearnerEvent,
} from '@topshelf/shared';
