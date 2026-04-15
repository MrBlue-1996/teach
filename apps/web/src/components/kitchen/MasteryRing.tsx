/**
 * TopShelf Service LLC - MasteryRing Component
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */
'use client';

import { clsx } from 'clsx';

interface MasteryRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  hidden?: boolean;
  className?: string;
}

export function MasteryRing({
  value,
  size = 96,
  strokeWidth = 10,
  label,
  hidden,
  className,
}: MasteryRingProps) {
  const normalized = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;

  const tone =
    normalized >= 80
      ? 'var(--kitchen-safe)'
      : normalized >= 50
        ? 'var(--kitchen-caution)'
        : 'var(--kitchen-danger)';

  return (
    <div className={clsx('mastery-ring', hidden && 'mastery-ring--hidden', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        {!hidden && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={tone}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy=".35em"
          className="mastery-ring__text"
          fill="white"
          fontSize={size / 4}
          fontWeight={700}
        >
          {hidden ? '?' : normalized}
        </text>
      </svg>
      {label && <span className="mastery-ring__label">{label}</span>}
    </div>
  );
}
