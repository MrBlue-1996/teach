/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import type { RecipeStimulus as RecipeStimulusData } from './types';

interface RecipeStimulusProps {
  stimulus: RecipeStimulusData;
}

export function RecipeStimulus({ stimulus }: RecipeStimulusProps) {
  const hasTimes = stimulus.prepTimeMinutes !== undefined || stimulus.cookTimeMinutes !== undefined;

  return (
    <section className="kitchen-card" aria-label="Recipe stimulus">
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded bg-[hsl(var(--kitchen-info))] px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          Recipe
        </span>
        <h2 className="text-base font-semibold">{stimulus.title}</h2>
        {stimulus.yields && (
          <span className="text-sm text-[hsl(var(--k-muted))]">Yields {stimulus.yields}</span>
        )}
      </header>

      {hasTimes && (
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[hsl(var(--k-muted))]">
          {stimulus.prepTimeMinutes !== undefined && (
            <span>Prep: {stimulus.prepTimeMinutes} min</span>
          )}
          {stimulus.cookTimeMinutes !== undefined && (
            <span>Cook: {stimulus.cookTimeMinutes} min</span>
          )}
        </div>
      )}

      <div className="mb-3">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[hsl(var(--k-muted))]">
          Ingredients
        </h3>
        <ul className="space-y-1" aria-label="Recipe ingredients">
          {stimulus.ingredients.map((ingredient, index) => (
            <li
              key={`${ingredient.item}-${index}`}
              className="flex flex-wrap items-baseline gap-2 text-sm"
            >
              <span className="font-mono text-xs text-[hsl(var(--k-muted))]">
                {ingredient.quantity}
              </span>
              <span className="font-medium">{ingredient.item}</span>
              {ingredient.modifier && (
                <span className="text-[hsl(var(--k-muted))]">— {ingredient.modifier}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[hsl(var(--k-muted))]">
          Steps
        </h3>
        <ol className="list-decimal space-y-1 pl-5" aria-label="Recipe steps">
          {stimulus.steps.map((step, index) => (
            <li key={`step-${index}`} className="text-sm">
              {step}
            </li>
          ))}
        </ol>
      </div>

      {stimulus.notes && (
        <p className="mt-3 text-sm text-[hsl(var(--k-muted))]">Note: {stimulus.notes}</p>
      )}
    </section>
  );
}
