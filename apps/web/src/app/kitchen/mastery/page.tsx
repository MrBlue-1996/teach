'use client';

import Link from 'next/link';
import { ArrowLeft, ChefHat } from 'lucide-react';
import { MasteryRing } from '@/components/kitchen/MasteryRing';
import { useChallengeStore } from '@/stores/challenge-store';

const DOMAINS: { key: string; label: string; hidden?: boolean }[] = [
  { key: 'sanitation', label: 'Sanitation' },
  { key: 'food_safety', label: 'Food Safety' },
  { key: 'efficiency', label: 'Efficiency' },
  { key: 'sequencing', label: 'Sequencing' },
  { key: 'kitchen_math', label: 'Kitchen Math' },
  { key: 'waste_management', label: 'Waste Mgmt' },
  { key: 'speed', label: 'Speed' },
  { key: 'plating', label: 'Plating' },
  { key: 'judgment', label: 'Judgment', hidden: true },
  { key: 'inventory', label: 'Inventory' },
  { key: 'labor_cost', label: 'Labor $', hidden: true },
];

export default function MasteryPage() {
  const domainScores = useChallengeStore((s) => s.domainScores);
  const hasData = Object.values(domainScores).some((v) => v !== 100);

  const overall = Math.round(
    Object.entries(domainScores)
      .filter(([k]) => !DOMAINS.find((d) => d.key === k)?.hidden)
      .reduce((sum, [, v]) => sum + v, 0) / DOMAINS.filter((d) => !d.hidden).length
  );

  return (
    <main className="kitchen-page mastery-page">
      <header className="kitchen-nav">
        <Link href="/kitchen" className="kitchen-nav__back">
          <ArrowLeft size={20} aria-hidden /> Kitchen
        </Link>
      </header>

      <section className="kitchen-card mastery-hero">
        <ChefHat size={56} aria-hidden />
        <div>
          <h1>Your Mastery</h1>
          {hasData ? (
            <p>
              Overall rating: <strong>{overall}</strong> / 100
            </p>
          ) : (
            <p>Complete a challenge to see your mastery scores.</p>
          )}
          <p className="mastery-hero__sub">
            Keep plating. Some skills unlock as you rank up — there&apos;s more kitchen here than
            you know.
          </p>
        </div>
      </section>

      <section className="mastery-grid" aria-label="Mastery domains">
        {DOMAINS.map((d) => (
          <div key={d.key} className="mastery-grid__tile">
            <MasteryRing
              value={domainScores[d.key] ?? 0}
              label={d.label}
              {...(d.hidden !== undefined ? { hidden: d.hidden } : {})}
            />
            {d.hidden && <span className="mastery-grid__locked">Locked</span>}
          </div>
        ))}
      </section>
    </main>
  );
}
