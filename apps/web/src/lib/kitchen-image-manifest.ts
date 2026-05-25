/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import manifest from '../../public/kitchen/manifest.json';

export type KitchenImageSourceStatus =
  | 'demo'
  | 'authorized'
  | 'requires-client-source'
  | 'deprecated';

export interface KitchenImageEntry {
  path: string;
  altText: string;
  sourceDataStatus: KitchenImageSourceStatus;
  licenseRef: string | null;
  tags: readonly string[];
}

interface KitchenImageManifest {
  schemaVersion: string;
  defaultDimensions: { widthPx: number; heightPx: number };
  entries: Record<string, KitchenImageEntry>;
}

const typedManifest = manifest as KitchenImageManifest;

export function resolveKitchenImage(ref: string): KitchenImageEntry | null {
  // Manifest is bundled JSON at build time, not user input — safe lookup.
  // eslint-disable-next-line security/detect-object-injection
  return typedManifest.entries[ref] ?? null;
}

export function listKitchenImageRefs(): readonly string[] {
  return Object.keys(typedManifest.entries);
}

export function getKitchenImageManifest(): KitchenImageManifest {
  return typedManifest;
}
