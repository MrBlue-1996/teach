'use client';

import {
  ArrowLeft,
  Clock,
  Users,
  Star,
  BookOpen,
  CheckCircle2,
  Play,
  Lock,
  Award,
  Target,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { contentApi, learnerApi } from '@/lib/api';
import { cn, getLevelName, getLevelGradientFrom } from '@/lib/utils';

import type { ContentPackDetail, ContentBlockSummary } from '@/lib/api';

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [packDetail, setPackDetail] = useState<ContentPackDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPack() {
      try {
        const detail = await contentApi.getPack(params.id);
        setPackDetail(detail);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load course details');
        setIsLoading(false);
      }
    }

    loadPack();
  }, [params.id]);

  const handleEnroll = async () => {
    setIsEnrolling(true);
    try {
      // Start a learning session, which creates the learner state on the backend
      await learnerApi.startSession(params.id);
      router.push(`/learn/${params.id}`);
    } catch (err) {
      setIsEnrolling(false);
      // If session start fails, still navigate as a fallback
      router.push(`/learn/${params.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading course details...</div>
      </div>
    );
  }

  if (error || !packDetail) {
    return (
      <div className="space-y-6 page-transition">
        <Link
          href="/content"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Content Library
        </Link>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-destructive mb-2">Error loading course</p>
            <p className="text-sm text-muted-foreground">{error || 'Course not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const { pack, learnerProgress } = packDetail;
  const hasProgress = learnerProgress !== null;
  const masteryPercent = hasProgress ? Math.round(learnerProgress.overallMastery * 100) : 0;

  return (
    <div className="space-y-6 page-transition">
      {/* Back Navigation */}
      <Link
        href="/content"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Content Library
      </Link>

      {/* Hero Section */}
      <div
        className={cn(
          'relative overflow-hidden rounded-xl p-6 md:p-8',
          'bg-gradient-to-br to-primary/50',
          getLevelGradientFrom(learnerProgress?.currentMode || 'L1_RECALL')
        )}
      >
        <div className="relative z-10">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-gray-800">
              {pack.certificationTarget || 'Course'}
            </span>
            {hasProgress && (
              <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white">
                {getLevelName(learnerProgress.currentMode)}
              </span>
            )}
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white md:text-3xl">{pack.title}</h1>
          <p className="mb-6 max-w-2xl text-white/90">{pack.description}</p>

          {/* Stats */}
          <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-white/90">
            <span className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {pack.totalBlocks} lessons
            </span>
            <span className="flex items-center gap-1">v{pack.version}</span>
            <span className="capitalize">{pack.status}</span>
          </div>

          {/* Progress bar if enrolled */}
          {hasProgress && (
            <div className="mb-6 max-w-md">
              <div className="mb-1 flex justify-between text-sm text-white/90">
                <span>Mastery</span>
                <span>{masteryPercent}%</span>
              </div>
              <Progress value={masteryPercent} className="h-2" />
              <p className="mt-1 text-sm text-white/80">
                {learnerProgress.blocksCompleted} of {pack.totalBlocks} blocks completed
              </p>
            </div>
          )}

          {/* CTA */}
          <Button size="lg" variant="secondary" onClick={handleEnroll} loading={isEnrolling}>
            <Play className="mr-2 h-5 w-5" />
            {hasProgress ? 'Continue Learning' : 'Start Learning'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Block List */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Course Content ({pack.totalBlocks} blocks)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pack.blocks.map((block, index) => {
                  const isCompleted = hasProgress && index < learnerProgress.blocksCompleted;
                  const isCurrent = hasProgress && block.blockId === learnerProgress.currentBlockId;

                  return (
                    <div
                      key={block.id}
                      className={cn(
                        'flex items-center justify-between rounded-lg border p-4',
                        isCurrent && 'border-primary bg-primary/5'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                            isCompleted
                              ? 'bg-success text-white'
                              : isCurrent
                                ? 'bg-primary text-white'
                                : 'bg-muted'
                          )}
                        >
                          {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{block.title}</p>
                          <p className="text-sm text-muted-foreground">{block.objective}</p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{getLevelName(block.targetMode)}</span>
                            {block.timeBudgetSeconds > 0 && (
                              <>
                                <span>-</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {Math.round(block.timeBudgetSeconds / 60)} min
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {!isCompleted && !isCurrent && (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                      {isCurrent && (
                        <span className="text-xs font-medium text-primary">Current</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pack Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Course Details</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <span>Certification: {pack.certificationTarget || 'General'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <BookOpen className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <span>{pack.totalBlocks} content blocks</span>
                </li>
                <li className="flex items-start gap-2">
                  <Target className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <span>Version {pack.version}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Enroll Card (Mobile) */}
          <Card className="lg:hidden">
            <CardContent className="p-4">
              <Button className="w-full" size="lg" onClick={handleEnroll} loading={isEnrolling}>
                <Play className="mr-2 h-5 w-5" />
                {hasProgress ? 'Continue Learning' : 'Start Learning'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
