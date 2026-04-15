/**
 * TopShelf Service LLC - GradeBadge Component
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */
'use client';

import { clsx } from 'clsx';

type Grade = 'F' | 'D' | 'C' | 'B' | 'A' | 'A+';

interface GradeBadgeProps {
  grade: Grade;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function GradeBadge({ grade, size = 'md', className }: GradeBadgeProps) {
  const key = grade === 'A+' ? 'a-plus' : grade.toLowerCase();
  return (
    <div
      className={clsx('grade-badge', `grade-${key}`, `grade-badge--${size}`, className)}
      role="img"
      aria-label={`Grade ${grade}`}
    >
      {grade}
    </div>
  );
}
