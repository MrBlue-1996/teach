'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/ui/page-header';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { StatCard } from '@/components/ui/stat-card';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Target,
  Award,
  BookOpen,
  Calendar,
  Flame,
  Brain,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TimePeriod = '7d' | '30d' | '90d' | 'all';

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<TimePeriod>('30d');

  const periods: { id: TimePeriod; label: string }[] = [
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: '90d', label: '90 Days' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <div className="space-y-6 page-transition">
      <PageHeader
        title="Analytics"
        description="Track your learning performance and identify areas for improvement"
        icon={BarChart3}
        actions={
          <div className="flex gap-1 rounded-lg border p-1">
            {periods.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  period === p.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Top-level Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Clock}
          label="Study Time"
          value="47h 30m"
          color="blue"
          change="+12% vs last period"
          trend="up"
        />
        <StatCard
          icon={Target}
          label="Accuracy Rate"
          value="84%"
          color="green"
          change="+3%"
          trend="up"
        />
        <StatCard icon={Flame} label="Best Streak" value="21 days" color="orange" />
        <StatCard
          icon={Brain}
          label="Retention Score"
          value="91%"
          color="purple"
          change="+5%"
          trend="up"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Learning Progress Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ImagePlaceholder
              type="animation"
              aspectRatio="video"
              label="Mastery Growth Line Chart"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" />
              Daily Study Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ImagePlaceholder type="animation" aspectRatio="video" label="Study Time Bar Chart" />
          </CardContent>
        </Card>
      </div>

      {/* Skill Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-primary" />
            Skill Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <ImagePlaceholder type="animation" aspectRatio="square" label="Skill Radar Chart" />
            </div>
            <div className="space-y-4">
              {[
                { skill: 'Network Fundamentals', score: 92, change: '+8%', trend: 'up' as const },
                { skill: 'Routing & Switching', score: 78, change: '+12%', trend: 'up' as const },
                { skill: 'Security Concepts', score: 85, change: '+3%', trend: 'up' as const },
                { skill: 'Troubleshooting', score: 65, change: '-2%', trend: 'down' as const },
                { skill: 'Infrastructure', score: 71, change: '+5%', trend: 'up' as const },
                { skill: 'Network Operations', score: 88, change: '+7%', trend: 'up' as const },
              ].map((item) => (
                <div key={item.skill}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{item.skill}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex items-center text-xs',
                          item.trend === 'up' ? 'text-green-600' : 'text-red-600'
                        )}
                      >
                        {item.trend === 'up' ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {item.change}
                      </span>
                      <span className="font-medium">{item.score}%</span>
                    </div>
                  </div>
                  <Progress value={item.score} className="h-2" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Learning Mode Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Learning Mode Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ImagePlaceholder type="animation" aspectRatio="square" label="Mode Pie Chart" />
            <div className="mt-4 space-y-2">
              {[
                { mode: 'L1 Recall', percent: 15, color: 'bg-blue-500' },
                { mode: 'L2 Explain', percent: 25, color: 'bg-green-500' },
                { mode: 'L3 Apply', percent: 35, color: 'bg-yellow-500' },
                { mode: 'L4 Analyze', percent: 20, color: 'bg-orange-500' },
                { mode: 'L5 Expert', percent: 5, color: 'bg-purple-500' },
              ].map((item) => (
                <div key={item.mode} className="flex items-center gap-2 text-sm">
                  <div className={cn('h-3 w-3 rounded-full', item.color)} />
                  <span className="flex-1">{item.mode}</span>
                  <span className="font-medium">{item.percent}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Study Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-primary" />
              Study Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ImagePlaceholder
              type="animation"
              aspectRatio="square"
              label="GitHub-style Contribution Grid"
            />
          </CardContent>
        </Card>

        {/* Achievement Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4 text-primary" />
              Recent Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  event: 'Earned "Network Pro" badge',
                  time: '2 days ago',
                  icon: Award,
                  color: 'text-yellow-500',
                },
                {
                  event: 'Reached L3 Apply in Routing',
                  time: '4 days ago',
                  icon: Zap,
                  color: 'text-blue-500',
                },
                {
                  event: '21-day streak achieved',
                  time: '1 week ago',
                  icon: Flame,
                  color: 'text-orange-500',
                },
                {
                  event: 'Completed 100 blocks',
                  time: '2 weeks ago',
                  icon: Target,
                  color: 'text-green-500',
                },
                {
                  event: 'Started Cybersecurity course',
                  time: '3 weeks ago',
                  icon: BookOpen,
                  color: 'text-purple-500',
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <item.icon className={cn('h-4 w-4', item.color)} />
                    {i < 4 && <div className="mt-1 h-full w-px bg-border" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.event}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
