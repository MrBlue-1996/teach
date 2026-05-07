/**
 * Integration tests for the validate-packs CLI.
 *
 * Imports `validateContentPackArtifacts` directly — does NOT mirror validator
 * logic in tests. The whole point of the fixture suite is that the real
 * validator returns the expected error code for each bad case.
 */

import { describe, it, expect } from 'vitest';
import path from 'node:path';
import url from 'node:url';
import { validateContentPackArtifacts } from './validate-packs.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '../fixtures/content-packs');

function fixture(...parts: string[]): string {
  return path.join(FIXTURES, ...parts);
}

async function codes(filePath: string): Promise<string[]> {
  const issues = await validateContentPackArtifacts([filePath]);
  return issues.map((i) => i.code);
}

describe('validate-packs CLI integration', () => {
  it('valid fixture produces zero issues', async () => {
    const issues = await validateContentPackArtifacts([
      fixture('valid-uncle-julios', 'content_pack_valid_fixture_v1.json'),
    ]);
    expect(issues).toEqual([]);
  });

  it('bad-missing-solve-first fires a schema-level error', async () => {
    const issueList = await codes(
      fixture(
        'bad-missing-solve-first',
        'content_pack_bad_missing_solve_first_v1.json',
      ),
    );
    expect(issueList.length).toBeGreaterThan(0);
  });

  it('bad-filename-id-mismatch fires FILENAME_ID_MISMATCH', async () => {
    const issueList = await codes(
      fixture('bad-filename-id-mismatch', 'content_pack_bad_filename_v1.json'),
    );
    expect(issueList).toContain('FILENAME_ID_MISMATCH');
  });

  it('bad-orphan-link fires UNCLE_JULIOS_ORPHAN_CONTENT_LINK', async () => {
    const issueList = await codes(
      fixture('bad-orphan-link', 'content_pack_bad_orphan_link_v1.json'),
    );
    expect(issueList).toContain('UNCLE_JULIOS_ORPHAN_CONTENT_LINK');
  });

  it('bad-over-response-cap fires TEXT_OVER_DEVICE_CAP', async () => {
    const issueList = await codes(
      fixture('bad-over-response-cap', 'content_pack_bad_over_cap_v1.json'),
    );
    expect(issueList).toContain('TEXT_OVER_DEVICE_CAP');
  });

  it('bad-help-threshold fires a schema-level error (discriminated union)', async () => {
    const issueList = await codes(
      fixture('bad-help-threshold', 'content_pack_bad_help_threshold_v1.json'),
    );
    expect(issueList.length).toBeGreaterThan(0);
  });

  it('bad-proprietary-claim fires UNAUTHORIZED_PROPRIETARY_CLAIM', async () => {
    const issueList = await codes(
      fixture('bad-proprietary-claim', 'content_pack_bad_proprietary_v1.json'),
    );
    expect(issueList).toContain('UNAUTHORIZED_PROPRIETARY_CLAIM');
  });

  it('bad-insufficient-reinforcement fires INSUFFICIENT_REINFORCEMENT', async () => {
    const issueList = await codes(
      fixture(
        'bad-insufficient-reinforcement',
        'content_pack_bad_reinforcement_v1.json',
      ),
    );
    expect(issueList).toContain('INSUFFICIENT_REINFORCEMENT');
  });

  it('bad-safety-trigger-too-lenient fires SAFETY_TRIGGER_TOO_LENIENT', async () => {
    const issueList = await codes(
      fixture(
        'bad-safety-trigger-too-lenient',
        'content_pack_bad_safety_trigger_v1.json',
      ),
    );
    expect(issueList).toContain('SAFETY_TRIGGER_TOO_LENIENT');
  });

  it('uncle-julios pack v0.1 validates clean against the real validator', async () => {
    // Path is relative to the repo root, not the test file. Adjust if your
    // test runner uses a different cwd.
    const repoRoot = path.resolve(__dirname, '../../../..');
    const packPath = path.join(
      repoRoot,
      'content-packs',
      'content_pack_uncle_julios_v1.json',
    );
    const issues = await validateContentPackArtifacts([packPath]);
    expect(issues).toEqual([]);
  });
});
