---
description: 'TopShelf monorepo conventions and coding standards. Always applied.'
applyTo: '**'
lastUpdated: '2026-05-28'
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
- **Never use `any`** — use `unknown` and narrow with type guards, or define the missing type explicitly
- Cross-package types belong in `packages/shared/src/types/`; package-local types go in a local `types.ts`

## Import Conventions

- Always import from the package root: `import { foo } from '@topshelf/engine'`
- Never import from internal source paths: ~~`@topshelf/engine/src/...`~~
- Never import from `packages/_future/**` — that directory is out of scope for all active work

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

## Error Handling

In `packages/api-server/` route handlers, use the typed error helpers from `src/middleware/error-handler.ts`:

```typescript
import { notFound, badRequest, unauthorized } from '../middleware/error-handler';

// ✅ Correct
throw notFound('Session not found');
throw badRequest('Missing required field: learnerId');

// ❌ Wrong — never throw raw Error in route handlers
throw new Error('not found');
```

This ensures consistent HTTP status codes and response envelopes across all routes.

## Testing Conventions

- **Runner:** Vitest
- **File naming:** `*.test.ts` colocated with source (e.g., `engine.ts` → `engine.test.ts`)
- **Coverage command:** `pnpm test` (Turbo runs all test suites)
- **Targeted:** `pnpm --filter @topshelf/<name> test`
- Do **not** disable, skip, or comment out existing tests to make CI pass
- Do **not** update snapshots (`--updateSnapshot`) to force green — fix the actual behavior

## Cross-Package Contract Changes

If a change touches a shared type, schema, or API contract:

- Update `packages/shared/src/types/` **and** all downstream consumers in the same PR/commit
- Update both the API route (`packages/api-server/`) and the web client (`apps/web/src/lib/api/`) together
- Document the boundary change in `.github/state/decisions.md`
- Never leave a package temporarily broken between commits

## Git Conventions

- **Co-authored-by trailer** on all Copilot-assisted commits:
  ```
  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
  ```
- **Conventional Commits** prefixes: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
  - Example: `feat(engine): add stuck-time trigger detector`
- One logical change per commit — do not bundle unrelated fixes

## Copyright Header

All source files must include:

```typescript
/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */
```
