/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { HuddleNotesStimulus } from './HuddleNotesStimulus';
import { MenuBoardStimulus } from './MenuBoardStimulus';
import { PlainTextStimulus } from './PlainTextStimulus';
import { StationStateStimulus } from './StationStateStimulus';
import { StepBankStimulus } from './StepBankStimulus';
import { TicketStimulus } from './TicketStimulus';
import type { ChallengeStimulus } from './types';

interface StimulusRendererProps {
  stimulus: ChallengeStimulus;
}

export function StimulusRenderer({ stimulus }: StimulusRendererProps) {
  switch (stimulus.kind) {
    case 'ticket':
      return <TicketStimulus stimulus={stimulus} />;
    case 'station_state':
      return <StationStateStimulus stimulus={stimulus} />;
    case 'huddle_notes':
      return <HuddleNotesStimulus stimulus={stimulus} />;
    case 'menu_board':
      return <MenuBoardStimulus stimulus={stimulus} />;
    case 'step_bank':
      return <StepBankStimulus stimulus={stimulus} />;
    case 'plain_text':
      return <PlainTextStimulus stimulus={stimulus} />;
    default:
      return null;
  }
}
