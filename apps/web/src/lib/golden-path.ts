/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

export interface GoldenPathPackLike {
  id: string;
  title: string;
  status?: string | null;
}

export function pickGoldenPathPack<T extends GoldenPathPackLike>(packs: T[]): T | null {
  if (packs.length === 0) {
    return null;
  }

  const publishedPacks = packs.filter((pack) => pack.status === 'published');
  const candidates = publishedPacks.length > 0 ? publishedPacks : packs;

  return (
    candidates.find((pack) => pack.title.toLowerCase().includes('linux fundamentals')) ??
    candidates.find((pack) => pack.title.toLowerCase().includes('linux')) ??
    candidates[0] ??
    null
  );
}

export function isGoldenPathPackTitle(title: string): boolean {
  return title.toLowerCase().includes('linux fundamentals');
}
