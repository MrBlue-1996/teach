import { TriggerType, TeachingContext, TeachingMode } from './types.js';

/**
 * Trigger detection system for "Solve First, Teach Second" pedagogy
 * Detects when teaching intervention is needed
 */
export class TriggerDetector {
  private static readonly ERROR_REPEAT_THRESHOLD = 3;
  private static readonly STUCK_TIME_THRESHOLD_MS = 300000; // 5 minutes

  /**
   * Detect triggers based on teaching context
   */
  static detectTriggers(context: TeachingContext): TriggerType[] {
    const triggers: TriggerType[] = [];

    // Detect repeated errors
    if (context.errorsEncountered >= this.ERROR_REPEAT_THRESHOLD) {
      triggers.push(TriggerType.ERROR_REPEATED);
    }

    // Detect stuck state (time spent without progress)
    const timeElapsed = Date.now() - context.sessionStartTime.getTime();
    const progressRate = context.problemsSolved / (timeElapsed / 60000); // problems per minute
    
    if (timeElapsed > this.STUCK_TIME_THRESHOLD_MS && progressRate < 0.1) {
      triggers.push(TriggerType.STUCK_DETECTED);
    }

    // Time threshold trigger
    if (timeElapsed > this.STUCK_TIME_THRESHOLD_MS) {
      triggers.push(TriggerType.TIME_THRESHOLD);
    }

    return triggers;
  }

  /**
   * Determine if teaching should be triggered based on mode and triggers
   */
  static shouldTeach(mode: TeachingMode, triggers: TriggerType[]): boolean {
    switch (mode) {
      case TeachingMode.L0_SILENT:
        // Never teach, only solve
        return false;

      case TeachingMode.L1_MINIMAL:
        // Only teach on explicit help request
        return triggers.includes(TriggerType.HELP_REQUESTED);

      case TeachingMode.L2_CONTEXTUAL:
        // Teach on specific triggers
        return triggers.some(t => 
          t === TriggerType.ERROR_REPEATED || 
          t === TriggerType.STUCK_DETECTED ||
          t === TriggerType.HELP_REQUESTED
        );

      case TeachingMode.L3_ACTIVE:
        // Proactive teaching on most triggers
        return triggers.length > 0;

      case TeachingMode.L4_TUTORIAL:
        // Always teach
        return true;

      default:
        return false;
    }
  }

  /**
   * Suggest mode elevation based on triggers
   */
  static suggestModeElevation(
    currentMode: TeachingMode,
    triggers: TriggerType[]
  ): TeachingMode {
    // Don't elevate if already at max
    if (currentMode >= TeachingMode.L4_TUTORIAL) {
      return currentMode;
    }

    // Elevate mode based on trigger severity
    const severeTriggers = triggers.filter(t => 
      t === TriggerType.ERROR_REPEATED || 
      t === TriggerType.STUCK_DETECTED
    );

    if (severeTriggers.length >= 2 && currentMode < TeachingMode.L3_ACTIVE) {
      return TeachingMode.L3_ACTIVE;
    }

    if (severeTriggers.length >= 1 && currentMode < TeachingMode.L2_CONTEXTUAL) {
      return TeachingMode.L2_CONTEXTUAL;
    }

    return currentMode;
  }
}
