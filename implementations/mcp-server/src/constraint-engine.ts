import { DeviceProfile, DeviceConstraints } from './types.js';

/**
 * Device capability profiles with resource constraints
 * Chromebook-first design with strict limits
 */
const DEVICE_PROFILES: Record<DeviceProfile, DeviceConstraints> = {
  [DeviceProfile.CHROMEBOOK_LOW]: {
    maxMemoryMB: 2048,
    maxCPUCores: 2,
    offlineCapable: true,
    maxResponseSize: 50000, // 50KB
    allowHeavyFrameworks: false,
    allowLargeAssets: false,
  },
  [DeviceProfile.CHROMEBOOK_STANDARD]: {
    maxMemoryMB: 4096,
    maxCPUCores: 4,
    offlineCapable: true,
    maxResponseSize: 100000, // 100KB
    allowHeavyFrameworks: false,
    allowLargeAssets: false,
  },
  [DeviceProfile.DESKTOP_LOW]: {
    maxMemoryMB: 4096,
    maxCPUCores: 2,
    offlineCapable: false,
    maxResponseSize: 200000, // 200KB
    allowHeavyFrameworks: false,
    allowLargeAssets: true,
  },
  [DeviceProfile.DESKTOP_STANDARD]: {
    maxMemoryMB: 8192,
    maxCPUCores: 4,
    offlineCapable: false,
    maxResponseSize: 500000, // 500KB
    allowHeavyFrameworks: true,
    allowLargeAssets: true,
  },
  [DeviceProfile.DESKTOP_HIGH]: {
    maxMemoryMB: 16384,
    maxCPUCores: 8,
    offlineCapable: false,
    maxResponseSize: 1000000, // 1MB
    allowHeavyFrameworks: true,
    allowLargeAssets: true,
  },
};

/**
 * Constraint engine for filtering teaching suggestions
 * based on device capabilities
 */
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

    // Check response size
    if (suggestion.length > constraints.maxResponseSize) {
      return {
        suitable: false,
        reason: `Response too large (${suggestion.length} > ${constraints.maxResponseSize})`,
      };
    }

    // Check for heavy frameworks in suggestions
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

    // Check for large assets
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

    // Truncate if too large
    if (filtered.length > constraints.maxResponseSize) {
      filtered = filtered.substring(0, constraints.maxResponseSize - 100) + 
                 '\n\n[Response truncated for device constraints]';
      wasModified = true;
    }

    return { filtered, wasModified };
  }
}
