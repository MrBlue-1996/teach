/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { promotionPolicySchema } from '../packages/shared/src/schemas/policy.schema.ts';

function formatIssuePath(path) {
  return path.length > 0 ? path.join('.') : '(root)';
}

async function main() {
  const policyPath = resolve('governance/policies/promotion_policy_config.json');
  const raw = await readFile(policyPath, 'utf8');
  const parsed = JSON.parse(raw);

  // JSON schema metadata is useful for editors but not part of runtime schema payload.
  const { $schema: _schema, ...policyPayload } = parsed;
  const result = promotionPolicySchema.safeParse(policyPayload);

  if (!result.success) {
    console.error(`Policy validation failed: ${policyPath}`);
    for (const issue of result.error.issues) {
      console.error(`- ${formatIssuePath(issue.path)}: ${issue.message}`);
    }
    process.exit(1);
  }

  console.log(`Policy validation passed: ${policyPath}`);
}

main().catch((error) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(`Policy validation failed with an unexpected error:\n${message}`);
  process.exit(1);
});
