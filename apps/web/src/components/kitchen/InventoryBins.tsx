/**
 * TopShelf Service LLC - InventoryBins Component
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */
'use client';

import { clsx } from 'clsx';
import { AlertOctagon } from 'lucide-react';
import type { Ingredient } from '@topshelf/engine';

interface InventoryBinsProps {
  ingredients: Ingredient[];
  onSelect: (ingredient: Ingredient) => void;
  selectedIds?: Set<string>;
  disabled?: boolean;
}

function daysUntil(useByDate: number): number {
  return Math.ceil((useByDate - Date.now()) / 86_400_000);
}

export function InventoryBins({
  ingredients,
  onSelect,
  selectedIds,
  disabled,
}: InventoryBinsProps) {
  return (
    <div className="inventory-grid" role="group" aria-label="Walk-in inventory">
      {ingredients.map((ing) => {
        const days = daysUntil(ing.useByDate);
        const expiringSoon = days <= 1 && !ing.isSpoiled;
        const isSelected = selectedIds?.has(ing.id);
        return (
          <button
            key={ing.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(ing)}
            className={clsx(
              'inventory-bin',
              ing.isSpoiled && 'spoiled',
              expiringSoon && 'expiring',
              isSelected && 'selected',
            )}
            aria-label={`Select ${ing.name}${ing.isSpoiled ? ' (spoiled)' : ''}`}
          >
            <span className="inventory-bin__category">{ing.category}</span>
            <span className="inventory-bin__name">{ing.name}</span>
            <span className="inventory-bin__meta">
              {ing.isSpoiled ? (
                <>
                  <AlertOctagon size={16} aria-hidden /> Spoiled
                </>
              ) : (
                <>Use in {days}d</>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
