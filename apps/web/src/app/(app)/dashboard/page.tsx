'use client';

import {
  ArrowRight,
  Clock,
  Flame,
  Target,
  TrendingUp,
  Play,
  BookOpen,
  Award,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { learnerApi, contentApi, badgesApi } from '@/lib/api';
import { formatDuration, getLevelColor, getLevelName } from '@/lib/utils';

import type { LearnerState, LearningSession, ContentPack } from '@/lib/api';

interface DashboardData {
  states: LearnerState[];
  sessions: LearningSession[];
  packs: ContentPack[];
  badgeCount: number;
  isLoading: boolean;
  error: string | null;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    states: [],
    sessions: [],
    packs: [],
    badgeCount: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function loadDashboard() {
      try {
        // Fetch all dashboard data in parallel from real API endpoints
        const [statesRes, sessionsRes, packsRes, badgesRes] = await Promise.allSettled([
          learnerApi.getStates(),
          learnerApi.getRecentSessions(10),
          contentApi.getPacks({ limit: '20' }),
          badgesApi.getAll(),
        ]);

        const states = statesRes.status === 'fulfilled' ? statesRes.value.states : [];
        const sessions = sessionsRes.status === 'fulfilled' ? sessionsRes.value.sessions : [];
        const packs = packsRes.status === 'fulfilled' ? packsRes.value.packs : [];
        const badges = badgesRes.status === 'fulfilled' ? badgesRes.value.badges : [];

        setData({
          states,
          sessions,
          packs,
          badgeCount: badges.length,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        setData((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to load dashboard data',
        }));
      }
    }

    loadDashboard();
  }, []);

  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading dashboard</p>
          <p className="text-sm text-muted-foreground">{data.error}</p>
        </div>
      </div>
    );
  }

  // Derive dashboard metrics from real data
  const { states, sessions, packs, badgeCount } = data;

  // Current course: the most recently active learner state
  const currentState = states.length > 0 ? states[0] : null;

  // Total time from all states
  const totalBlocksCompleted = states.reduce((sum, s) => sum + (s.blocksCompleted || 0), 0);

  // Recent sessions for activity feed
  const recentSessions = sessions.slice(0, 3);

  // Packs user has NOT started (no learner state) for suggestions
  const enrolledPackIds = new Set(states.map((s) => s.contentPack.id).filter(Boolean));
  const suggestedPacks = packs.filter((p) => !enrolledPackIds.has(p.id)).slice(0, 2);

  // Compute streak from consecutive session days
  const streak = computeStreak(sessions);

  return (
    <div className="space-y-6 page-transition">
      {/* Welcome + Quick Stats */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Welcome back!</h1>
          <p className="text-muted-foreground">Ready to continue learning?</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-lg font-bold">{streak}</p>
              <p className="text-xs text-muted-foreground">day streak</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2">
            <Award className="h-5 w-5 text-primary" />
            <div>
              <p className="text-lg font-bold">{badgeCount}</p>
              <p className="text-xs text-muted-foreground">badges</p>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Learning - Primary CTA */}
      {currentState && currentState.contentPack && (
        <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${getLevelColor(currentState.currentMode)}`}
                  />
                  <span className="text-sm text-muted-foreground">
                    {getLevelName(currentState.currentMode)}
                  </span>
                </div>
                <h2 className="mb-1 text-xl font-semibold">{currentState.contentPack.title}</h2>
                <p className="text-muted-foreground">
                  {currentState.blocksCompleted} blocks completed - Mastery:{' '}
                  {Math.round(currentState.overallMastery * 100)}%
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="mb-1 flex justify-between text-sm">
                      <span>Mastery</span>
                      <span className="font-medium">
                        {Math.round(currentState.overallMastery * 100)}%
                      </span>
                    </div>
                    <Progress value={currentState.overallMastery * 100} className="h-2" />
                  </div>
                </div>
              </div>
              <Link href={`/learn/${currentState.contentPack.id}`}>
                <Button size="lg" className="w-full md:w-auto">
                  <Play className="mr-2 h-5 w-5" />
                  Continue
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats + Activity Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Progress Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <TrendingUp className="h-4 w-4 text-success" />
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold">{states.length}</p>
                <p className="text-xs text-muted-foreground">Courses active</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{badgeCount}</p>
                <p className="text-xs text-muted-foreground">Badges earned</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{totalBlocksCompleted}</p>
                <p className="text-xs text-muted-foreground">Blocks completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{sessions.length}</p>
                <p className="text-xs text-muted-foreground">Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Courses */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Target className="h-4 w-4 text-primary" />
              Active Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {states.length > 0 ? (
              <div className="space-y-3">
                {states.slice(0, 3).map((s) => (
                  <div key={s.id} className="flex items-start gap-2 text-sm">
                    <BookOpen className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 truncate">
                      <p className="truncate">{s.contentPack.title || 'Unknown course'}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.blocksCompleted} blocks - {Math.round(s.overallMastery * 100)}% mastery
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No courses started yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSessions.length > 0 ? (
              <div className="space-y-3">
                {recentSessions.map((session) => (
                  <div key={session.id} className="flex items-start gap-2 text-sm">
                    <BookOpen className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 truncate">
                      <p className="truncate">{session.contentPack?.title || 'Learning session'}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.blocksCompleted} blocks - {session.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent sessions</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Explore More */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Explore More Courses</h2>
          <Link href="/content" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suggestedPacks.map((pack) => (
            <Link key={pack.id} href={`/content/${pack.id}`}>
              <Card className="card-hover h-full cursor-pointer">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-medium">{pack.title}</h3>
                    <p className="text-sm text-muted-foreground">{pack.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
          <Link href="/content">
            <Card className="card-hover flex h-full cursor-pointer items-center justify-center border-dashed">
              <CardContent className="py-8 text-center">
                <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Browse all courses</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Compute streak as number of consecutive days with sessions (ending today or yesterday). */
function computeStreak(sessions: LearningSession[]): number {
  if (sessions.length === 0) {
    return 0;
  }

  const uniqueDays = new Set(
    sessions.filter((s) => s.startedAt).map((s) => new Date(s.startedAt).toISOString().slice(0, 10))
  );

  const sortedDays = Array.from(uniqueDays).sort().reverse();
  if (sortedDays.length === 0) {
    return 0;
  }

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Streak must include today or yesterday
  if (sortedDays[0] !== today && sortedDays[0] !== yesterday) {
    return 0;
  }

  let streak = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diffDays = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.round(diffDays) === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
