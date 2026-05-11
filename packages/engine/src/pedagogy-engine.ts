/**
 * TopShelf Service LLC - Pedagogy Engine
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Core pedagogy engine implementing "Solve First, Teach Second".
 * Coordinates trigger detection, mode management, and constraint filtering.
 */

import { TeachingMode, TeachingContext, TeachingResponse, DeviceProfile } from './types.js';
import { TriggerDetector } from './trigger-detector.js';
import { ConstraintEngine } from './constraint-engine.js';

export const PedagogyEngine = {
  /**
   * Process a teaching request
   */
  processTeachingRequest(context: TeachingContext, teachingContent?: string): TeachingResponse {
    const triggers = TriggerDetector.detectTriggers(context);
    context.triggers = triggers;

    const effectiveMode =
      context.mode === TeachingMode.L0_SILENT
        ? TeachingMode.L0_SILENT
        : TriggerDetector.suggestModeElevation(context.mode, triggers);

    const shouldTeach = TriggerDetector.shouldTeach(effectiveMode, triggers);

    if (!shouldTeach || teachingContent === undefined || teachingContent.length === 0) {
      return {
        shouldTeach: false,
        mode: effectiveMode,
        filtered: false,
      };
    }

    const suitability = ConstraintEngine.isSuggestionSuitable(
      teachingContent,
      context.deviceProfile
    );

    if (!suitability.suitable) {
      return {
        shouldTeach: false,
        mode: effectiveMode,
        filtered: true,
        ...(suitability.reason !== undefined ? { filterReason: suitability.reason } : {}),
      };
    }

    const { filtered, wasModified } = ConstraintEngine.filterSuggestion(
      teachingContent,
      context.deviceProfile
    );

    return {
      shouldTeach: true,
      content: this.formatTeachingContent(filtered, effectiveMode),
      mode: effectiveMode,
      filtered: wasModified,
    };
  },

  formatTeachingContent(content: string, mode: TeachingMode): string {
    const prefix = this.getModePrefix(mode);
    return `${prefix}\n\n${content}`;
  },

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
  createContext(mode: TeachingMode, deviceProfile: DeviceProfile): TeachingContext {
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
