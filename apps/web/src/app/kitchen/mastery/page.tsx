/**
 * TopShelf Service LLC - Mastery Dashboard
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Shows the cook's progression across all 12 mastery domains. Some domains
 * start hidden (locked) to preserve the "trojan horse" surprise of finding
 * out the real dimensions of kitchen skill.
 */
'use client';

import Link from 'next/link';
import { ArrowLeft, ChefHat } from 'lucide-react';
import { MasteryRing } from '@/components/kitchen/MasteryRing';

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
  { key: 'osha_safety', label: 'OSHA', hidden: true },
  { key: 'inventory', label: 'Inventory' },
  { key: 'labor_cost', label: 'Labor $', hidden: true },
];

const MOCK_SCORES: Record<string, number> = {
  sanitation: 78,
  food_safety: 82,
  efficiency: 64,
  sequencing: 55,
  kitchen_math: 71,
  waste_management: 60,
  speed: 89,
  plating: 74,
  judgment: 0,
  osha_safety: 0,
  inventory: 58,
  labor_cost: 0,
};

export default function MasteryPage() {
  const overall = Math.round(
    Object.entries(MOCK_SCORES)
      .filter(([k]) => !DOMAINS.find((d) => d.key === k)?.hidden)
      .reduce((sum, [, v]) => sum + v, 0) /
      DOMAINS.filter((d) => !d.hidden).length,
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
          <p>Overall rating: <strong>{overall}</strong> / 100</p>
          <p className="mastery-hero__sub">
            Keep plating. Some skills unlock as you rank up — there&apos;s more kitchen here than you know.
          </p>
        </div>
      </section>

      <section className="mastery-grid" aria-label="Mastery domains">
        {DOMAINS.map((d) => (
          <div key={d.key} className="mastery-grid__tile">
            <MasteryRing
              value={MOCK_SCORES[d.key] ?? 0}
              label={d.label}
              hidden={d.hidden}
            />
            {d.hidden && <span className="mastery-grid__locked">Locked</span>}
          </div>
        ))}
      </section>
    </main>
  );
}
