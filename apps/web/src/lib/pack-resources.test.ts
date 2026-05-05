import { describe, expect, it } from 'vitest';

import {
  getResourcePack,
  getResourcePackId,
  resourcePackOptions,
  resourcePacks,
  withResourcePack,
} from './pack-resources';

describe('pack resource registry', () => {
  it("loads the visible Uncle Julio's JSON-backed resource pack", () => {
    expect(resourcePacks['uncle-julios'].ingredients.map((item) => item.id)).toContain(
      'uj-ingredient-1'
    );
    expect(resourcePacks['uncle-julios'].schemaVersion).toBe('resource-pack.v1');
  });

  it("only exposes Uncle Julio's as a selectable pack", () => {
    expect(resourcePackOptions.map((option) => [option.id, option.title])).toEqual([
      ['uncle-julios', "Uncle Julio's"],
    ]);
  });

  it("falls back to Uncle Julio's when the requested pack is missing or hidden", () => {
    expect(getResourcePackId(null)).toBe('uncle-julios');
    expect(getResourcePackId('linux')).toBe('uncle-julios');
    expect(getResourcePack('does-not-exist').id).toBe('uncle-julios');
  });

  it('keeps pack query params attached to resource routes', () => {
    expect(withResourcePack('/tools', 'uncle-julios')).toBe('/tools?pack=uncle-julios');
  });
});
