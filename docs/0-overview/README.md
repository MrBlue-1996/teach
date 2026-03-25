# 0. Overview - TopShelf Teaching

## Introduction

TopShelf Teaching is a device-aware AI teaching kernel that enforces "Solve First, Teach Second" pedagogy. It's designed to work seamlessly on Chromebooks and low-resource devices while providing adaptive teaching experiences.

## Key Features

- **5 Teaching Modes (L0-L4)**: Progressive teaching depth from silent to full tutorial
- **Trigger-Based Teaching**: Automatic detection of when students need help
- **Device-Aware**: Constraint engine for Chromebook and low-resource devices
- **Offline-First**: Full offline capability for resource-constrained environments
- **TypeScript MCP Server**: Express-based server with strict typing

## Quick Start

```bash
cd implementations/mcp-server
npm install
npm run dev
```

The server will start on port 3000 with the teaching kernel ready.

## Core Concepts

### Solve First, Teach Second

Students attempt to solve problems independently before receiving teaching interventions. The system detects struggle points through:
- Repeated errors
- Time thresholds
- Stuck states
- Explicit help requests

### Device Constraints

All teaching suggestions are filtered based on device capabilities:
- Maximum response sizes
- Framework restrictions
- Asset limitations
- Offline requirements

## Architecture Overview

```
┌─────────────────────────────────────┐
│     Express MCP Server              │
├─────────────────────────────────────┤
│  Pedagogy Engine                    │
│  ├─ Trigger Detector                │
│  ├─ Mode Manager (L0-L4)            │
│  └─ Constraint Engine               │
├─────────────────────────────────────┤
│  Content & Projects                 │
│  ├─ Domain Packs                    │
│  └─ Hands-on Labs                   │
└─────────────────────────────────────┘
```

## Next Steps

- Read [Architecture](../1-architecture/README.md) for system design
- Learn about [Teaching Modes](../2-teaching-modes/README.md)
- Understand [Device Constraints](../3-device-constraints/README.md)
