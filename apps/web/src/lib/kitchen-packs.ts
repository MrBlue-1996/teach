/**
 * TopShelf Service LLC - Kitchen Content Pack Registry
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Central registry for kitchen challenge content packs. Static imports so
 * the bundler can tree-shake and the JSON is part of the client bundle.
 */

import type { ChallengeConfig } from '@topshelf/engine';

import ghostRecipe from '../../../../content-packs/kitchen/ghost-recipe.json';
import hazardScan from '../../../../content-packs/kitchen/hazard-scan.json';
import inventoryScramble from '../../../../content-packs/kitchen/inventory-scramble.json';
import laborPrep from '../../../../content-packs/kitchen/labor-prep.json';
import mockImpossible from '../../../../content-packs/kitchen/mock-impossible.json';
import rushHour from '../../../../content-packs/kitchen/rush-hour.json';
import stationSetup from '../../../../content-packs/kitchen/station-setup.json';
import tempCheck from '../../../../content-packs/kitchen/temp-check.json';
import ujFajitaRush from '../../../../content-packs/kitchen/uj-fajita-rush.json';
import ujEnchiladaRush from '../../../../content-packs/kitchen/uj-enchilada-rush.json';
import ujLineTemps from '../../../../content-packs/kitchen/uj-line-temps.json';
import ujGrillSetup from '../../../../content-packs/kitchen/uj-grill-setup.json';
import ujQuesoScale from '../../../../content-packs/kitchen/uj-queso-scale.json';
import ujAllergyOrder from '../../../../content-packs/kitchen/uj-allergy-order.json';

export type KitchenChallengeConfig = ChallengeConfig & {
  slug: string;
};

const PACKS: Record<string, KitchenChallengeConfig> = {
  'ghost-recipe': ghostRecipe as unknown as KitchenChallengeConfig,
  'hazard-scan': hazardScan as unknown as KitchenChallengeConfig,
  'inventory-scramble': inventoryScramble as unknown as KitchenChallengeConfig,
  'labor-prep': laborPrep as unknown as KitchenChallengeConfig,
  'mock-impossible': mockImpossible as unknown as KitchenChallengeConfig,
  'rush-hour': rushHour as unknown as KitchenChallengeConfig,
  'station-setup': stationSetup as unknown as KitchenChallengeConfig,
  'temp-check': tempCheck as unknown as KitchenChallengeConfig,
  'uj-fajita-rush': ujFajitaRush as unknown as KitchenChallengeConfig,
  'uj-enchilada-rush': ujEnchiladaRush as unknown as KitchenChallengeConfig,
  'uj-line-temps': ujLineTemps as unknown as KitchenChallengeConfig,
  'uj-grill-setup': ujGrillSetup as unknown as KitchenChallengeConfig,
  'uj-queso-scale': ujQuesoScale as unknown as KitchenChallengeConfig,
  'uj-allergy-order': ujAllergyOrder as unknown as KitchenChallengeConfig,
};

export function getPack(slug: string): KitchenChallengeConfig | null {
  if (!Object.hasOwn(PACKS, slug)) return null;
  // eslint-disable-next-line security/detect-object-injection
  return PACKS[slug] ?? null;
}

export function listPacks(): KitchenChallengeConfig[] {
  return Object.values(PACKS);
}
