/**
 * TopShelf Service LLC - Constraint Engine
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Device capability profiles with resource constraints.
 * Chromebook-first design with strict limits.
 */

import { DeviceProfile, DeviceConstraints } from './types.js';

const HEAVY_FRAMEWORKS = ['react', 'angular', 'vue', 'webpack', 'parcel'];
const LARGE_ASSET_KEYWORDS = ['large image', 'video file', 'high-res', '4k', 'hd video'];

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const HEAVY_FRAMEWORKS_REGEX = new RegExp(
  HEAVY_FRAMEWORKS.map(escapeRegex).join('|'),
  'i'
);
const LARGE_ASSET_KEYWORDS_REGEX = new RegExp(
  LARGE_ASSET_KEYWORDS.map(escapeRegex).join('|'),
  'i'
);

const DEVICE_PROFILES: Record<DeviceProfile, DeviceConstraints> = {
  [DeviceProfile.CHROMEBOOK_LOW]: {
    maxMemoryMB: 2048,
    maxCPUCores: 2,
    offlineCapable: true,
    maxResponseSize: 50000,
    allowHeavyFrameworks: false,
    allowLargeAssets: false,
  },
  [DeviceProfile.CHROMEBOOK_STANDARD]: {
    maxMemoryMB: 4096,
    maxCPUCores: 4,
    offlineCapable: true,
    maxResponseSize: 100000,
    allowHeavyFrameworks: false,
    allowLargeAssets: false,
  },
  [DeviceProfile.DESKTOP_LOW]: {
    maxMemoryMB: 4096,
    maxCPUCores: 2,
    offlineCapable: false,
    maxResponseSize: 200000,
    allowHeavyFrameworks: false,
    allowLargeAssets: true,
  },
  [DeviceProfile.DESKTOP_STANDARD]: {
    maxMemoryMB: 8192,
    maxCPUCores: 4,
    offlineCapable: false,
    maxResponseSize: 500000,
    allowHeavyFrameworks: true,
    allowLargeAssets: true,
  },
  [DeviceProfile.DESKTOP_HIGH]: {
    maxMemoryMB: 16384,
    maxCPUCores: 8,
    offlineCapable: false,
    maxResponseSize: 1000000,
    allowHeavyFrameworks: true,
    allowLargeAssets: true,
  },
};

export const ConstraintEngine = {
  /**
   * Get device constraints for a profile
   */
  getConstraints(profile: DeviceProfile): DeviceConstraints {
    // eslint-disable-next-line security/detect-object-injection
    return DEVICE_PROFILES[profile];
  },

  /**
   * Check if a suggestion is suitable for the device
   */
  isSuggestionSuitable(
    suggestion: string,
    profile: DeviceProfile
  ): { suitable: boolean; reason?: string } {
    // eslint-disable-next-line security/detect-object-injection
    const constraints = DEVICE_PROFILES[profile];

    if (suggestion.length > constraints.maxResponseSize) {
      return {
        suitable: false,
        reason: `Response too large (${suggestion.length} > ${constraints.maxResponseSize})`,
      };
    }

    if (!constraints.allowHeavyFrameworks) {
      const frameworkMatch = suggestion.match(HEAVY_FRAMEWORKS_REGEX);
      if (frameworkMatch !== null) {
        return {
          suitable: false,
          reason: `Heavy framework '${frameworkMatch[0]}' not suitable for ${profile}`,
        };
      }
    }

    if (!constraints.allowLargeAssets) {
      const largeAssetMatch = suggestion.match(LARGE_ASSET_KEYWORDS_REGEX);
      if (largeAssetMatch !== null) {
        return {
          suitable: false,
          reason: `Large assets not suitable for ${profile}`,
        };
      }
    }

    return { suitable: true };
  },

  /**
   * Filter and optimize suggestion for device
   */
  filterSuggestion(
    suggestion: string,
    profile: DeviceProfile
  ): { filtered: string; wasModified: boolean } {
    const constraints = this.getConstraints(profile);
    let filtered = suggestion;
    let wasModified = false;

    if (filtered.length > constraints.maxResponseSize) {
      const safeTruncateLength = Math.max(0, constraints.maxResponseSize - 100);
      filtered =
        filtered.substring(0, safeTruncateLength) +
        '\n\n[Response truncated for device constraints]';
      wasModified = true;
    }

    return { filtered, wasModified };
  },

  /**
   * Infer a DeviceProfile from arbitrary device info.
   * Falls back to CHROMEBOOK_STANDARD when unknown.
   */
  inferProfile(deviceInfo?: Record<string, unknown> | null): DeviceProfile {
    if (!deviceInfo) {
      return DeviceProfile.CHROMEBOOK_STANDARD;
    }

    const ua = (
      typeof deviceInfo['userAgent'] === 'string' ? deviceInfo['userAgent'] : ''
    ).toLowerCase();
    const mem = typeof deviceInfo['deviceMemory'] === 'number' ? deviceInfo['deviceMemory'] : null;
    const cores =
      typeof deviceInfo['hardwareConcurrency'] === 'number'
        ? deviceInfo['hardwareConcurrency']
        : null;

    const isChromebook = ua.includes('cros') || ua.includes('chromebook');

    if (isChromebook) {
      if (mem !== null && mem <= 2) return DeviceProfile.CHROMEBOOK_LOW;
      return DeviceProfile.CHROMEBOOK_STANDARD;
    }

    // Not a Chromebook – classify by memory / cores
    if (mem !== null && mem <= 4) return DeviceProfile.DESKTOP_LOW;
    if (cores !== null && cores >= 8) return DeviceProfile.DESKTOP_HIGH;
    if (mem !== null && mem >= 8) return DeviceProfile.DESKTOP_HIGH;
    return DeviceProfile.DESKTOP_STANDARD;
  },
};
