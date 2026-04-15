/**
 * TopShelf Service LLC - DirtyHandTimer Component
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Hidden sanitation mechanic: shows an unobtrusive dot that turns red after
 * ~30s without handwashing. The cook is graded silently whether they notice.
 */
'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Droplets } from 'lucide-react';

interface DirtyHandTimerProps {
  lastHandwashAt: number | null;
  challengeStartedAt: number;
  onWash: () => void;
}

export function DirtyHandTimer({
  lastHandwashAt,
  challengeStartedAt,
  onWash,
}: DirtyHandTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const anchor = lastHandwashAt ?? challengeStartedAt;
  const elapsedSec = Math.max(0, Math.floor((now - anchor) / 1000));

  const state =
    elapsedSec < 15 ? 'hands-clean' : elapsedSec < 30 ? 'hands-warning' : 'hands-dirty';

  return (
    <button
      type="button"
      onClick={onWash}
      className={clsx('dirty-hand-indicator', state)}
      aria-label="Wash hands"
    >
      <Droplets size={20} aria-hidden />
      <span className="dirty-hand-indicator__time">{elapsedSec}s</span>
    </button>
  );
}
