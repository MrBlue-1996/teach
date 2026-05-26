import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReviewNowCard } from './ReviewNowCard';
import type { DecayAffordance } from '@/lib/mastery-decay';

function makeAffordance(overrides: Partial<DecayAffordance>): DecayAffordance {
  return {
    status: 'healthy',
    dueCount: 0,
    staleCount: 0,
    nextDueAt: null,
    ...overrides,
  };
}

describe('ReviewNowCard', () => {
  it('renders nothing for a healthy retention state', () => {
    const { container } = render(
      <ReviewNowCard affordance={makeAffordance({ status: 'healthy' })} href="/learn/pack-1" />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders watch-state due count and default review link', () => {
    const { container } = render(
      <ReviewNowCard
        affordance={makeAffordance({
          status: 'watch',
          dueCount: 1,
          nextDueAt: '2026-05-27T12:00:00.000Z',
        })}
        href="/learn/pack-1"
      />
    );

    expect(screen.getByText('1 item to review')).toBeTruthy();
    const link = screen.getByRole('link', { name: /open review/i });
    expect(link.getAttribute('href')).toBe('/learn/pack-1');
    expect(link.className).toContain('bg-primary');
    expect(container.querySelector('[data-testid="review-now-card"]')?.className).toContain(
      'border-warning'
    );
  });

  it('renders urgent-state copy and destructive review link', () => {
    const { container } = render(
      <ReviewNowCard
        affordance={makeAffordance({
          status: 'urgent',
          dueCount: 4,
          nextDueAt: '2026-05-20T12:00:00.000Z',
        })}
        href="/learn/pack-2"
      />
    );

    expect(screen.getByText('Several items need a refresh')).toBeTruthy();
    const link = screen.getByRole('link', { name: /open review/i });
    expect(link.getAttribute('href')).toBe('/learn/pack-2');
    expect(link.className).toContain('bg-destructive');
    expect(container.querySelector('[data-testid="review-now-card"]')?.className).toContain(
      'border-destructive'
    );
  });

  it('renders the no-schedule label when nextDueAt is null', () => {
    render(
      <ReviewNowCard
        affordance={makeAffordance({
          status: 'watch',
          dueCount: 2,
          nextDueAt: null,
        })}
        href="/learn/pack-1"
      />
    );

    expect(screen.getByText(/No reassessment scheduled/)).toBeTruthy();
  });
});
