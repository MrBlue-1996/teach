/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import type { ChallengeConfig } from '@topshelf/engine';
import type { ChallengeStimulus } from '@/components/kitchen/stimuli/types';

type KitchenConfigWithStimulus = ChallengeConfig & {
  stimulus?: ChallengeStimulus;
};

function asTicketStimulus(config: ChallengeConfig): ChallengeStimulus | null {
  const firstTicket = config.tickets?.[0];
  if (!firstTicket) return null;
  return {
    kind: 'ticket',
    table: String(firstTicket.orderNumber),
    time: `${firstTicket.timeWindowSeconds}s window`,
    items: firstTicket.items.map((item) => ({
      quantity: item.quantity,
      name: item.name,
      modifiers: item.modifiers,
    })),
    notes: firstTicket.isTrapped ? 'Contains a trap item. Read every modifier before firing.' : '',
  };
}

function getMappedStimulus(slug: string): ChallengeStimulus | null {
  switch (slug) {
    case 'uj-line-temps':
      return {
        kind: 'station_state',
        contextHeader: 'Line temperature snapshot',
        windowMinutes: 5,
        observations: [
          'Walk-in is drifting above target.',
          'Hot hold has been open every 90 seconds.',
          'Line reach-in door was left ajar.',
          'Manager audit starts at top of next hour.',
        ],
      };
    case 'uj-grill-setup':
      return {
        kind: 'step_bank',
        instruction: 'Reorder the setup sequence before first ticket fire.',
        steps: [
          'Start mesquite fire and build ember bed',
          'Set sani bucket at station edge',
          'Separate raw and cooked tongs',
          'Stock cold rail proteins and veg',
          'Preheat sizzle platters on side burner',
          'Verify grill surface 400F+',
        ],
      };
    case 'uj-queso-scale':
      return {
        kind: 'plain_text',
        monospace: true,
        lines: [
          'Target output: 3.5x house queso batch',
          'Base ratio: 4 lb cheese : 2 qt milk : 0.5 lb chorizo',
          'Keep final texture nappe-thick at service temp',
          'Hold above 140F, stir every 4 min to prevent split',
        ],
      };
    case 'uj-allergy-order':
      return {
        kind: 'huddle_notes',
        header: 'Allergy callout from expo',
        notes: [
          {
            label: 'Hard stop',
            detail:
              'Any shellfish allergy + shrimp request is impossible. Return to FOH for substitution.',
          },
          {
            label: 'Gluten check',
            detail: 'Flour tortillas are not gluten-free. Offer corn tortilla swap immediately.',
          },
          {
            label: 'Line rule',
            detail: 'Fire safe items now. Hold impossible items with explicit reason back to FOH.',
          },
        ],
      };
    case 'uj-enchilada-rush':
      return {
        kind: 'menu_board',
        header: 'Enchilada line board',
        features: ['Salsa carne enchiladas', 'Chicken enchiladas verdes', 'Combo plate build'],
        eightySixItems: ['Zero tolerance on gluten-free + flour tortilla conflict'],
        notes: ['Hatch chile sauce contains dairy.', 'Read modifiers before sauce selection.'],
      };
    default:
      return null;
  }
}

export function getSolveStimulus(slug: string, config: ChallengeConfig): ChallengeStimulus | null {
  const configWithStimulus = config as KitchenConfigWithStimulus;
  if (configWithStimulus.stimulus) {
    return configWithStimulus.stimulus;
  }

  if (slug === 'uj-fajita-rush') {
    return asTicketStimulus(config);
  }

  return getMappedStimulus(slug);
}
