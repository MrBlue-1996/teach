# `packages/content-authoring/src/cli/validate-packs.ts` — required changes

Four discrete changes. Apply in order. Each is small enough to do by hand.

## T2.B1 — Accept file/directory args + named export

Your `main()` likely scans `CANDIDATE_DIRECTORIES` with no args. Change it to:

1. Read `process.argv.slice(2)`.
2. If args present: validate each path (file or directory).
3. If empty: keep existing CANDIDATE_DIRECTORIES behavior.
4. Export the inner work as `validateContentPackArtifacts(inputPaths: string[]): Promise<ValidationIssue[]>` so `validate-packs.test.ts` can import it directly without spawning a subprocess.

Sketch:

```typescript
export async function validateContentPackArtifacts(
  inputPaths: string[]
): Promise<ValidationIssue[]> {
  const files = await resolveJsonFiles(inputPaths); // expand dirs, filter to *.json
  const issues: ValidationIssue[] = [];
  for (const file of files) {
    const raw = await fs.readFile(file, 'utf-8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      issues.push({ code: 'INVALID_JSON', path: file, message: String(e) });
      continue;
    }
    issues.push(...validateOneFile(file, parsed));
  }
  return issues;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const inputs = args.length > 0 ? args : CANDIDATE_DIRECTORIES; // preserve existing default
  const issues = await validateContentPackArtifacts(inputs);
  if (issues.length === 0) {
    console.log('[validate:packs] OK.');
    process.exit(0);
  } else {
    for (const issue of issues) {
      console.error(`${issue.code} at ${issue.path}: ${issue.message}`);
    }
    process.exit(1);
  }
}
```

## T2.B2 — Wire up `validateContentPack`

Inside `validateOneFile(file, parsed)`:

1. Detect shape:
   - Has `teachingBlocks` array → ContentPack manifest
   - `schemaVersion === 'resource-pack.v1'` → resource pack (existing carve-out, do not strict-validate)
   - kitchen-challenge shape (existing carve-out, do not strict-validate)
2. For ContentPack files: call your existing `validateContentPack(parsed, ...)` from the validation module, then append the new v0.1 rules from `content-validator.additions.ts`:

```typescript
import { runUjPackV01Rules } from '../validation/content-validator.js';

function validateOneFile(file: string, parsed: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // existing shape detection / resource-pack carve-outs go here

  if (looksLikeContentPack(parsed)) {
    const result = validateContentPack(parsed, {
      skipParityCheck: true,
      skipSignatureCheck: false,
    });
    issues.push(...result.issues);

    if (result.parsedPack) {
      issues.push(...runUjPackV01Rules(result.parsedPack));
    }

    issues.push(...validateFilenameIdMatch(file, parsed));
  }

  return issues;
}
```

## T2.B3 — Filename ↔ ID match

New function:

```typescript
function validateFilenameIdMatch(file: string, parsed: unknown): ValidationIssue[] {
  const basename = path.basename(file).replace(/\.json$/, '');
  if (!basename.startsWith('content_pack_')) return [];
  const expectedId = `pack-${basename.replace(/^content_pack_/, '').replace(/_/g, '-')}`;
  const actualId = (parsed as { id?: unknown })?.id;
  if (typeof actualId !== 'string' || actualId !== expectedId) {
    return [
      {
        code: 'FILENAME_ID_MISMATCH',
        path: file,
        message: `filename implies id "${expectedId}" but pack.id is "${String(actualId)}"`,
      },
    ];
  }
  return [];
}
```

Examples this passes:

- `content_pack_uncle_julios_v1.json` ↔ `pack-uncle-julios-v1` ✓
- `content_pack_linux_fundamentals_v1.json` ↔ `pack-linux-fundamentals-v1` ✓

## T2.B4 — Exit codes

- Errors present: print all, `process.exit(1)`
- Zero errors: print `[validate:packs] OK.`, `process.exit(0)`
- No early returns that bypass exit

Already covered in T2.B1 sketch above.

---

After all four changes:

```
pnpm --filter @topshelf/content-authoring typecheck
pnpm --filter @topshelf/content-authoring build
pnpm validate:content-packs   # against your existing pack — should still pass before pack rewrite
```
