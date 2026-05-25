/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { resolveKitchenImage } from '@/lib/kitchen-image-manifest';
import type { ImageStimulus as ImageStimulusData } from './types';

interface ImageStimulusProps {
  stimulus: ImageStimulusData;
}

export function ImageStimulus({ stimulus }: ImageStimulusProps) {
  const resolved = resolveKitchenImage(stimulus.imageRef);
  const isDemo = resolved?.sourceDataStatus === 'demo';

  if (!resolved) {
    return (
      <section
        className="kitchen-card border border-dashed border-[hsl(var(--k-border))] p-4 text-sm text-[hsl(var(--k-muted))]"
        aria-label="Image stimulus"
      >
        Image asset missing: {stimulus.imageRef}
      </section>
    );
  }

  return (
    <section className="kitchen-card" aria-label="Image stimulus">
      <div className="relative overflow-hidden rounded">
        {/* Using a plain img tag to keep this work-everywhere (no Next.js loader required for SVG demos). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={resolved.path} alt={stimulus.altText} className="block w-full" loading="eager" />

        {isDemo && (
          <span
            className="absolute right-2 top-2 rounded bg-[hsl(var(--kitchen-caution))] px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white"
            aria-label="Demo asset"
          >
            Demo
          </span>
        )}

        {stimulus.focusRegions?.map((region, index) => (
          <div
            key={`region-${index}`}
            className="absolute border-2 border-[hsl(var(--kitchen-info))] bg-[hsl(var(--kitchen-info))]/10"
            style={{
              left: `${region.xPct}%`,
              top: `${region.yPct}%`,
              width: `${region.widthPct}%`,
              height: `${region.heightPct}%`,
            }}
          >
            <span className="absolute bottom-0 left-0 bg-[hsl(var(--kitchen-info))] px-1 text-xs text-white">
              {region.label}
            </span>
          </div>
        ))}
      </div>

      {stimulus.caption && (
        <p className="mt-2 text-sm text-[hsl(var(--k-muted))]">{stimulus.caption}</p>
      )}
    </section>
  );
}
