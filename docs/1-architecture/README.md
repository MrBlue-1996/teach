# 1. System Architecture

## Overview

TopShelf Teaching is built as a modular TypeScript system with clear separation of concerns.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                   Express HTTP Server                    │
│                      (port 3000)                         │
└───────────────────┬──────────────────────────────────────┘
                    │
        ┌───────────┴────────────┐
        │   REST API Endpoints   │
        │   /api/session/*       │
        │   /api/teach           │
        │   /api/triggers/*      │
        └───────────┬────────────┘
                    │
    ┌───────────────┴───────────────┐
    │    Session Manager (Map)       │
    │  sessionId -> TeachingContext  │
    └───────────────┬───────────────┘
                    │
        ┌───────────┴────────────┐
        │   Pedagogy Engine      │
        │  (Core orchestration)  │
        └───┬────────────────┬───┘
            │                │
    ┌───────┴──────┐  ┌─────┴──────────┐
    │ Trigger      │  │  Constraint    │
    │ Detector     │  │  Engine        │
    └──────────────┘  └────────────────┘
```

## Core Components

### 1. Express Server (`src/index.ts`)
- HTTP server handling REST API requests
- Session management with in-memory Map
- Request validation and error handling
- CORS and JSON middleware

### 2. Pedagogy Engine (`src/pedagogy-engine.ts`)
- Orchestrates teaching decisions
- Processes teaching requests
- Applies mode-based formatting
- Integrates trigger detection and constraints

### 3. Trigger Detector (`src/trigger-detector.ts`)
- Analyzes teaching context for triggers
- Detects error patterns and stuck states
- Suggests mode elevation when appropriate
- Implements "solve first" logic

### 4. Constraint Engine (`src/constraint-engine.ts`)
- Defines device capability profiles
- Filters unsuitable suggestions
- Enforces response size limits
- Blocks heavy frameworks for Chromebooks

### 5. Type System (`src/types.ts`)
- TypeScript interfaces for all domain objects
- Enums for modes, profiles, and triggers
- Strong typing throughout the system

## Data Flow

### Teaching Request Flow
```
1. Client sends POST /api/teach
   └─> sessionId, content, metrics

2. Server retrieves TeachingContext
   └─> Validates session exists

3. Updates context with new metrics
   └─> errorCount, problemsSolved

4. Pedagogy Engine processes request
   ├─> Trigger Detector analyzes context
   ├─> Determines if teaching should occur
   └─> Constraint Engine validates content

5. Returns TeachingResponse
   └─> shouldTeach, content, mode, filtered
```

### Session Lifecycle
```
Init → Active → Update Metrics → Detect Triggers → Mode Adjustment → Delete
```

## Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.3+ (strict mode)
- **Server**: Express 4.18
- **Testing**: Vitest 1.1
- **Build**: TSC (TypeScript Compiler)

## Module Structure

```
src/
├── index.ts              # Express server, API routes
├── types.ts              # TypeScript types and enums
├── pedagogy-engine.ts    # Core teaching logic
├── trigger-detector.ts   # Trigger detection system
└── constraint-engine.ts  # Device constraint filtering

tests/
├── pedagogy-engine.test.ts
├── trigger-detector.test.ts
└── constraint-engine.test.ts
```

## Design Principles

1. **Immutability**: Contexts are updated, not replaced
2. **Fail-Safe**: Default to not teaching (solve first)
3. **Type Safety**: Strict TypeScript, no `any`
4. **Testability**: Pure functions, dependency injection
5. **Modularity**: Clear single-responsibility modules

## Scalability Considerations

### Current: In-Memory Sessions
- Simple Map-based storage
- Fast access, no persistence
- Suitable for single-server deployments

### Future: Distributed Sessions
- Redis for session storage
- Multi-server deployments
- Session persistence across restarts

### Future: Analytics
- Track teaching effectiveness
- Mode usage patterns
- Device profile distribution
- Trigger frequency analysis
