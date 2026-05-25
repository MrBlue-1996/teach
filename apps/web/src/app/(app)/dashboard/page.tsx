'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/ui/stat-card';
import { ImagePlaceholder, ImageBanner } from '@/components/ui/image-placeholder';
import {
  Flame,
  Target,
  TrendingUp,
  Play,
  BookOpen,
  Award,
  Clock,
  Zap,
  BarChart3,
  ArrowRight,
  GraduationCap,
  Wrench,
  FlaskConical,
  Cog,
  RefreshCw,
} from 'lucide-react';
import { getLevelColor, getLevelName } from '@/lib/utils';
import { learnerApi, contentApi, badgesApi } from '@/lib/api';
import type { LearnerState, LearningSession, ContentPack } from '@/lib/api';
import { pickGoldenPathPack } from '@/lib/golden-path';
import {
  computeDecayAffordance,
  formatNextDueLabel,
  type RetentionQueueSummary,
} from '@/lib/mastery-decay';

interface DashboardData {
  states: LearnerState[];
  sessions: LearningSession[];
  packs: ContentPack[];
  badgeCount: number;
  retentionQueue: RetentionQueueSummary | null;
  isLoading: boolean;
  error: string | null;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    states: [],
    sessions: [],
    packs: [],
    badgeCount: 0,
    retentionQueue: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [statesRes, sessionsRes, packsRes, badgesRes, retentionRes] =
          await Promise.allSettled([
            learnerApi.getStates(),
            learnerApi.getRecentSessions(10),
            contentApi.getPacks({ limit: '20' }),
            badgesApi.getAll(),
            learnerApi.getRetentionQueue(),
          ]);

        const states = statesRes.status === 'fulfilled' ? statesRes.value.states : [];
        const sessions = sessionsRes.status === 'fulfilled' ? sessionsRes.value.sessions : [];
        const packs = packsRes.status === 'fulfilled' ? packsRes.value.packs : [];
        const badges = badgesRes.status === 'fulfilled' ? badgesRes.value.badges : [];
        const retentionQueue = retentionRes.status === 'fulfilled' ? retentionRes.value : null;

        setData({
          states,
          sessions,
          packs,
          badgeCount: badges.length,
          retentionQueue,
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

  const { states, sessions, packs, badgeCount, retentionQueue } = data;
  const currentState = states.length > 0 ? states[0] : null;
  const totalBlocksCompleted = states.reduce((sum, s) => sum + (s.blocksCompleted || 0), 0);
  const recentSessions = sessions.slice(0, 3);
  const enrolledPackIds = new Set(states.map((s) => s.contentPack?.id).filter(Boolean));
  const suggestedPacks = packs.filter((p) => !enrolledPackIds.has(p.id)).slice(0, 3);
  const starterPack = pickGoldenPathPack(packs.filter((p) => !enrolledPackIds.has(p.id)));
  const decayAffordance = computeDecayAffordance(retentionQueue, null);
  const reviewPackHref =
    currentState?.contentPack?.id !== undefined
      ? `/learn/${currentState.contentPack.id}`
      : '/content';

  // Compute streak from consecutive session days
  const streak = computeStreak(sessions);

  return (
    <div className="space-y-6 page-transition">
      {/* Welcome Banner */}
      <ImageBanner gradient="bg-gradient-to-br from-topshelf-500/15 via-topshelf-400/5 to-transparent">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Welcome back!</h1>
            <p className="text-muted-foreground">Ready to continue your learning journey?</p>
          </div>
          <div className="flex gap-3">
            <Link href="/content">
              <Button>
                <BookOpen className="mr-2 h-4 w-4" />
                Browse Courses
              </Button>
            </Link>
          </div>
        </div>
      </ImageBanner>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Flame}
          label="Day Streak"
          value={streak}
          color="orange"
          change={streak > 0 ? 'Keep it up!' : ''}
          trend="up"
        />
        <StatCard icon={Award} label="Badges Earned" value={badgeCount} color="yellow" />
        <StatCard icon={GraduationCap} label="Courses Active" value={states.length} color="blue" />
        <StatCard icon={Zap} label="Blocks Completed" value={totalBlocksCompleted} color="purple" />
      </div>

      {/* Review Now — surfaces spaced-retrieval due queue when learner has items to refresh */}
      {decayAffordance.status !== 'healthy' && (
        <Card
          className={
            decayAffordance.status === 'urgent'
              ? 'border-2 border-destructive/40 bg-destructive/5'
              : 'border-2 border-warning/40 bg-warning/5'
          }
          data-testid="review-now-card"
        >
          <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <RefreshCw
                className={
                  decayAffordance.status === 'urgent'
                    ? 'mt-1 h-5 w-5 text-destructive'
                    : 'mt-1 h-5 w-5 text-warning'
                }
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">
                  {decayAffordance.status === 'urgent'
                    ? 'Several items need a refresh'
                    : `${decayAffordance.dueCount} ${decayAffordance.dueCount === 1 ? 'item' : 'items'} to review`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatNextDueLabel(decayAffordance.nextDueAt)} — short reviews keep what you've
                  learned sharp.
                </p>
              </div>
            </div>
            <Link href={reviewPackHref}>
              <Button
                size="lg"
                variant={decayAffordance.status === 'urgent' ? 'destructive' : 'default'}
              >
                Open review
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Continue Learning - Primary CTA */}
      {currentState && currentState.contentPack && (
        <Card className="overflow-hidden border-2 border-primary/20">
          <CardContent className="p-0">
            <div className="flex flex-col lg:flex-row">
              {/* Course Image */}
              <div className="lg:w-72">
                <ImagePlaceholder
                  type="image"
                  aspectRatio="video"
                  label={currentState.contentPack.title}
                  className="h-full rounded-none border-0 lg:aspect-auto"
                />
              </div>
              {/* Course Info */}
              <div className="flex flex-1 flex-col justify-between p-6">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${getLevelColor(currentState.currentMode)}`}
                    />
                    <span className="text-sm text-muted-foreground">
                      {getLevelName(currentState.currentMode)}
                    </span>
                    <span className="text-sm text-muted-foreground">-</span>
                    <span className="text-sm text-muted-foreground">
                      Continue where you left off
                    </span>
                  </div>
                  <h2 className="mb-1 text-xl font-semibold">{currentState.contentPack.title}</h2>
                  <p className="text-muted-foreground">
                    {currentState.blocksCompleted} blocks completed
                  </p>
                </div>
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span>Mastery Progress</span>
                    <span className="font-medium">
                      {Math.round(currentState.overallMastery * 100)}%
                    </span>
                  </div>
                  <Progress value={currentState.overallMastery * 100} className="h-2" />
                  <div className="mt-4">
                    <Link href={`/learn/${currentState.contentPack.id}`}>
                      <Button size="lg">
                        <Play className="mr-2 h-5 w-5" />
                        Continue Learning
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!currentState && starterPack && (
        <Card className="overflow-hidden border-2 border-primary/25 bg-gradient-to-r from-primary/10 to-transparent">
          <CardContent className="p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-primary">
                  Golden Path
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Start with {starterPack.title}</h2>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    This is the shortest path from signup to a real lesson. Open the{' '}
                    {starterPack.title} course, start the first block, and let the teaching engine
                    adapt from there.
                  </p>
                </div>
                <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                  <div>1. Open the pack</div>
                  <div>2. Start the first block</div>
                  <div>3. Ask for hints when stuck</div>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link href={`/learn/${starterPack.id}`}>
                  <Button size="lg" className="w-full sm:w-auto lg:w-full">
                    <Play className="mr-2 h-5 w-5" />
                    Start First Lesson
                  </Button>
                </Link>
                <Link href={`/content/${starterPack.id}`}>
                  <Button variant="outline" size="lg" className="w-full sm:w-auto lg:w-full">
                    Review Course
                  </Button>
                </Link>
              </div>
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
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Target className="h-4 w-4 text-primary" />
              Active Courses
            </CardTitle>
            <Link href="/content" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {states.length > 0 ? (
              <div className="space-y-3">
                {states.slice(0, 4).map((s) => (
                  <Link key={s.id} href={`/learn/${s.contentPack?.id}`}>
                    <div className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted">
                      <div className="hidden h-12 w-12 items-center justify-center rounded-lg bg-primary/10 sm:flex">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {s.contentPack?.title || 'Unknown course'}
                        </p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{s.blocksCompleted} blocks</span>
                          <span>{getLevelName(s.currentMode)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{Math.round(s.overallMastery * 100)}%</p>
                        <Progress value={s.overallMastery * 100} className="mt-1 h-1.5 w-20" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No courses started yet</p>
                <Link href="/content">
                  <Button variant="link" className="mt-2">
                    Browse courses
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Clock className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentSessions.length > 0 ? (
                <div className="space-y-3">
                  {recentSessions.map((session) => (
                    <div key={session.id} className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5 h-2 w-2 rounded-full bg-primary" />
                      <div className="flex-1">
                        <p className="truncate font-medium">
                          {session.contentPack?.title || 'Learning session'}
                        </p>
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

          {/* Weekly Progress Chart Placeholder */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <BarChart3 className="h-4 w-4 text-primary" />
                Weekly Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ImagePlaceholder
                type="animation"
                aspectRatio="video"
                label="Weekly Activity Chart"
              />
              <div className="mt-3 grid grid-cols-7 gap-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                  const heights = [40, 65, 30, 80, 55, 20, 70];
                  // eslint-disable-next-line security/detect-object-injection
                  const height = heights[i] ?? 0;
                  return (
                    <div key={day} className="flex flex-col items-center gap-1">
                      <div className="w-full rounded-sm bg-muted" style={{ height: 60 }}>
                        <div
                          className="w-full rounded-sm bg-primary/70 transition-all"
                          style={{ height: `${height}%`, marginTop: `${100 - height}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{day}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Access Sections */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Quick Access</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/tools">
            <Card className="card-hover cursor-pointer">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
                  <Wrench className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">Tools & Equipment</p>
                  <p className="text-xs text-muted-foreground">Browse lab resources</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/machines">
            <Card className="card-hover cursor-pointer">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/50">
                  <Cog className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-medium">Machines</p>
                  <p className="text-xs text-muted-foreground">Monitor equipment</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/ingredients">
            <Card className="card-hover cursor-pointer">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/50">
                  <FlaskConical className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium">Ingredients</p>
                  <p className="text-xs text-muted-foreground">Manage inventory</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/achievements">
            <Card className="card-hover cursor-pointer">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/50">
                  <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="font-medium">Achievements</p>
                  <p className="text-xs text-muted-foreground">View badges & progress</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Explore More Courses */}
      {suggestedPacks.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Explore More Courses</h2>
            <Link
              href="/content"
              className="flex items-center text-sm text-primary hover:underline"
            >
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suggestedPacks.map((pack) => (
              <Link key={pack.id} href={`/content/${pack.id}`}>
                <Card className="card-hover h-full cursor-pointer overflow-hidden">
                  <CardContent className="p-0">
                    <ImagePlaceholder
                      type="image"
                      aspectRatio="video"
                      label={pack.title}
                      className="rounded-none border-0"
                    />
                    <div className="p-4">
                      <h3 className="font-medium">{pack.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {pack.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
    const prevDay = sortedDays[i - 1];
    // eslint-disable-next-line security/detect-object-injection
    const currDay = sortedDays[i];
    if (!prevDay || !currDay) {
      break;
    }

    const prev = new Date(prevDay);
    const curr = new Date(currDay);
    const diffDays = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.round(diffDays) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
