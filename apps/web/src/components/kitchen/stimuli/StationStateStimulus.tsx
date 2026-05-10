/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import type { StationStateStimulus as StationStateStimulusData } from './types';

interface StationStateStimulusProps {
  stimulus: StationStateStimulusData;
}

export function StationStateStimulus({ stimulus }: StationStateStimulusProps) {
  return (
    <section className="kitchen-card" aria-label="Station state stimulus">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{stimulus.contextHeader ?? 'Station state'}</h2>
        {stimulus.windowMinutes !== undefined && (
          <span className="rounded bg-[hsl(var(--kitchen-caution))]/20 px-2 py-1 text-xs font-semibold text-[hsl(var(--kitchen-caution))]">
            Window {stimulus.windowMinutes}m
          </span>
        )}
      </header>
      <ul className="list-disc space-y-2 pl-5 text-sm">
        {stimulus.observations.map((observation, index) => (
          <li key={`${index}-${observation}`}>{observation}</li>
        ))}
      </ul>
    </section>
  );
}
