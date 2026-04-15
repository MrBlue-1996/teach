/**
 * TopShelf Service LLC - RecipeCard Component
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */
'use client';

import { clsx } from 'clsx';
import { Lock, Info } from 'lucide-react';
import { useState } from 'react';
import type { ExpertRecipe } from '@topshelf/engine';

interface RecipeCardProps {
  recipe: ExpertRecipe;
  locked?: boolean;
  highlightStepIds?: Set<string>;
}

export function RecipeCard({ recipe, locked, highlightStepIds }: RecipeCardProps) {
  const [openSteps, setOpenSteps] = useState<Set<string>>(new Set());

  if (locked) {
    return (
      <article className="recipe-card recipe-card--locked">
        <header>
          <Lock size={20} aria-hidden /> <h3>{recipe.name}</h3>
        </header>
        <p className="recipe-card__hint">Complete the challenge to unlock the expert spec.</p>
      </article>
    );
  }

  return (
    <article className="recipe-card">
      <header className="recipe-card__header">
        <h3>{recipe.name}</h3>
        <small>Target: {recipe.targetTimeSeconds}s · Station: {recipe.station}</small>
      </header>

      <ol className="recipe-card__steps">
        {recipe.steps.map((step) => {
          const isOpen = openSteps.has(step.id);
          const isHighlighted = highlightStepIds?.has(step.id);
          return (
            <li
              key={step.id}
              className={clsx(
                'recipe-step',
                isHighlighted && 'recipe-step--highlight',
                step.isCCP && 'recipe-step--ccp',
              )}
            >
              <div className="recipe-step__head">
                <strong>
                  {step.order}. {step.instruction}
                </strong>
                <button
                  type="button"
                  onClick={() =>
                    setOpenSteps((prev) => {
                      const next = new Set(prev);
                      if (next.has(step.id)) next.delete(step.id);
                      else next.add(step.id);
                      return next;
                    })
                  }
                  className="recipe-step__why"
                  aria-expanded={isOpen}
                >
                  <Info size={16} aria-hidden /> Why?
                </button>
              </div>
              {isOpen && <p className="recipe-step__explanation">{step.whyExplanation}</p>}
              <div className="recipe-step__meta">
                <span>{step.timeSeconds}s</span>
                {step.targetTemp && <span>{step.targetTemp}°F</span>}
                {step.isCCP && <span className="recipe-step__ccp">Critical control</span>}
              </div>
            </li>
          );
        })}
      </ol>

      <section className="recipe-card__ccps">
        <h4>Critical control points</h4>
        <ul>
          {recipe.criticalControlPoints.map((ccp) => (
            <li key={ccp.id}>
              <strong>{ccp.type}:</strong> {ccp.target} ({ccp.tolerance}). Miss: {ccp.consequence}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
