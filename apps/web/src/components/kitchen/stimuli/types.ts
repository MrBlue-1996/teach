/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

export interface TicketStimulusItem {
  readonly quantity: number;
  readonly name: string;
  readonly modifiers?: readonly string[];
  readonly cookTimeSeconds?: number;
}

export interface TicketStimulus {
  readonly kind: 'ticket';
  readonly table: string;
  readonly guests?: number;
  readonly server?: string;
  readonly time?: string;
  readonly items: readonly TicketStimulusItem[];
  readonly notes?: string;
}

export interface StationStateStimulus {
  readonly kind: 'station_state';
  readonly contextHeader?: string;
  readonly windowMinutes?: number;
  readonly observations: readonly string[];
}

export interface HuddleNotesStimulus {
  readonly kind: 'huddle_notes';
  readonly header?: string;
  readonly notes: readonly {
    readonly label: string;
    readonly detail: string;
  }[];
}

export interface MenuBoardStimulus {
  readonly kind: 'menu_board';
  readonly header?: string;
  readonly features?: readonly string[];
  readonly eightySixItems?: readonly string[];
  readonly notes?: readonly string[];
}

export interface StepBankStimulus {
  readonly kind: 'step_bank';
  readonly instruction?: string;
  readonly steps: readonly string[];
}

export interface PlainTextStimulus {
  readonly kind: 'plain_text';
  readonly monospace?: boolean;
  readonly lines: readonly string[];
}

export interface RecipeIngredient {
  readonly quantity: string;
  readonly item: string;
  readonly modifier?: string;
}

export interface RecipeStimulus {
  readonly kind: 'recipe';
  readonly title: string;
  readonly yields?: string;
  readonly prepTimeMinutes?: number;
  readonly cookTimeMinutes?: number;
  readonly ingredients: readonly RecipeIngredient[];
  readonly steps: readonly string[];
  readonly notes?: string;
  readonly imageRef?: string;
}

export interface ImageFocusRegion {
  readonly label: string;
  readonly xPct: number;
  readonly yPct: number;
  readonly widthPct: number;
  readonly heightPct: number;
}

export interface ImageStimulus {
  readonly kind: 'image';
  readonly imageRef: string;
  readonly altText: string;
  readonly caption?: string;
  readonly focusRegions?: readonly ImageFocusRegion[];
}

export type ChallengeStimulus =
  | TicketStimulus
  | StationStateStimulus
  | HuddleNotesStimulus
  | MenuBoardStimulus
  | StepBankStimulus
  | PlainTextStimulus
  | RecipeStimulus
  | ImageStimulus;
