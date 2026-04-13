/**
 * TopShelf Service LLC - Teaching Engine
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Public API surface for the teaching engine package.
 */

export {
  TeachingMode,
  DeviceProfile,
  TriggerType,
  type DeviceConstraints,
  type TeachingContext,
  type TeachingResponse,
} from './types.js';

export { PedagogyEngine } from './pedagogy-engine.js';
export { TriggerDetector } from './trigger-detector.js';
export { ConstraintEngine } from './constraint-engine.js';
