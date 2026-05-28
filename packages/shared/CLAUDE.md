# CLAUDE.md

Last updated: 2026-05-28

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package: `@topshelf/shared`

Single source of truth for cross-package TypeScript types, Zod schemas, constants, and utility functions. Every other active package depends on this one; it has no internal dependencies on other `@topshelf/*` packages.

```bash
pnpm test
pnpm build    # tsup → dist/
pnpm typecheck
```

## Structure

```
src/
  types/index.ts       # all TS interfaces and enums
  schemas/index.ts     # Zod validation schemas (mirror types/)
  constants/index.ts   # enum values, numeric thresholds, sentinel strings
  utils/index.ts       # pure utility functions
  index.ts             # re-exports everything — always import from package root
```

## Rules for Adding to This Package

- **New cross-package type** → `src/types/index.ts`, exported from `src/index.ts`
- **New Zod schema** → `src/schemas/index.ts`; name it `${TypeName}Schema` and ensure it matches the corresponding TS type exactly
- **New constant** → `src/constants/index.ts`; prefer `as const` objects over enums for string constants
- **New utility** → `src/utils/index.ts`; must be pure (no I/O, no side effects)

## When NOT to Add to This Package

If a type is only used inside one package (e.g., engine-internal state, an API-server-specific request shape), define it in that package's own `types.ts`. Only add to `@topshelf/shared` when **two or more active packages** need it. Adding single-consumer types here creates unnecessary coupling.

## Key Type Families

- **Teaching domain** — `TeachingMode`, `TriggerType`, `DeviceProfile`, `TeachingContext`, `TeachingResponse`, `DeviceConstraints`
- **Content** — `ContentPackManifest`, `ContentBlock`, `TeachingBlock`, `DraftTeachingBlock`
- **Learner** — `LearnerState`, `MasteryProfile`, `RetentionRecord`, `SkillEstimate`
- **Policy** — `PromotionPolicy`, `PolicyEvaluationInput`, `SignalValue`, `SignalType`
- **Package boundary** — kitchen-domain types live in `@topshelf/engine`; `@topshelf/shared` does not re-export them

## Type Naming Conventions

| Kind       | Convention           | Example               |
| ---------- | -------------------- | --------------------- |
| Interface  | PascalCase           | `LearnerState`        |
| Enum       | PascalCase           | `TeachingMode`        |
| Zod schema | `${TypeName}Schema`  | `LearnerStateSchema`  |
| Constant   | SCREAMING_SNAKE_CASE | `MAX_HINTS_PER_BLOCK` |
| Utility fn | camelCase            | `normalizeBlockId`    |

## Zod Schema / Type Parity

The Zod schemas in `src/schemas/` are used by `api-server` for request validation and by `apps/web` for form validation. When adding a new schema, ensure:

- The inferred type `z.infer<typeof FooSchema>` matches the TS type in `src/types/`
- Or use `z.ZodType<Foo>` annotation to enforce it at the definition site

## Versioning Note

This package has no version gates — changes are reflected immediately in all consumers via `workspace:*` references. Breaking type changes (removing fields, narrowing types) require updating **all consumers in the same commit**. Run `pnpm typecheck` from the root to surface breakage across all packages before committing.

## Conventions

- Always import from `@topshelf/shared` (package root) — never from internal paths like `@topshelf/shared/src/types`.
- Test files are named `*.test.ts` and live in `src/` alongside the module they test.
- All source files must include the copyright header:
  ```ts
  /**
   * TopShelf Service LLC
   * PROPRIETARY AND CONFIDENTIAL
   * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
   */
  ```
- Run `pnpm --filter @topshelf/shared typecheck` after changes.
