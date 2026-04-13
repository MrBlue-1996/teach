/**
 * TopShelf Service LLC - Teaching Engine Types
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Teaching modes, device profiles, constraints, triggers, and response shapes
 * used by the pedagogy engine, trigger detector, and constraint engine.
 */

/**
 * Teaching modes - controls depth of teaching interventions
 * L0: Silent mode - No teaching, only solve
 * L1: Minimal hints - Only when explicitly stuck
 * L2: Contextual guidance - Provide hints based on triggers
 * L3: Active teaching - Proactive explanations
 * L4: Full tutorial mode - Step-by-step guidance
 */
export enum TeachingMode {
  L0_SILENT = 0,
  L1_MINIMAL = 1,
  L2_CONTEXTUAL = 2,
  L3_ACTIVE = 3,
  L4_TUTORIAL = 4,
}

/**
 * Device capability profiles
 */
export enum DeviceProfile {
  CHROMEBOOK_LOW = 'chromebook_low',
  CHROMEBOOK_STANDARD = 'chromebook_standard',
  DESKTOP_LOW = 'desktop_low',
  DESKTOP_STANDARD = 'desktop_standard',
  DESKTOP_HIGH = 'desktop_high',
}

/**
 * Resource constraints for different device profiles
 */
export interface DeviceConstraints {
  maxMemoryMB: number;
  maxCPUCores: number;
  offlineCapable: boolean;
  maxResponseSize: number;
  allowHeavyFrameworks: boolean;
  allowLargeAssets: boolean;
}

/**
 * Teaching trigger types that can elevate teaching mode
 */
export enum TriggerType {
  ERROR_REPEATED = 'error_repeated',
  STUCK_DETECTED = 'stuck_detected',
  HELP_REQUESTED = 'help_requested',
  CONCEPT_GAP = 'concept_gap',
  TIME_THRESHOLD = 'time_threshold',
}

/**
 * Teaching context for a session
 */
export interface TeachingContext {
  mode: TeachingMode;
  deviceProfile: DeviceProfile;
  constraints: DeviceConstraints;
  triggers: TriggerType[];
  sessionStartTime: Date;
  problemsSolved: number;
  errorsEncountered: number;
}

/**
 * Teaching response from the kernel
 */
export interface TeachingResponse {
  shouldTeach: boolean;
  content?: string;
  mode: TeachingMode;
  filtered: boolean;
  filterReason?: string;
}
