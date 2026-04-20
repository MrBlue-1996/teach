'use client';

import { type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'green' | 'yellow' | 'orange' | 'purple' | 'red';
  className?: string;
}

const colorMap = {
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
  green: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400',
  yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400',
  orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400',
  purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400',
  red: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
};

const trendColors = {
  up: 'text-green-600 dark:text-green-400',
  down: 'text-red-600 dark:text-red-400',
  neutral: 'text-muted-foreground',
};

export function StatCard({
  icon: Icon,
  label,
  value,
  change,
  trend = 'neutral',
  color = 'blue',
  className,
}: StatCardProps) {
  return (
    <Card className={cn('card-hover', className)}>
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={cn('flex h-12 w-12 items-center justify-center rounded-full', colorMap[color])}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="text-2xl font-bold">{value}</p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{label}</p>
            {change && (
              <span className={cn('text-xs font-medium', trendColors[trend])}>{change}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
