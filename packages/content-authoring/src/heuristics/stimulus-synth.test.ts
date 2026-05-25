import { describe, it, expect } from 'vitest';
import { synthesizeStimulus, wrapForReview } from './stimulus-synth.js';
import { challengeStimulusSchema } from '@topshelf/shared';

describe('synthesizeStimulus', () => {
  it('skips when an existing stimulus is present', () => {
    const result = synthesizeStimulus({
      blockId: 'tb-1',
      content: 'Table T3 ordered 2 fajitas.',
      hasExistingStimulus: true,
    });
    expect(result.synthesized).toBe(false);
    if (!result.synthesized) {
      expect(result.reason).toMatch(/already has/);
    }
  });

  it('skips when no text is supplied', () => {
    const result = synthesizeStimulus({ blockId: 'tb-1' });
    expect(result.synthesized).toBe(false);
  });

  it('drafts a ticket stimulus from a table+items prompt', () => {
    const result = synthesizeStimulus({
      blockId: 'tb-1',
      content: 'Table T3 ordered 2 fajitas and 1 enchilada. What temp for the grill?',
    });
    expect(result.synthesized).toBe(true);
    if (result.synthesized) {
      expect(result.kind).toBe('ticket');
      if (result.stimulus.kind === 'ticket') {
        expect(result.stimulus.table).toBe('T3');
        expect(result.stimulus.items.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('drafts a recipe stimulus when ingredients/yield language appears', () => {
    const result = synthesizeStimulus({
      blockId: 'tb-2',
      content: 'Recipe: Hollandaise\n- 4 oz butter\n- 2 cups cream',
      canonicalSolution: '1. Warm cream\n2. Whisk in butter',
    });
    expect(result.synthesized).toBe(true);
    if (result.synthesized) {
      expect(result.kind).toBe('recipe');
      if (result.stimulus.kind === 'recipe') {
        expect(result.stimulus.title.length).toBeGreaterThan(0);
        expect(result.stimulus.ingredients.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('drafts huddle_notes for an 86 item callout', () => {
    const result = synthesizeStimulus({
      blockId: 'tb-3',
      content: 'Pre-shift huddle: 86 queso tonight. Manager said push the carnitas.',
    });
    expect(result.synthesized).toBe(true);
    if (result.synthesized) {
      expect(result.kind).toBe('huddle_notes');
    }
  });

  it('drafts station_state when station-specific words appear', () => {
    const result = synthesizeStimulus({
      blockId: 'tb-4',
      content: 'Grill at 400 degrees. Fryer empty. Cold station ready.',
    });
    expect(result.synthesized).toBe(true);
    if (result.synthesized) {
      expect(result.kind).toBe('station_state');
    }
  });

  it('drafts a menu_board from special or feature language', () => {
    const result = synthesizeStimulus({
      blockId: 'tb-menu',
      content: 'Special: roasted poblano tacos. Feature: agua fresca flight.',
    });
    expect(result.synthesized).toBe(true);
    if (result.synthesized) {
      expect(result.kind).toBe('menu_board');
      if (result.stimulus.kind === 'menu_board') {
        expect(result.stimulus.features).toEqual(['roasted poblano tacos', 'agua fresca flight']);
      }
    }
  });

  it('drafts step_bank from numbered solution steps', () => {
    const result = synthesizeStimulus({
      blockId: 'tb-5',
      content: 'Order of operations matters here.',
      canonicalSolution: '1. Wash hands\n2. Put on gloves\n3. Sanitize board',
    });
    expect(result.synthesized).toBe(true);
    if (result.synthesized) {
      expect(['step_bank', 'recipe']).toContain(result.kind);
    }
  });

  it('drafts plain_text for temperature-log prompts', () => {
    const result = synthesizeStimulus({
      blockId: 'tb-plain',
      content: 'Temperature log\n38F\n41F\n39F',
    });
    expect(result.synthesized).toBe(true);
    if (result.synthesized) {
      expect(result.kind).toBe('plain_text');
      if (result.stimulus.kind === 'plain_text') {
        expect(result.stimulus.lines).toEqual(['Temperature log', '38F', '41F', '39F']);
      }
    }
  });

  it('does not synthesize image stimuli without an author-provided imageRef', () => {
    const result = synthesizeStimulus({
      blockId: 'tb-image',
      content: 'Spot the hazard in the image and explain what is wrong with the photo.',
    });
    expect(result.synthesized).toBe(false);
    if (!result.synthesized) {
      expect(result.reason).toMatch(/no heuristic/);
    }
  });

  it('returns no-match for prompts that do not fit any heuristic', () => {
    const result = synthesizeStimulus({
      blockId: 'tb-6',
      content: 'Explain Ohms law.',
    });
    expect(result.synthesized).toBe(false);
    if (!result.synthesized) {
      expect(result.reason).toMatch(/no heuristic/);
    }
  });

  it('drafts always validate against challengeStimulusSchema', () => {
    const cases = [
      'Table T1 ordered 1 burger.',
      'Recipe: salsa\n- 2 cup tomato',
      'Pre-shift: 86 the special.',
      'Grill at 350 degrees.',
    ];
    for (const text of cases) {
      const result = synthesizeStimulus({ blockId: 'tb-x', content: text });
      if (result.synthesized) {
        const parsed = challengeStimulusSchema.safeParse(result.stimulus);
        expect(parsed.success).toBe(true);
      }
    }
  });
});

describe('wrapForReview', () => {
  it('attaches the review envelope alongside the stimulus', () => {
    const result = synthesizeStimulus({
      blockId: 'tb-1',
      content: 'Table T2 ordered 1 burger.',
    });
    expect(result.synthesized).toBe(true);
    if (result.synthesized) {
      const wrapped = wrapForReview(result);
      expect(wrapped.stimulus.kind).toBe('ticket');
      expect(wrapped._authorReview.needsReview).toBe(true);
      expect(wrapped._authorReview.heuristic).toMatch(/ticket/);
      expect(wrapped._authorReview.confidence).toBeGreaterThan(0);
    }
  });
});
