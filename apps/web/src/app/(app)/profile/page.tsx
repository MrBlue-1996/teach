'use client';

import {
  User,
  Mail,
  Calendar,
  Award,
  Clock,
  TrendingUp,
  Settings,
  ExternalLink,
  BookOpen,
  Target,
  Flame,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/use-auth';
import { badgesApi, type Badge } from '@/lib/api/badges';
import { contentApi } from '@/lib/api/content';
import { learnerApi, type LearnerState } from '@/lib/api/learner';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    initials: '',
    joinedAt: '',
    plan: 'Free',
    stats: {
      totalHours: 0,
      coursesCompleted: 0,
      coursesInProgress: 0,
      badgesEarned: 0,
      currentStreak: 0,
      longestStreak: 0,
    },
    recentBadges: [] as { id: string; title: string; earnedAt: string }[],
    currentCourses: [] as { id: string; title: string; progress: number }[],
    completedCourses: [] as { id: string; title: string; completedAt: string }[],
  });

  useEffect(() => {
    async function loadProfile() {
      const name =
        authUser?.firstName && authUser.lastName
          ? `${authUser.firstName} ${authUser.lastName}`
          : (authUser?.email ?? 'User');
      const initials =
        authUser?.firstName && authUser.lastName
          ? `${authUser.firstName[0]}${authUser.lastName[0]}`.toUpperCase()
          : (authUser?.email[0] ?? 'U').toUpperCase();

      const base = {
        name,
        email: authUser?.email ?? '',
        initials,
        joinedAt: authUser?.createdAt ?? new Date().toISOString(),
        plan: 'Free',
        stats: {
          totalHours: 0,
          coursesCompleted: 0,
          coursesInProgress: 0,
          badgesEarned: 0,
          currentStreak: 0,
          longestStreak: 0,
        },
        recentBadges: [] as { id: string; title: string; earnedAt: string }[],
        currentCourses: [] as { id: string; title: string; progress: number }[],
        completedCourses: [] as { id: string; title: string; completedAt: string }[],
      };

      try {
        const [statesResult, badgesResult] = await Promise.allSettled([
          learnerApi.getStates(),
          badgesApi.getAll(),
        ]);

        if (statesResult.status === 'fulfilled') {
          const states = statesResult.value.states || [];
          base.stats.coursesInProgress = states.length;
          base.currentCourses = states.map((s: LearnerState) => ({
            id: s.contentPack.id,
            title: s.contentPack.title,
            progress: Math.round(s.overallMastery * 100),
          }));
        }

        if (badgesResult.status === 'fulfilled') {
          const allBadges = badgesResult.value.badges || [];
          const earned = allBadges.filter((b: Badge) => b.status === 'issued');
          base.stats.badgesEarned = earned.length;
          base.recentBadges = earned.slice(0, 3).map((b: Badge) => ({
            id: b.id,
            title: b.badgeType,
            earnedAt: b.issuedAt,
          }));
        }
      } catch {
        // Keep defaults
      }

      setUserData(base);
      setLoading(false);
    }
    loadProfile();
  }, [authUser]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="space-y-6 page-transition">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            {/* Avatar */}
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
              {userData.initials}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                <h1 className="text-2xl font-bold">{userData.name}</h1>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {userData.plan}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {userData.email}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined{' '}
                  {new Date(userData.joinedAt).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Actions */}
            <Link href="/settings">
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Clock}
          label="Learning Time"
          value={`${userData.stats.totalHours}h`}
          color="blue"
        />
        <StatCard
          icon={Award}
          label="Badges Earned"
          value={userData.stats.badgesEarned.toString()}
          color="yellow"
        />
        <StatCard
          icon={Flame}
          label="Current Streak"
          value={`${userData.stats.currentStreak} days`}
          color="orange"
        />
        <StatCard
          icon={Target}
          label="Best Streak"
          value={`${userData.stats.longestStreak} days`}
          color="green"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current Courses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5" />
              Current Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userData.currentCourses.length > 0 ? (
              <div className="space-y-4">
                {userData.currentCourses.map((course) => (
                  <Link key={course.id} href={`/learn/${course.id}`}>
                    <div className="rounded-lg border p-4 transition-colors hover:bg-muted">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium">{course.title}</span>
                        <span className="text-sm text-muted-foreground">{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-2" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <BookOpen className="mx-auto mb-2 h-8 w-8" />
                <p>No courses in progress</p>
                <Link href="/content">
                  <Button variant="link" className="mt-2">
                    Browse courses
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Badges */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="h-5 w-5" />
              Recent Badges
            </CardTitle>
            <Link href="/achievements" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {userData.recentBadges.length > 0 ? (
              <div className="space-y-3">
                {userData.recentBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
                        <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <span className="font-medium">{badge.title}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(badge.earnedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Award className="mx-auto mb-2 h-8 w-8" />
                <p>No badges earned yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed Courses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Completed Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userData.completedCourses.length > 0 ? (
              <div className="space-y-3">
                {userData.completedCourses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <span className="font-medium">{course.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(course.completedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <BookOpen className="mx-auto mb-2 h-8 w-8" />
                <p>No courses completed yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Public Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ExternalLink className="h-5 w-5" />
              Public Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Share your achievements and verified credentials with employers and colleagues.
            </p>
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="mb-2 text-sm font-medium">Your public profile URL:</p>
              <code className="block rounded bg-background p-2 text-xs">
                topshelfteaching.com/u/alex-johnson
              </code>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm">
                Copy Link
              </Button>
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  color: 'blue' | 'yellow' | 'orange' | 'green';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full',
            colorClasses[color]
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
