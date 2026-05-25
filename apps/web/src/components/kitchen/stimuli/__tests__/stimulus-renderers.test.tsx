import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StimulusRenderer } from '../StimulusRenderer';
import { TicketStimulus } from '../TicketStimulus';
import { StationStateStimulus } from '../StationStateStimulus';
import { HuddleNotesStimulus } from '../HuddleNotesStimulus';
import { MenuBoardStimulus } from '../MenuBoardStimulus';
import { StepBankStimulus } from '../StepBankStimulus';
import { PlainTextStimulus } from '../PlainTextStimulus';
import { RecipeStimulus } from '../RecipeStimulus';
import { ImageStimulus } from '../ImageStimulus';
import type { ChallengeStimulus } from '../types';

// ---------------------------------------------------------------------------
// StimulusRenderer — exhaustive switch
// ---------------------------------------------------------------------------

describe('StimulusRenderer', () => {
  it('routes ticket to TicketStimulus', () => {
    const s: ChallengeStimulus = {
      kind: 'ticket',
      table: 'T1',
      items: [{ quantity: 1, name: 'Fajita' }],
    };
    render(<StimulusRenderer stimulus={s} />);
    expect(screen.getByRole('region', { name: /ticket stimulus/i })).toBeTruthy();
  });

  it('routes station_state to StationStateStimulus', () => {
    const s: ChallengeStimulus = { kind: 'station_state', observations: ['Grill at temp'] };
    render(<StimulusRenderer stimulus={s} />);
    expect(screen.getByRole('region', { name: /station state stimulus/i })).toBeTruthy();
  });

  it('routes huddle_notes to HuddleNotesStimulus', () => {
    const s: ChallengeStimulus = {
      kind: 'huddle_notes',
      notes: [{ label: 'Note', detail: 'Detail' }],
    };
    render(<StimulusRenderer stimulus={s} />);
    expect(screen.getByRole('region', { name: /huddle notes stimulus/i })).toBeTruthy();
  });

  it('routes menu_board to MenuBoardStimulus', () => {
    const s: ChallengeStimulus = { kind: 'menu_board' };
    render(<StimulusRenderer stimulus={s} />);
    expect(screen.getByRole('region', { name: /menu board stimulus/i })).toBeTruthy();
  });

  it('routes step_bank to StepBankStimulus', () => {
    const s: ChallengeStimulus = { kind: 'step_bank', steps: ['Step 1', 'Step 2'] };
    render(<StimulusRenderer stimulus={s} />);
    expect(screen.getByRole('region', { name: /step bank stimulus/i })).toBeTruthy();
  });

  it('routes plain_text to PlainTextStimulus', () => {
    const s: ChallengeStimulus = { kind: 'plain_text', lines: ['Line one'] };
    render(<StimulusRenderer stimulus={s} />);
    expect(screen.getByRole('region', { name: /plain text stimulus/i })).toBeTruthy();
  });

  it('routes recipe to RecipeStimulus', () => {
    const s: ChallengeStimulus = {
      kind: 'recipe',
      title: 'Test Sauce',
      ingredients: [{ quantity: '2 cups', item: 'milk' }],
      steps: ['Warm milk', 'Whisk constantly'],
    };
    render(<StimulusRenderer stimulus={s} />);
    expect(screen.getByRole('region', { name: /recipe stimulus/i })).toBeTruthy();
  });

  it('routes image to ImageStimulus', () => {
    const s: ChallengeStimulus = {
      kind: 'image',
      imageRef: 'EQ1-equipment/grill',
      altText: 'Grill at temperature',
    };
    render(<StimulusRenderer stimulus={s} />);
    expect(screen.getByRole('region', { name: /image stimulus/i })).toBeTruthy();
  });

  it('returns null for unknown kind (exhaustive default)', () => {
    // Force an unknown kind past TypeScript — the default arm must render nothing
    const s = { kind: 'unknown_kind' } as unknown as ChallengeStimulus;
    const { container } = render(<StimulusRenderer stimulus={s} />);
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TicketStimulus
// ---------------------------------------------------------------------------

describe('TicketStimulus', () => {
  const base = {
    kind: 'ticket' as const,
    table: 'T3',
    items: [{ quantity: 2, name: 'Enchilada' }],
  };

  it('renders table name and item', () => {
    render(<TicketStimulus stimulus={base} />);
    expect(screen.getByText(/Table T3/i)).toBeTruthy();
    expect(screen.getByText('Enchilada')).toBeTruthy();
  });

  it('omits optional fields without error', () => {
    const { container } = render(<TicketStimulus stimulus={base} />);
    expect(container).toBeTruthy();
    expect(screen.queryByText(/guests/i)).toBeNull();
    expect(screen.queryByText(/Note:/i)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// StationStateStimulus
// ---------------------------------------------------------------------------

describe('StationStateStimulus', () => {
  it('renders observation text', () => {
    render(
      <StationStateStimulus
        stimulus={{ kind: 'station_state', observations: ['Grill at 400°F'] }}
      />
    );
    expect(screen.getByText('Grill at 400°F')).toBeTruthy();
  });

  it('omits header and window when not provided', () => {
    const { container } = render(
      <StationStateStimulus stimulus={{ kind: 'station_state', observations: ['Check temp'] }} />
    );
    expect(container).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// HuddleNotesStimulus
// ---------------------------------------------------------------------------

describe('HuddleNotesStimulus', () => {
  it('renders note label and detail', () => {
    render(
      <HuddleNotesStimulus
        stimulus={{ kind: 'huddle_notes', notes: [{ label: '86 item', detail: 'No queso today' }] }}
      />
    );
    expect(screen.getByText('86 item')).toBeTruthy();
    expect(screen.getByText('No queso today')).toBeTruthy();
  });

  it('uses default header when not provided', () => {
    render(
      <HuddleNotesStimulus
        stimulus={{ kind: 'huddle_notes', notes: [{ label: 'L', detail: 'D' }] }}
      />
    );
    expect(screen.getByText(/pre-shift huddle notes/i)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// MenuBoardStimulus
// ---------------------------------------------------------------------------

describe('MenuBoardStimulus', () => {
  it('renders without throwing when all optional fields are absent', () => {
    const { container } = render(<MenuBoardStimulus stimulus={{ kind: 'menu_board' }} />);
    expect(container).toBeTruthy();
  });

  it('renders 86 items visibly', () => {
    render(<MenuBoardStimulus stimulus={{ kind: 'menu_board', eightySixItems: ['Queso'] }} />);
    expect(screen.getByText('Queso')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// StepBankStimulus
// ---------------------------------------------------------------------------

describe('StepBankStimulus', () => {
  it('renders all steps', () => {
    render(
      <StepBankStimulus stimulus={{ kind: 'step_bank', steps: ['Wash hands', 'Put on gloves'] }} />
    );
    expect(screen.getByText('Wash hands')).toBeTruthy();
    expect(screen.getByText('Put on gloves')).toBeTruthy();
  });

  it('omits instruction when not provided', () => {
    const { container } = render(
      <StepBankStimulus stimulus={{ kind: 'step_bank', steps: ['A', 'B'] }} />
    );
    expect(container).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// PlainTextStimulus
// ---------------------------------------------------------------------------

describe('RecipeStimulus', () => {
  const base = {
    kind: 'recipe' as const,
    title: 'Hollandaise',
    ingredients: [
      { quantity: '4', item: 'egg yolks' },
      { quantity: '1 cup', item: 'butter', modifier: 'melted' },
    ],
    steps: ['Set up double boiler', 'Whisk yolks over heat'],
  };

  it('renders title, ingredients, and steps', () => {
    render(<RecipeStimulus stimulus={base} />);
    expect(screen.getByText('Hollandaise')).toBeTruthy();
    expect(screen.getByText('egg yolks')).toBeTruthy();
    expect(screen.getByText('butter')).toBeTruthy();
    expect(screen.getByText('Set up double boiler')).toBeTruthy();
  });

  it('renders modifier when present', () => {
    render(<RecipeStimulus stimulus={base} />);
    expect(screen.getByText(/melted/i)).toBeTruthy();
  });

  it('renders prep/cook times when provided', () => {
    render(<RecipeStimulus stimulus={{ ...base, prepTimeMinutes: 10, cookTimeMinutes: 15 }} />);
    expect(screen.getByText(/Prep: 10 min/i)).toBeTruthy();
    expect(screen.getByText(/Cook: 15 min/i)).toBeTruthy();
  });

  it('omits time row when not provided', () => {
    const { container } = render(<RecipeStimulus stimulus={base} />);
    expect(container.textContent).not.toMatch(/Prep:/);
    expect(container.textContent).not.toMatch(/Cook:/);
  });
});

describe('ImageStimulus', () => {
  it('renders the alt text on the img element', () => {
    render(
      <ImageStimulus
        stimulus={{
          kind: 'image',
          imageRef: 'EQ1-equipment/grill',
          altText: 'A grill at service temperature',
        }}
      />
    );
    const img = screen.getByAltText('A grill at service temperature');
    expect(img).toBeTruthy();
    expect(img.tagName).toBe('IMG');
  });

  it('shows the Demo badge for demo-status assets', () => {
    render(
      <ImageStimulus
        stimulus={{
          kind: 'image',
          imageRef: 'EQ1-equipment/grill',
          altText: 'Grill',
        }}
      />
    );
    expect(screen.getByLabelText(/demo asset/i)).toBeTruthy();
  });

  it('renders the missing-asset fallback when imageRef does not resolve', () => {
    render(
      <ImageStimulus
        stimulus={{ kind: 'image', imageRef: 'nonexistent/key', altText: 'Missing image asset' }}
      />
    );
    // The fallback region renders inside the same aria-label region wrapper
    expect(screen.getByText(/Image asset missing/i)).toBeTruthy();
  });

  it('renders focus regions when provided', () => {
    render(
      <ImageStimulus
        stimulus={{
          kind: 'image',
          imageRef: 'EQ1-equipment/grill',
          altText: 'Grill',
          focusRegions: [{ label: 'Hazard A', xPct: 10, yPct: 20, widthPct: 30, heightPct: 40 }],
        }}
      />
    );
    expect(screen.getByText('Hazard A')).toBeTruthy();
  });
});

describe('PlainTextStimulus', () => {
  it('renders line text', () => {
    render(<PlainTextStimulus stimulus={{ kind: 'plain_text', lines: ['Temp log entry'] }} />);
    expect(screen.getByText('Temp log entry')).toBeTruthy();
  });

  it('uses pre/monospace when monospace is true', () => {
    const { container } = render(
      <PlainTextStimulus stimulus={{ kind: 'plain_text', monospace: true, lines: ['code line'] }} />
    );
    expect(container.querySelector('pre')).toBeTruthy();
  });

  it('uses paragraph layout when monospace is false', () => {
    const { container } = render(
      <PlainTextStimulus stimulus={{ kind: 'plain_text', lines: ['line'] }} />
    );
    expect(container.querySelector('pre')).toBeNull();
    expect(container.querySelector('p')).toBeTruthy();
  });
});
