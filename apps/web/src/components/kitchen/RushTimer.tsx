/**
 * TopShelf Service LLC - RushTimer Component
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */
'use client';

import { clsx } from 'clsx';

interface RushTimerProps {
  remainingMs: number;
  totalMs: number;
  className?: string;
  label?: string;
}

export function RushTimer({ remainingMs, totalMs, className, label }: RushTimerProps) {
  const pct = totalMs > 0 ? Math.max(0, remainingMs / totalMs) : 0;

  const severity =
    pct < 0.1
      ? 'timer-critical'
      : pct < 0.25
        ? 'timer-red'
        : pct < 0.5
          ? 'timer-amber'
          : 'timer-green';

  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;

  return (
    <div className={clsx('kitchen-timer', severity, className)} role="timer" aria-live="polite">
      {label && <span className="kitchen-timer__label">{label}</span>}
      <span className="kitchen-timer__value">
        {min.toString().padStart(2, '0')}:{sec.toString().padStart(2, '0')}
      </span>
    </div>
  );
}
