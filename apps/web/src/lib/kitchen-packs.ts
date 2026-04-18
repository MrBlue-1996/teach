/**
 * TopShelf Service LLC - Kitchen Content Pack Registry
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Central registry for kitchen challenge content packs. Static imports so
 * the bundler can tree-shake and the JSON is part of the client bundle.
 */

import type { ChallengeConfig } from '@topshelf/engine';

import rushHour from '../../../../content-packs/kitchen/rush-hour.json';
import stationSetup from '../../../../content-packs/kitchen/station-setup.json';
import tempCheck from '../../../../content-packs/kitchen/temp-check.json';
import ghostRecipe from '../../../../content-packs/kitchen/ghost-recipe.json';
import inventoryScramble from '../../../../content-packs/kitchen/inventory-scramble.json';
import laborPrep from '../../../../content-packs/kitchen/labor-prep.json';
import hazardScan from '../../../../content-packs/kitchen/hazard-scan.json';
import mockImpossible from '../../../../content-packs/kitchen/mock-impossible.json';

const PACKS: Record<string, ChallengeConfig> = {
  'rush-hour': rushHour as unknown as ChallengeConfig,
  'station-setup': stationSetup as unknown as ChallengeConfig,
  'temp-check': tempCheck as unknown as ChallengeConfig,
  'ghost-recipe': ghostRecipe as unknown as ChallengeConfig,
  'inventory-scramble': inventoryScramble as unknown as ChallengeConfig,
  'labor-prep': laborPrep as unknown as ChallengeConfig,
  'hazard-scan': hazardScan as unknown as ChallengeConfig,
  'mock-impossible': mockImpossible as unknown as ChallengeConfig,
};

export function getPack(slug: string): ChallengeConfig | null {
  return PACKS[slug] ?? null;
}

export function listPacks(): ChallengeConfig[] {
  return Object.values(PACKS);
}
