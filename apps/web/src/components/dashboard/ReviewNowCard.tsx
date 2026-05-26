'use client';

import Link from 'next/link';
import { ArrowRight, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  formatNextDueLabel,
  type DecayAffordance,
} from '@/lib/mastery-decay';

interface ReviewNowCardProps {
  affordance: DecayAffordance;
  href: string;
  className?: string;
}

export function ReviewNowCard({ affordance, href, className }: ReviewNowCardProps) {
  if (affordance.status === 'healthy') {
    return null;
  }

  const isUrgent = affordance.status === 'urgent';
  const title = isUrgent
    ? 'Several items need a refresh'
    : `${affordance.dueCount} ${affordance.dueCount === 1 ? 'item' : 'items'} to review`;

  return (
    <Card
      className={cn(
        isUrgent
          ? 'border-2 border-destructive/40 bg-destructive/5'
          : 'border-2 border-warning/40 bg-warning/5',
        className
      )}
      data-testid="review-now-card"
    >
      <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <RefreshCw
            className={cn(
              'mt-1 h-5 w-5',
              isUrgent ? 'text-destructive' : 'text-warning'
            )}
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground">
              {formatNextDueLabel(affordance.nextDueAt)} - short reviews keep what you've learned
              sharp.
            </p>
          </div>
        </div>
        <Button asChild size="lg" variant={isUrgent ? 'destructive' : 'default'}>
          <Link href={href}>
            Open review
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
