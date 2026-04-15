/**
 * TopShelf Service LLC - StationCanvas Component
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Drag-and-drop mise en place grid. Slots are revealed as correct/incorrect
 * only in the Teach phase; during Solve the cook gets no feedback.
 */
'use client';

import { clsx } from 'clsx';
import { useState, type DragEvent } from 'react';
import type { StationPosition } from '@topshelf/engine';

interface StationItem {
  id: string;
  label: string;
  correctSlot?: string;
}

interface StationCanvasProps {
  slots: StationPosition[];
  items: StationItem[];
  revealCorrectness?: boolean;
  onPlace: (itemId: string, slotId: string) => void;
}

export function StationCanvas({
  slots,
  items,
  revealCorrectness = false,
  onPlace,
}: StationCanvasProps) {
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  const handleDragStart = (e: DragEvent<HTMLDivElement>, itemId: string) => {
    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, slotId: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId) return;
    setPlacements((prev) => ({ ...prev, [slotId]: itemId }));
    setDragOverSlot(null);
    onPlace(itemId, slotId);
  };

  const placedIds = new Set(Object.values(placements));
  const unplaced = items.filter((i) => !placedIds.has(i.id));

  return (
    <div className="station-canvas-wrap">
      <div
        className="station-canvas"
        style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}
        aria-label="Station layout"
      >
        {slots.map((slot) => {
          const placedItemId = placements[slot.slotId];
          const placedItem = items.find((i) => i.id === placedItemId);
          const isCorrect =
            revealCorrectness &&
            placedItem?.correctSlot === slot.slotId;
          const isIncorrect =
            revealCorrectness && placedItem && placedItem.correctSlot !== slot.slotId;

          return (
            <div
              key={slot.slotId}
              className={clsx(
                'station-slot',
                `zone-${slot.zone}`,
                placedItem && 'filled',
                isCorrect && 'correct',
                isIncorrect && 'incorrect',
                dragOverSlot === slot.slotId && 'drag-over',
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverSlot(slot.slotId);
              }}
              onDragLeave={() => setDragOverSlot(null)}
              onDrop={(e) => handleDrop(e, slot.slotId)}
              aria-label={`Slot ${slot.label}`}
            >
              <span className="station-slot__label">{slot.label}</span>
              {placedItem && <span className="station-slot__item">{placedItem.label}</span>}
            </div>
          );
        })}
      </div>

      <div className="station-tray" aria-label="Available items">
        {unplaced.map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, item.id)}
            className="station-tray__item"
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
