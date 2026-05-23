/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import type { Metadata } from 'next';
import { listPacks } from '@/lib/kitchen-packs';
import { RecipeCard } from '@/components/kitchen/RecipeCard';

export const metadata: Metadata = {
  title: 'Recipe Book | TopShelf Kitchen',
  description: 'Expert recipe specifications for every kitchen challenge.',
};

export default function RecipeBookPage() {
  const packs = listPacks();
  const entries = packs
    .filter((p) => p.expertRecipe !== null && p.expertRecipe !== undefined)
    .map((p) => ({ recipe: p.expertRecipe!, title: p.title, slug: p.slug }));

  return (
    <main className="kitchen-page">
      <header className="kitchen-nav">
        <Link href="/kitchen" className="kitchen-nav__back">
          <ArrowLeft size={20} aria-hidden /> Kitchen
        </Link>
        <div className="flex items-center gap-2">
          <BookOpen size={20} aria-hidden />
          <h1 className="text-xl font-bold">Recipe Book</h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        {entries.length === 0 ? (
          <div className="kitchen-card">
            <p className="text-[hsl(var(--k-muted))]">
              No expert recipes are embedded in the current challenge packs.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {entries.map(({ recipe, title, slug }) => (
              <section key={slug} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-[hsl(var(--k-muted))]">
                    {title}
                  </h2>
                  <Link
                    href={`/kitchen/challenges/${slug}`}
                    className="btn-action btn-ghost py-1 text-sm"
                  >
                    Challenge →
                  </Link>
                </div>
                <RecipeCard recipe={recipe} />
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
