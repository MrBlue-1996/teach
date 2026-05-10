/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import type { TicketStimulus as TicketStimulusData } from './types';

interface TicketStimulusProps {
  stimulus: TicketStimulusData;
}

export function TicketStimulus({ stimulus }: TicketStimulusProps) {
  return (
    <section className="kitchen-card" aria-label="Ticket stimulus">
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded bg-[hsl(var(--kitchen-danger))] px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          Ticket
        </span>
        <h2 className="text-base font-semibold">Table {stimulus.table}</h2>
        {stimulus.guests !== undefined && (
          <span className="text-sm text-[hsl(var(--k-muted))]">{stimulus.guests} guests</span>
        )}
      </header>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[hsl(var(--k-muted))]">
        {stimulus.server && <span>Server: {stimulus.server}</span>}
        {stimulus.time && <span>Time: {stimulus.time}</span>}
      </div>

      <ul className="space-y-2" aria-label="Ticket items">
        {stimulus.items.map((item, index) => (
          <li
            key={`${item.name}-${index}`}
            className="rounded border border-[hsl(var(--k-border))] p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">x{item.quantity}</span>
              <span className="font-medium">{item.name}</span>
              {item.cookTimeSeconds !== undefined && (
                <span className="rounded bg-[hsl(var(--kitchen-caution))]/20 px-2 py-1 text-xs font-semibold text-[hsl(var(--kitchen-caution))]">
                  {item.cookTimeSeconds}s
                </span>
              )}
            </div>
            {item.modifiers && item.modifiers.length > 0 && (
              <p className="mt-1 text-sm text-[hsl(var(--k-muted))]">
                {item.modifiers.join(' • ')}
              </p>
            )}
          </li>
        ))}
      </ul>

      {stimulus.notes && (
        <p className="mt-3 text-sm text-[hsl(var(--k-muted))]">Note: {stimulus.notes}</p>
      )}
    </section>
  );
}
