# TopShelf Teaching 🎓

Device-aware AI teaching kernel enforcing "Solve First, Teach Second" pedagogy.

## Overview

TopShelf Teaching is an intelligent teaching system designed for Chromebooks and low-resource devices. It features adaptive teaching modes (L0-L4), trigger-based intervention detection, and a constraint engine that ensures all teaching content is suitable for the target device.

## Key Features

- **🎯 Solve First, Teach Second**: Students learn through productive struggle before receiving guidance
- **📊 5 Teaching Modes (L0-L4)**: Progressive depth from silent observation to full tutorials
- **🔍 Trigger Detection**: Automatic detection of when students need help
- **💻 Chromebook-First**: Optimized for low-resource devices with offline support
- **🛡️ Constraint Engine**: Filters unsuitable suggestions based on device capabilities
- **⚡ TypeScript + Express**: Type-safe MCP server with REST API

## Quick Start

```bash
# Navigate to the MCP server
cd implementations/mcp-server

# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build

# Start the server
npm start
```

The server will start on port 3000 (default).

## Project Structure

```
teach/
├── implementations/
│   └── mcp-server/          # TypeScript MCP server
│       ├── src/             # Source code
│       ├── tests/           # Vitest tests
│       └── dist/            # Compiled output
├── content/                 # Domain packs
│   └── web-fundamentals/    # Example domain
├── projects/                # Hands-on lab projects
├── docs/                    # Documentation (0-10)
│   ├── 0-overview/
│   ├── 2-teaching-modes/
│   ├── 3-device-constraints/
│   ├── 4-pedagogy/
│   └── 5-api/
└── .github/workflows/       # CI configuration
```

## Teaching Modes

- **L0 - Silent**: No teaching, only solve
- **L1 - Minimal**: Hints only on explicit request
- **L2 - Contextual**: Balanced guidance based on triggers (default)
- **L3 - Active**: Proactive teaching
- **L4 - Tutorial**: Full step-by-step guidance

## Device Profiles

- **Chromebook Low**: 2GB RAM, no frameworks, 50KB max response
- **Chromebook Standard**: 4GB RAM, vanilla JS only, 100KB max response
- **Desktop Low/Standard/High**: Progressive relaxation of constraints

## API Example

```typescript
// Initialize a teaching session
POST /api/session/init
{
  "sessionId": "student-123",
  "mode": 2,
  "deviceProfile": "chromebook_standard"
}

// Process teaching request
POST /api/teach
{
  "sessionId": "student-123",
  "content": "Consider using a loop here",
  "errorCount": 2
}
```

## Documentation

Comprehensive documentation is available in the `/docs` folder:

- [Overview](docs/0-overview/README.md)
- [Teaching Modes](docs/2-teaching-modes/README.md)
- [Device Constraints](docs/3-device-constraints/README.md)
- [Pedagogy](docs/4-pedagogy/README.md)
- [API Reference](docs/5-api/README.md)

## Testing

```bash
cd implementations/mcp-server
npm test              # Run all tests
npm run test:watch    # Watch mode
```

## CI/CD

GitHub Actions CI runs on push and pull requests:
- Type checking
- Build verification
- Test suite
- Linting

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

This project enforces strict TypeScript, Chromebook-first design, and comprehensive testing. See documentation for guidelines.