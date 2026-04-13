/**
 * TopShelf Service LLC - Constraint Engine
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Device capability profiles with resource constraints.
 * Chromebook-first design with strict limits.
 */

import { DeviceProfile, DeviceConstraints } from './types.js';

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

export class ConstraintEngine {
  /**
   * Get device constraints for a profile
   */
  static getConstraints(profile: DeviceProfile): DeviceConstraints {
    return DEVICE_PROFILES[profile];
  }

  /**
   * Check if a suggestion is suitable for the device
   */
  static isSuggestionSuitable(
    suggestion: string,
    profile: DeviceProfile
  ): { suitable: boolean; reason?: string } {
    const constraints = this.getConstraints(profile);

    if (suggestion.length > constraints.maxResponseSize) {
      return {
        suitable: false,
        reason: `Response too large (${suggestion.length} > ${constraints.maxResponseSize})`,
      };
    }

    if (!constraints.allowHeavyFrameworks) {
      const heavyFrameworks = ['react', 'angular', 'vue', 'webpack', 'parcel'];
      const lowerSuggestion = suggestion.toLowerCase();

      for (const framework of heavyFrameworks) {
        if (lowerSuggestion.includes(framework)) {
          return {
            suitable: false,
            reason: `Heavy framework '${framework}' not suitable for ${profile}`,
          };
        }
      }
    }

    if (!constraints.allowLargeAssets) {
      const largeAssetKeywords = ['large image', 'video file', 'high-res', '4k', 'hd video'];
      const lowerSuggestion = suggestion.toLowerCase();

      for (const keyword of largeAssetKeywords) {
        if (lowerSuggestion.includes(keyword)) {
          return {
            suitable: false,
            reason: `Large assets not suitable for ${profile}`,
          };
        }
      }
    }

    return { suitable: true };
  }

  /**
   * Filter and optimize suggestion for device
   */
  static filterSuggestion(
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
  }

  /**
   * Infer a DeviceProfile from arbitrary device info.
   * Falls back to CHROMEBOOK_STANDARD when unknown.
   */
  static inferProfile(deviceInfo?: Record<string, unknown> | null): DeviceProfile {
    if (!deviceInfo) {
      return DeviceProfile.CHROMEBOOK_STANDARD;
    }

    const ua = (typeof deviceInfo['userAgent'] === 'string' ? deviceInfo['userAgent'] : '')
      .toLowerCase();
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
  }
}
