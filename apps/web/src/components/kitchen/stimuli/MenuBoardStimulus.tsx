/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import type { MenuBoardStimulus as MenuBoardStimulusData } from './types';

interface MenuBoardStimulusProps {
  stimulus: MenuBoardStimulusData;
}

export function MenuBoardStimulus({ stimulus }: MenuBoardStimulusProps) {
  return (
    <section className="kitchen-card" aria-label="Menu board stimulus">
      <h2 className="mb-3 text-base font-semibold">{stimulus.header ?? 'Menu board'}</h2>

      {stimulus.features && stimulus.features.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[hsl(var(--k-muted))]">
            Features
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {stimulus.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>
      )}

      {stimulus.eightySixItems && stimulus.eightySixItems.length > 0 && (
        <div className="mb-4 rounded border border-[hsl(var(--kitchen-danger))]/40 bg-[hsl(var(--kitchen-danger))]/10 p-3">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[hsl(var(--kitchen-danger-bright,0_84%_60%))]">
            86 list
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {stimulus.eightySixItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {stimulus.notes && stimulus.notes.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-[hsl(var(--k-muted))]">
          {stimulus.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
