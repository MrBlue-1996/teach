/**
 * TopShelf Service LLC - TicketQueue Component
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */
'use client';

import { clsx } from 'clsx';
import { Flame, CheckCircle2 } from 'lucide-react';
import type { Ticket } from '@topshelf/engine';

interface TicketQueueProps {
  tickets: Ticket[];
  completedIds: Set<string>;
  activeTicketId?: string | null;
  onFire?: (id: string) => void;
  onComplete: (id: string) => void;
  startedAt: number;
}

function formatElapsed(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TicketQueue({
  tickets,
  completedIds,
  activeTicketId,
  onFire,
  onComplete,
  startedAt,
}: TicketQueueProps) {
  const now = Date.now();
  return (
    <div className="ticket-queue" role="list" aria-label="Order tickets">
      {tickets.map((t) => {
        const done = completedIds.has(t.id);
        return (
          <article
            key={t.id}
            role="listitem"
            className={clsx(
              'ticket',
              t.priority === 'rush' && 'rush',
              t.priority === 'vip' && 'vip',
              done && 'completed',
              activeTicketId === t.id && 'active',
            )}
          >
            <header className="ticket__header">
              <span className="ticket__number">#{t.orderNumber}</span>
              <span className="ticket__elapsed">{formatElapsed(now - startedAt)}</span>
            </header>
            <ul className="ticket__items">
              {t.items.map((item) => (
                <li key={item.id}>
                  {item.quantity}× {item.name}
                  {item.modifiers.length > 0 && (
                    <em className="ticket__mods"> — {item.modifiers.join(', ')}</em>
                  )}
                </li>
              ))}
            </ul>
            <footer className="ticket__actions">
              {onFire && !done && (
                <button
                  type="button"
                  className="btn-action btn-caution"
                  onClick={() => onFire(t.id)}
                  aria-label={`Fire ticket ${t.orderNumber}`}
                >
                  <Flame size={20} aria-hidden /> Fire
                </button>
              )}
              {!done && (
                <button
                  type="button"
                  className="btn-action btn-safe"
                  onClick={() => onComplete(t.id)}
                  aria-label={`Complete ticket ${t.orderNumber}`}
                >
                  <CheckCircle2 size={20} aria-hidden /> Done
                </button>
              )}
              {done && <span className="ticket__done-badge">Served</span>}
            </footer>
          </article>
        );
      })}
    </div>
  );
}
