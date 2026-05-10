/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import type { HuddleNotesStimulus as HuddleNotesStimulusData } from './types';

interface HuddleNotesStimulusProps {
  stimulus: HuddleNotesStimulusData;
}

export function HuddleNotesStimulus({ stimulus }: HuddleNotesStimulusProps) {
  return (
    <section className="kitchen-card" aria-label="Huddle notes stimulus">
      <h2 className="mb-3 text-base font-semibold">
        {stimulus.header ?? 'Pre-shift huddle notes'}
      </h2>
      <div className="space-y-2">
        {stimulus.notes.map((note) => (
          <article key={note.label} className="rounded border border-[hsl(var(--k-border))] p-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[hsl(var(--k-muted))]">
              {note.label}
            </h3>
            <p className="mt-1 text-sm">{note.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
