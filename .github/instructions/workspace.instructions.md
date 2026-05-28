---
description: 'TopShelf monorepo conventions and coding standards. Always applied.'
applyTo: '**'
lastUpdated: '2026-05-26'
---

# TopShelf Workspace Standards

## Package Manager

- Use `pnpm` exclusively. Never `npm` or `yarn`.
- Workspace dependencies: `"@topshelf/engine": "workspace:*"`
- Install to root: `pnpm install <pkg> -w`
- Install to package: `pnpm --filter @topshelf/<name> add <pkg>`

## TypeScript

- Strict mode with `exactOptionalPropertyTypes` enabled
- For optional properties, use spread pattern: `return { required, ...( opt ? { opt } : {} ) }`
- Target ES2022, module ESNext, bundler resolution
- Build with `tsup` (libraries), `next build` (web app)

## Monorepo Structure

| Area       | Path                          | Build |
| ---------- | ----------------------------- | ----- |
| Engine     | `packages/engine/`            | tsup  |
| API Server | `packages/api-server/`        | tsup  |
| Database   | `packages/database/`          | tsup  |
| Auth       | `packages/auth/`              | tsup  |
| Web App    | `apps/web/`                   | next  |
| MCP Server | `implementations/mcp-server/` | tsc   |

## Commands

```bash
pnpm build          # Build all via Turbo
pnpm test           # Test all via Turbo
pnpm lint           # Lint all
pnpm typecheck      # Type-check all
pnpm validate       # Full CI: format + lint + typecheck + test
pnpm dev            # Dev mode (all packages, parallel)
```

## Copyright Header

All source files must include:

```typescript
/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */
```
