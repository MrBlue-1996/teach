'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Award,
  Trophy,
  Flame,
  Target,
  Clock,
  BookOpen,
  Share2,
  ExternalLink,
  Lock,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn, getLevelName } from '@/lib/utils';
import { badgesApi, type Badge } from '@/lib/api/badges';
import { learnerApi, type LearnerState } from '@/lib/api/learner';

interface DisplayBadge {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  earnedAt: string | null;
  verificationHash?: string;
  earned: boolean;
  progress?: number;
}

export default function AchievementsPage() {
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');
  const [badges, setBadges] = useState<DisplayBadge[]>([]);
  const [stats, setStats] = useState({
    totalBadges: 0,
    totalAvailable: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalHours: 0,
    coursesCompleted: 0,
    coursesInProgress: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [badgesResult, statesResult, sessionsResult] = await Promise.allSettled([
          badgesApi.getAll(),
          learnerApi.getStates(),
          learnerApi.getRecentSessions(100),
        ]);

        // Process badges
        if (badgesResult.status === 'fulfilled') {
          const apiBadges = badgesResult.value.badges || [];
          setBadges(
            apiBadges.map((b: Badge) => ({
              id: b.id,
              title: b.badgeType,
              description: `${b.contentPack?.certificationTarget || 'Achievement'} badge`,
              category: b.contentPack?.certificationTarget || '',
              level: b.level,
              earnedAt: b.issuedAt,
              earned: b.status === 'issued',
              progress: b.status === 'issued' ? 100 : Math.round(b.masteryScore * 100),
            }))
          );
          const earned = apiBadges.filter((b: Badge) => b.status === 'issued').length;
          setStats((prev) => ({ ...prev, totalBadges: earned, totalAvailable: apiBadges.length }));
        }

        // Compute stats from states
        if (statesResult.status === 'fulfilled') {
          const states = statesResult.value.states || [];
          const totalHours =
            states.reduce(
              (sum: number, s: LearnerState) =>
                sum + ((s as unknown as Record<string, number>).totalTimeSpentSeconds || 0),
              0
            ) / 3600;
          setStats((prev) => ({
            ...prev,
            totalHours: Math.round(totalHours),
            coursesInProgress: states.length,
          }));
        }

        // Compute streak from sessions
        if (sessionsResult.status === 'fulfilled') {
          const sessions = sessionsResult.value.sessions || [];
          const uniqueDays = new Set(
            sessions.map((s: { startedAt: string }) => new Date(s.startedAt).toDateString())
          );
          setStats((prev) => ({
            ...prev,
            currentStreak: uniqueDays.size,
            longestStreak: uniqueDays.size,
          }));
        }
      } catch {
        // Keep defaults on error
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const earnedBadges = badges.filter((b) => b.earned);
  const lockedBadges = badges.filter((b) => !b.earned);
  const filteredBadges =
    filter === 'all' ? badges : filter === 'earned' ? earnedBadges : lockedBadges;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Achievements</h1>
        <p className="text-muted-foreground">Your learning milestones and badges</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
              <Trophy className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalBadges}</p>
              <p className="text-sm text-muted-foreground">Badges Earned</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
              <Flame className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.currentStreak} days</p>
              <p className="text-sm text-muted-foreground">Current Streak</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalHours}h</p>
              <p className="text-sm text-muted-foreground">Time Invested</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.longestStreak} days</p>
              <p className="text-sm text-muted-foreground">Best Streak</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badges Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Badges</h2>
          <div className="flex gap-2">
            {(['all', 'earned', 'locked'] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f === 'all'
                  ? 'All'
                  : f === 'earned'
                    ? `Earned (${earnedBadges.length})`
                    : `Locked (${lockedBadges.length})`}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBadges.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </div>
      </div>

      {/* Certification Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5" />
            Certification Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">Linux+ Certification</span>
                <span className="text-sm text-muted-foreground">
                  {earnedBadges.length} / {badges.length} badges
                </span>
              </div>
              <Progress value={(earnedBadges.length / badges.length) * 100} className="h-2" />
              <p className="mt-2 text-sm text-muted-foreground">
                Complete all badges to earn your certification credential
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BadgeCard({ badge }: { badge: DisplayBadge }) {
  const [showShare, setShowShare] = useState(false);

  return (
    <Card className={cn('overflow-hidden', !badge.earned && 'opacity-75')}>
      <CardContent className="p-0">
        {/* Badge Header */}
        <div
          className={cn(
            'relative flex h-24 items-center justify-center',
            badge.earned
              ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
              : 'bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800'
          )}
        >
          {badge.earned ? (
            <Award className="h-12 w-12 text-white" />
          ) : (
            <Lock className="h-10 w-10 text-white/70" />
          )}
          <div className="absolute bottom-2 right-2">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                badge.earned ? 'bg-white/90 text-gray-800' : 'bg-black/20 text-white'
              )}
            >
              {getLevelName(badge.level)}
            </span>
          </div>
        </div>

        {/* Badge Info */}
        <div className="p-4">
          <div className="mb-1 flex items-start justify-between">
            <h3 className="font-semibold">{badge.title}</h3>
            {badge.earned && <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-success" />}
          </div>
          <p className="mb-3 text-sm text-muted-foreground">{badge.description}</p>

          {/* Progress or Date */}
          {badge.earned ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Earned {new Date(badge.earnedAt!).toLocaleDateString()}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setShowShare(!showShare)}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          ) : badge.progress !== undefined && badge.progress > 0 ? (
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span>{badge.progress}%</span>
              </div>
              <Progress value={badge.progress} className="h-1.5" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not started</p>
          )}

          {/* Share options */}
          {showShare && badge.earned && (
            <div className="mt-3 flex gap-2 border-t pt-3">
              <Button variant="outline" size="sm" className="flex-1 text-xs">
                Copy Link
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs">
                <ExternalLink className="mr-1 h-3 w-3" />
                Verify
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
