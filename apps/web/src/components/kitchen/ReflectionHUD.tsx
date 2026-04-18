/**
 * TopShelf Service LLC - ReflectionHUD Component
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * The "reveal" UI shown during CONSEQUENCE. Quantifies the hidden mistakes
 * in dollars, seconds lost, and safety risk — the moment the cook realizes
 * the game was never about speed.
 */
'use client';

import { clsx } from 'clsx';
import { DollarSign, Clock, AlertTriangle, TrendingDown } from 'lucide-react';
import type { ConsequencePayload, ChallengeEvent } from '@topshelf/engine';
import { GradeBadge } from './GradeBadge';

interface ReflectionHUDProps {
  consequence: ConsequencePayload;
  events: readonly ChallengeEvent[];
}

export function ReflectionHUD({ consequence, events }: ReflectionHUDProps) {
  return (
    <div className="reflection-hud">
      <header className="reflection-hud__header">
        <GradeBadge grade={consequence.overallGrade} size="lg" />
        <div className="reflection-hud__headline">
          <h2>{consequence.headline}</h2>
          <p className="reflection-hud__primary-domain">
            Primary failure: <strong>{consequence.primaryFailureDomain.replace('_', ' ')}</strong>
          </p>
        </div>
      </header>

      <div className="reflection-hud__metrics">
        <MetricCard
          icon={<DollarSign size={28} aria-hidden />}
          label="Total cost lost"
          value={`$${consequence.totalCostLost.toFixed(2)}`}
          severity="danger"
        />
        <MetricCard
          icon={<TrendingDown size={28} aria-hidden />}
          label="Product wasted"
          value={`$${consequence.productWasted.toFixed(2)}`}
          severity="caution"
        />
        <MetricCard
          icon={<Clock size={28} aria-hidden />}
          label="Ticket delay"
          value={`${consequence.ticketDelaySeconds}s`}
          severity="caution"
        />
        <MetricCard
          icon={<AlertTriangle size={28} aria-hidden />}
          label="Safety risks"
          value={`${consequence.safetyRisks.length}`}
          severity={consequence.safetyRisks.length > 0 ? 'danger' : 'safe'}
        />
      </div>

      {consequence.infractions.length > 0 && (
        <section className="reflection-hud__infractions">
          <h3>What you didn&apos;t know you did wrong</h3>
          <ol>
            {consequence.infractions.map((inf) => (
              <li key={inf.id} className="reflection-hud__infraction">
                <span className={clsx('sev-badge', `sev-${inf.severity}`)}>{inf.severity}</span>
                <div>
                  <strong>{inf.explanation}</strong>
                  <p>{inf.whyItMatters}</p>
                  <small>Cost impact: ${inf.costImpact.toFixed(2)}</small>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <details className="reflection-hud__replay">
        <summary>Replay timeline ({events.length} events)</summary>
        <ul className="reflection-hud__events">
          {events.slice(-20).map((ev) => (
            <li key={ev.id}>
              <time>{new Date(ev.timestamp).toLocaleTimeString()}</time>
              <code>{ev.type}</code>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  severity,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  severity: 'safe' | 'caution' | 'danger';
}) {
  return (
    <div className={clsx('metric-card', `metric-${severity}`)}>
      <div className="metric-card__icon">{icon}</div>
      <div className="metric-card__body">
        <span className="metric-card__label">{label}</span>
        <span className="metric-card__value">{value}</span>
      </div>
    </div>
  );
}
