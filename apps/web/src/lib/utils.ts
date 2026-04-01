import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
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
  const colors: Record<string, string> = {
    L1_RECALL: 'bg-blue-500',
    L2_EXPLAIN: 'bg-green-500',
    L3_APPLY: 'bg-yellow-500',
    L4_ANALYZE: 'bg-orange-500',
    L5_EXPERT: 'bg-purple-500',
  };
  return colors[level] || 'bg-gray-500';
}

export function getLevelGradientFrom(level: string): string {
  const colors: Record<string, string> = {
    L1_RECALL: 'from-blue-500',
    L2_EXPLAIN: 'from-green-500',
    L3_APPLY: 'from-yellow-500',
    L4_ANALYZE: 'from-orange-500',
    L5_EXPERT: 'from-purple-500',
  };
  return colors[level] || 'from-gray-500';
}

export function getLevelName(level: string): string {
  const names: Record<string, string> = {
    L1_RECALL: 'Recall',
    L2_EXPLAIN: 'Explain',
    L3_APPLY: 'Apply',
    L4_ANALYZE: 'Analyze',
    L5_EXPERT: 'Expert',
  };
  return names[level] || level;
}
