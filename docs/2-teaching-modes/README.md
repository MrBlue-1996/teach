# 2. Teaching Modes (L0-L4)

## Overview

TopShelf Teaching uses five progressive teaching modes that control the depth and frequency of teaching interventions.

## Mode Levels

### L0: Silent Mode

- **Philosophy**: Pure "solve first" - no teaching at all
- **Use Case**: Students who want to work completely independently
- **Triggers**: None - never teaches
- **Output**: Only solution/execution, no explanations

### L1: Minimal Hints

- **Philosophy**: Teach only when explicitly asked
- **Use Case**: Confident students who occasionally need a nudge
- **Triggers**: Only HELP_REQUESTED
- **Output**: Brief hints without full explanations

### L2: Contextual Guidance (Default)

- **Philosophy**: Balanced "solve first, teach second"
- **Use Case**: Most students - normal learning progression
- **Triggers**: ERROR_REPEATED, STUCK_DETECTED, HELP_REQUESTED
- **Output**: Contextual guidance based on specific struggles

### L3: Active Teaching

- **Philosophy**: Proactive teaching with anticipation
- **Use Case**: Students who benefit from more guidance
- **Triggers**: All trigger types
- **Output**: Proactive explanations and concepts

### L4: Tutorial Mode

- **Philosophy**: Full step-by-step teaching
- **Use Case**: Beginners or complex new topics
- **Triggers**: Always teaches (no trigger needed)
- **Output**: Comprehensive tutorials with examples

## Trigger Types

### ERROR_REPEATED

Activated when the same or similar error occurs 3+ times.

### STUCK_DETECTED

Activated when no progress for 5+ minutes with low solve rate.

### HELP_REQUESTED

Activated by explicit student request for help.

### CONCEPT_GAP

Activated when prerequisite knowledge is missing.

### TIME_THRESHOLD

Activated after extended time on a problem.

## Mode Selection

### Automatic Elevation

The system can suggest mode elevation based on triggers:

- 2+ severe triggers → suggest L3
- 1 severe trigger → suggest L2
- No auto-elevation beyond L4

### Manual Control

Users can explicitly set mode via API:

```typescript
POST /api/session/mode
{
  "sessionId": "abc123",
  "mode": 2  // L2_CONTEXTUAL
}
```

## Best Practices

1. **Start at L2**: Default mode works for most students
2. **Let Triggers Work**: Trust the trigger detection system
3. **Respect Mode Choice**: Don't force elevation
4. **Monitor Progress**: Track which modes work best per student
