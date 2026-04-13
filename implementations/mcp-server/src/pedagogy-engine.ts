import { TeachingMode, TeachingContext, TeachingResponse } from './types.js';
import { TriggerDetector } from './trigger-detector.js';
import { ConstraintEngine } from './constraint-engine.js';

/**
 * Core pedagogy engine implementing "Solve First, Teach Second"
 * Coordinates trigger detection, mode management, and constraint filtering
 */
export const PedagogyEngine = {
  /**
   * Process a teaching request
   */
  processTeachingRequest(context: TeachingContext, teachingContent?: string): TeachingResponse {
    // Detect current triggers
    const triggers = TriggerDetector.detectTriggers(context);

    // Update context with detected triggers
    context.triggers = triggers;

    // Determine if teaching should occur
    const shouldTeach = TriggerDetector.shouldTeach(context.mode, triggers);

    if (!shouldTeach || teachingContent === undefined || teachingContent.length === 0) {
      return {
        shouldTeach: false,
        mode: context.mode,
        filtered: false,
      };
    }

    // Check device constraints
    const suitability = ConstraintEngine.isSuggestionSuitable(
      teachingContent,
      context.deviceProfile
    );

    if (!suitability.suitable) {
      return {
        shouldTeach: false,
        mode: context.mode,
        filtered: true,
        filterReason: suitability.reason,
      };
    }

    // Filter and optimize content for device
    const { filtered, wasModified } = ConstraintEngine.filterSuggestion(
      teachingContent,
      context.deviceProfile
    );

    return {
      shouldTeach: true,
      content: this.formatTeachingContent(filtered, context.mode),
      mode: context.mode,
      filtered: wasModified,
    };
  },

  /**
   * Format teaching content based on mode
   */
  formatTeachingContent(content: string, mode: TeachingMode): string {
    const prefix = this.getModePrefix(mode);
    return `${prefix}\n\n${content}`;
  },

  /**
   * Get prefix for teaching mode
   */
  getModePrefix(mode: TeachingMode): string {
    switch (mode) {
      case TeachingMode.L0_SILENT:
        return '';
      case TeachingMode.L1_MINIMAL:
        return '💡 Hint:';
      case TeachingMode.L2_CONTEXTUAL:
        return '📚 Guidance:';
      case TeachingMode.L3_ACTIVE:
        return '🎓 Teaching:';
      case TeachingMode.L4_TUTORIAL:
        return '📖 Tutorial:';
      default:
        return '';
    }
  },

  /**
   * Create initial teaching context
   */
  createContext(
    mode: TeachingMode,
    deviceProfile: import('./types.js').DeviceProfile
  ): TeachingContext {
    return {
      mode,
      deviceProfile,
      constraints: ConstraintEngine.getConstraints(deviceProfile),
      triggers: [],
      sessionStartTime: new Date(),
      problemsSolved: 0,
      errorsEncountered: 0,
    };
  },
};
