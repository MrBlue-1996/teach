import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getLevelColor(level: string): string {
  switch (level) {
    case 'L1_RECALL':
      return 'bg-blue-500';
    case 'L2_EXPLAIN':
      return 'bg-green-500';
    case 'L3_APPLY':
      return 'bg-yellow-500';
    case 'L4_ANALYZE':
      return 'bg-orange-500';
    case 'L5_EXPERT':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
}

export function getLevelGradientFrom(level: string): string {
  switch (level) {
    case 'L1_RECALL':
      return 'from-blue-500';
    case 'L2_EXPLAIN':
      return 'from-green-500';
    case 'L3_APPLY':
      return 'from-yellow-500';
    case 'L4_ANALYZE':
      return 'from-orange-500';
    case 'L5_EXPERT':
      return 'from-purple-500';
    default:
      return 'from-gray-500';
  }
}

export function getLevelName(level: string): string {
  switch (level) {
    case 'L1_RECALL':
      return 'Recall';
    case 'L2_EXPLAIN':
      return 'Explain';
    case 'L3_APPLY':
      return 'Apply';
    case 'L4_ANALYZE':
      return 'Analyze';
    case 'L5_EXPERT':
      return 'Expert';
    default:
      return level;
  }
}
