/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import type { Metadata } from 'next';
import { Bell, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Notifications',
  description: 'Review activity and system notices for Top Shelf Teaching.',
};

const notifications = [
  {
    id: 'n-1',
    title: 'Daily challenge unlocked',
    description: 'Your next kitchen challenge is ready in the learning queue.',
    icon: CircleCheck,
    iconClassName: 'text-success',
    timeLabel: '2 hours ago',
  },
  {
    id: 'n-2',
    title: 'Skill review suggested',
    description: 'Revisit knife safety techniques to keep your streak stable.',
    icon: Info,
    iconClassName: 'text-primary',
    timeLabel: 'Yesterday',
  },
  {
    id: 'n-3',
    title: 'Profile action needed',
    description: 'Add a backup email to keep account recovery available.',
    icon: TriangleAlert,
    iconClassName: 'text-warning',
    timeLabel: '3 days ago',
  },
];

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Keep up with account updates and learning progress reminders.
          </p>
        </div>
        <Button variant="outline">Mark all read</Button>
      </header>

      <div className="space-y-3">
        {notifications.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className={`h-4 w-4 ${item.iconClassName}`} />
                  {item.title}
                </CardTitle>
                <CardDescription>{item.timeLabel}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/40">
        <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Bell className="h-4 w-4" />
          New notifications will appear here as progress and account events are recorded.
        </CardContent>
      </Card>
    </div>
  );
}
