/**
 * TopShelf Service LLC - Kitchen Content Pack Registry
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Central registry for kitchen challenge content packs. Static imports so
 * the bundler can tree-shake and the JSON is part of the client bundle.
 */

import type { ChallengeConfig } from '@topshelf/engine';

import ujFajitaRush from '../../../../content-packs/kitchen/uj-fajita-rush.json';
import ujEnchiladaRush from '../../../../content-packs/kitchen/uj-enchilada-rush.json';
import ujLineTemps from '../../../../content-packs/kitchen/uj-line-temps.json';
import ujGrillSetup from '../../../../content-packs/kitchen/uj-grill-setup.json';
import ujQuesoScale from '../../../../content-packs/kitchen/uj-queso-scale.json';
import ujAllergyOrder from '../../../../content-packs/kitchen/uj-allergy-order.json';

const PACKS: Record<string, ChallengeConfig> = {
  'uj-fajita-rush': ujFajitaRush as unknown as ChallengeConfig,
  'uj-enchilada-rush': ujEnchiladaRush as unknown as ChallengeConfig,
  'uj-line-temps': ujLineTemps as unknown as ChallengeConfig,
  'uj-grill-setup': ujGrillSetup as unknown as ChallengeConfig,
  'uj-queso-scale': ujQuesoScale as unknown as ChallengeConfig,
  'uj-allergy-order': ujAllergyOrder as unknown as ChallengeConfig,
};

export function getPack(slug: string): ChallengeConfig | null {
  if (!Object.hasOwn(PACKS, slug)) return null;
  // eslint-disable-next-line security/detect-object-injection
  return PACKS[slug] ?? null;
}

export function listPacks(): ChallengeConfig[] {
  return Object.values(PACKS);
}
