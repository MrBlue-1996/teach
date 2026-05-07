# `packages/shared/src/schemas/index.ts` additions

Append these named re-exports to your existing `index.ts`. They expose every new schema and type added in v0.1 so dependent packages can import them.

```typescript
// === BEGIN UJ-PACK-V0.1 EXPORTS ===
export {
  sourceDataStatusSchema,
  retentionSchema,
  trainerNotesSchema,
  recoveryPlaySchema,
  realWorldImpactSchema,
  contentLinksSchema,
  deviceConstraintsSchema,
  triggerRuleSchema,
} from './content.schema.js';

export type {
  SourceDataStatus,
  Retention,
  TrainerNotes,
  RecoveryPlay,
  RealWorldImpact,
  ContentLinks,
  DeviceConstraints,
  TriggerRule,
} from './content.schema.js';
// === END UJ-PACK-V0.1 EXPORTS ===
```

If your `index.ts` uses a single grouped re-export pattern (e.g. `export * from './content.schema.js'`), the new schemas are already covered transitively — but the explicit named exports above are recommended for clarity and grep-ability.

After saving, verify:
```
pnpm --filter @topshelf/shared typecheck
pnpm --filter @topshelf/shared build
```
