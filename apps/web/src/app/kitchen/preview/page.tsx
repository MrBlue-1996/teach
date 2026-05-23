/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, Smartphone, ExternalLink } from 'lucide-react';
import { PhoneFrame, PHONE_SPECS, type PhoneModel } from '@/components/ui/PhoneFrame';
import { listPacks } from '@/lib/kitchen-packs';

const ROUTES = [
  { label: 'Kitchen Dashboard', path: '/kitchen' },
  { label: 'Recipe Book', path: '/kitchen/recipes' },
  { label: 'Mastery', path: '/kitchen/mastery' },
  ...listPacks().map((p) => ({
    label: `Challenge: ${p.title}`,
    path: `/kitchen/challenges/${p.slug}`,
  })),
];

const PHONE_MODELS = Object.entries(PHONE_SPECS).map(([id, spec]) => ({
  id: id as PhoneModel,
  label: spec.label,
  viewportWidth: spec.viewportWidth,
  viewportHeight: spec.viewportHeight,
}));

export default function PhoneEmulatorPage() {
  const [selectedRoute, setSelectedRoute] = useState(ROUTES[0]!.path);
  const [selectedModel, setSelectedModel] = useState<PhoneModel>('iphone-14');
  const [frameKey, setFrameKey] = useState(0);

  const currentRoute = ROUTES.find((r) => r.path === selectedRoute) ?? ROUTES[0]!;
  // eslint-disable-next-line security/detect-object-injection
  const selectedSpec = PHONE_SPECS[selectedModel];

  return (
    <div className="min-h-screen bg-[hsl(220,20%,5%)] text-[hsl(210,40%,95%)]">
      {/* Top bar */}
      <header className="flex items-center gap-4 border-b border-[hsl(220,15%,16%)] px-6 py-3">
        <Link
          href="/kitchen"
          className="flex items-center gap-2 text-sm text-[hsl(215,15%,55%)] transition-colors hover:text-[hsl(210,40%,95%)]"
        >
          <ArrowLeft size={16} aria-hidden /> Kitchen
        </Link>

        <div className="flex items-center gap-2">
          <Smartphone size={18} className="text-[hsl(217,91%,60%)]" aria-hidden />
          <h1 className="text-base font-bold">Phone Emulator</h1>
        </div>

        <span className="ml-2 rounded bg-[hsl(217,91%,20%)] px-2 py-0.5 text-xs font-semibold uppercase tracking-widest text-[hsl(217,91%,70%)]">
          Dev
        </span>
      </header>

      <div className="flex h-[calc(100vh-53px)] gap-0">
        {/* Sidebar controls */}
        <aside className="flex w-64 flex-shrink-0 flex-col gap-6 border-r border-[hsl(220,15%,16%)] p-5 overflow-y-auto">
          {/* Device selector */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[hsl(215,15%,55%)]">
              Device
            </h2>
            <div className="flex flex-col gap-2">
              {PHONE_MODELS.map(({ id, label, viewportWidth, viewportHeight }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedModel(id)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                    selectedModel === id
                      ? 'border-[hsl(217,91%,50%)] bg-[hsl(217,91%,15%)] text-[hsl(217,91%,80%)]'
                      : 'border-[hsl(220,15%,22%)] bg-transparent text-[hsl(215,15%,70%)] hover:border-[hsl(220,15%,35%)] hover:text-[hsl(210,40%,95%)]'
                  }`}
                >
                  {label}
                  <span className="ml-2 text-xs opacity-60">
                    {viewportWidth}×{viewportHeight}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Route selector */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[hsl(215,15%,55%)]">
              Route
            </h2>
            <div className="flex flex-col gap-1">
              {ROUTES.map((r) => (
                <button
                  key={r.path}
                  type="button"
                  onClick={() => {
                    setSelectedRoute(r.path);
                    setFrameKey((k) => k + 1);
                  }}
                  className={`rounded px-3 py-2 text-left text-sm transition-colors ${
                    selectedRoute === r.path
                      ? 'bg-[hsl(220,18%,18%)] font-semibold text-[hsl(210,40%,95%)]'
                      : 'text-[hsl(215,15%,60%)] hover:bg-[hsl(220,18%,14%)] hover:text-[hsl(210,40%,95%)]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </section>

          {/* Actions */}
          <section className="mt-auto flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setFrameKey((k) => k + 1)}
              className="flex items-center gap-2 rounded-lg border border-[hsl(220,15%,22%)] px-3 py-2 text-sm text-[hsl(215,15%,70%)] transition-colors hover:border-[hsl(220,15%,35%)] hover:text-[hsl(210,40%,95%)]"
            >
              <RotateCcw size={14} aria-hidden /> Reload
            </button>
            <a
              href={currentRoute.path}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-[hsl(220,15%,22%)] px-3 py-2 text-sm text-[hsl(215,15%,70%)] transition-colors hover:border-[hsl(220,15%,35%)] hover:text-[hsl(210,40%,95%)]"
            >
              <ExternalLink size={14} aria-hidden /> Open in tab
            </a>
          </section>
        </aside>

        {/* Emulator canvas */}
        <main className="flex flex-1 flex-col items-center justify-center gap-6 overflow-auto p-8">
          <p className="text-xs text-[hsl(215,15%,40%)]">
            {currentRoute.label} — {selectedSpec.label} ({selectedSpec.viewportWidth}×
            {selectedSpec.viewportHeight})
          </p>

          <PhoneFrame key={frameKey} model={selectedModel} src={selectedRoute} />

          <p className="text-xs text-[hsl(215,15%,35%)]">
            Scaled to fit · Touch targets ≥ 48 px · Chromebook-first design
          </p>
        </main>
      </div>
    </div>
  );
}
