/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */
'use client';

import { useMemo, useState } from 'react';
import type { StepBankStimulus as StepBankStimulusData } from './types';

interface StepBankStimulusProps {
  stimulus: StepBankStimulusData;
}

export function StepBankStimulus({ stimulus }: StepBankStimulusProps) {
  const [ordered, setOrdered] = useState<string[]>(() => [...stimulus.steps]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const instruction =
    stimulus.instruction ??
    'Drag to reorder the steps into the cleanest sequence for this station.';

  const isSequential = useMemo(
    () => JSON.stringify(ordered) === JSON.stringify(stimulus.steps),
    [ordered, stimulus.steps]
  );

  const reorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= ordered.length) {
      return;
    }
    setOrdered((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return prev;
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  return (
    <section className="kitchen-card" aria-label="Step bank stimulus">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Step bank</h2>
        <span
          className={`rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide ${
            isSequential
              ? 'bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]'
              : 'bg-[hsl(var(--kitchen-caution))]/20 text-[hsl(var(--kitchen-caution))]'
          }`}
        >
          {isSequential ? 'In order' : 'Reorder needed'}
        </span>
      </header>

      <p className="mb-3 text-sm text-[hsl(var(--k-muted))]">{instruction}</p>

      <ul className="space-y-2">
        {ordered.map((step, index) => (
          <li
            key={`${step}-${index}`}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) {
                reorder(dragIndex, index);
              }
              setDragIndex(null);
            }}
            className="flex min-h-11 items-center justify-between rounded border border-[hsl(var(--k-border))] bg-[hsl(var(--k-bg-elevated,220_18%_14%))] p-2"
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded bg-[hsl(var(--k-muted))]/20 px-2 py-1 text-xs font-semibold">
                {index + 1}
              </span>
              <span>{step}</span>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                className="btn-action btn-ghost px-2 py-1 text-xs"
                onClick={() => reorder(index, index - 1)}
                aria-label={`Move step ${index + 1} up`}
              >
                Up
              </button>
              <button
                type="button"
                className="btn-action btn-ghost px-2 py-1 text-xs"
                onClick={() => reorder(index, index + 1)}
                aria-label={`Move step ${index + 1} down`}
              >
                Down
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
