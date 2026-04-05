/**
 * Capability Probe Module
 *
 * Re-exports capability probing functionality.
 */

export {
  probeDeviceCapabilities,
  classifyDeviceTier,
  classifyNetworkQuality,
  determineAvailableFeatures,
  createDeviceProfile,
} from './capability-probe.js';
