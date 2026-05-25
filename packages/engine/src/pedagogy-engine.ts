/**
 * TopShelf Service LLC - Pedagogy Engine
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Core pedagogy engine implementing "Solve First, Teach Second".
 * Coordinates trigger detection, mode management, and constraint filtering.
 */

import {
  TeachingMode,
  TeachingContext,
  TeachingResponse,
  DeviceProfile,
  type CreateContextOptions,
} from './types.js';
import { TriggerDetector } from './trigger-detector.js';
import { ConstraintEngine } from './constraint-engine.js';

export const PedagogyEngine = {
  /**
   * Process a teaching request
   */
  processTeachingRequest(context: TeachingContext, teachingContent?: string): TeachingResponse {
    const triggers = TriggerDetector.detectTriggers(context);
    context.triggers = triggers;

    if (context.mode === TeachingMode.L0_SILENT) {
      return {
        shouldTeach: false,
        mode: TeachingMode.L0_SILENT,
        filtered: false,
      };
    }

    // For non-tutorial modes, no triggers means no-teach and no elevation.
    if (triggers.length === 0 && context.mode !== TeachingMode.L4_TUTORIAL) {
      return {
        shouldTeach: false,
        mode: context.mode,
        filtered: false,
      };
    }

    const effectiveMode = TriggerDetector.suggestModeElevation(context.mode, triggers);

    if (teachingContent === undefined || teachingContent.length === 0) {
      return {
        shouldTeach: false,
        mode: effectiveMode,
        filtered: false,
      };
    }

    const shouldTeach = TriggerDetector.shouldTeach(effectiveMode, triggers);

    if (!shouldTeach) {
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
   * Create initial teaching context.
   *
   * Mode precedence (highest wins):
   *   1. `options.learnerOverride` — explicit learner choice from session API
   *   2. `options.initialExposure === true` → `L4_TUTORIAL` (worked-example-first)
   *   3. `options.blockMode` — content-pack recommendation on the teaching block
   *   4. `mode` — caller-supplied default (typically the account default)
   */
  createContext(
    mode: TeachingMode,
    deviceProfile: DeviceProfile,
    options: CreateContextOptions = {}
  ): TeachingContext {
    const seedMode = this.resolveSeedMode(mode, options);

    return {
      mode: seedMode,
      deviceProfile,
      constraints: ConstraintEngine.getConstraints(deviceProfile),
      triggers: [],
      sessionStartTime: new Date(),
      problemsSolved: 0,
      errorsEncountered: 0,
      ...(options.initialExposure !== undefined
        ? { initialExposure: options.initialExposure }
        : {}),
      ...(options.thresholds !== undefined ? { thresholds: options.thresholds } : {}),
    };
  },

  resolveSeedMode(defaultMode: TeachingMode, options: CreateContextOptions): TeachingMode {
    if (options.learnerOverride !== undefined) {
      return options.learnerOverride;
    }
    if (options.initialExposure === true) {
      return TeachingMode.L4_TUTORIAL;
    }
    if (options.blockMode !== undefined) {
      return options.blockMode;
    }
    return defaultMode;
  },
};
