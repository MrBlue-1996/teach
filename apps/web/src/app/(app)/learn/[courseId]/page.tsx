/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lightbulb,
  Loader2,
  MessageSquare,
  RotateCcw,
  Shield,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { cn, getLevelName } from '@/lib/utils';
import { contentApi, type ContentPackDetail } from '@/lib/api/content';
import { learnerApi } from '@/lib/api/learner';

interface LessonData {
  id: string;
  courseTitle: string;
  blockTitle: string;
  objective: string;
  learnerMode: string;
  targetMode: string;
  progressPercent: number;
  totalBlocks: number;
  currentBlock: number;
  blocksCompleted: number;
  estimatedTimeMinutes: number;
  content: {
    question: string;
    hints: string[];
    correctAnswer: string;
    explanation: string;
  };
}

interface LearnerContextState {
  blocksCompleted: number;
  masteryPercent: number;
  learnerMode: string;
  recentActivitySummary: string;
  inProbation: boolean;
}

interface SessionContextState {
  sessionId: string | null;
  teachingMode: number | null;
  deviceProfile: string | null;
}

interface GuidanceState {
  kind: 'adaptive' | 'static' | 'fallback';
  title: string;
  body: string;
  detail?: string;
}

interface CompletionState {
  message: string;
  blocksCompleted: number;
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase();
}

function getSupportLevelLabel(mode: number | null) {
  switch (mode) {
    case null:
      return 'Standard';
    case 0:
      return 'Quiet';
    case 1:
      return 'Hints';
    case 2:
      return 'Context';
    case 3:
      return 'Active';
    case 4:
      return 'Step by step';
    default:
      return 'Standard';
  }
}

function getSupportLevelNote(mode: number | null) {
  switch (mode) {
    case null:
      return 'Help is available when you ask.';
    case 0:
      return 'Help stays quiet unless you need it.';
    case 1:
      return 'Hints stay brief and on request.';
    case 2:
      return 'Hints use the current block and recent work.';
    case 3:
      return 'Support steps in earlier when you stall.';
    case 4:
      return 'Support can walk the block step by step.';
    default:
      return 'Help is available when you ask.';
  }
}

function getDeviceProfileLabel(profile: string | null) {
  switch (profile) {
    case null:
      return 'Web';
    case 'chromebook_low':
      return 'Chromebook low';
    case 'chromebook_standard':
      return 'Chromebook';
    case 'desktop_low':
      return 'Desktop low';
    case 'desktop_standard':
      return 'Desktop';
    case 'desktop_high':
      return 'Desktop high';
    default:
      return 'Web';
  }
}

function summarizeRecentActivity(
  recentActivity: Array<{ eventType: string; correctness: number | null }>
) {
  if (recentActivity.length === 0) {
    return 'No recent work yet.';
  }

  const completions = recentActivity.filter(
    (event) => event.eventType === 'completed' && (event.correctness ?? 0) >= 0.5
  ).length;
  const retries = recentActivity.filter(
    (event) => event.eventType === 'completed' && (event.correctness ?? 1) < 0.5
  ).length;
  const hints = recentActivity.filter((event) => event.eventType === 'hint_used').length;

  const parts: string[] = [];
  if (completions > 0) {
    parts.push(`${completions} completed`);
  }
  if (retries > 0) {
    parts.push(`${retries} retried`);
  }
  if (hints > 0) {
    parts.push(`${hints} hint${hints === 1 ? '' : 's'}`);
  }

  return parts.length > 0 ? parts.join(' · ') : 'Activity recorded.';
}

function extractMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unable to load learning content.';
}

export default function LearnPage({ params }: { params: { courseId: string } }) {
  const router = useRouter();
  const [pack, setPack] = useState<ContentPackDetail['pack'] | null>(null);
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [learnerContext, setLearnerContext] = useState<LearnerContextState | null>(null);
  const [sessionContext, setSessionContext] = useState<SessionContextState>({
    sessionId: null,
    teachingMode: null,
    deviceProfile: null,
  });
  const [guidance, setGuidance] = useState<GuidanceState | null>(null);
  const [completion, setCompletion] = useState<CompletionState | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [hintIndex, setHintIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sessionStartedAtRef = useRef<number | null>(null);
  const blockStartedAtRef = useRef<number | null>(null);

  function resetBlockUi() {
    setUserAnswer('');
    setHintIndex(0);
    setGuidance(null);
    setSubmitted(false);
    setIsCorrect(false);
    setShowExplanation(false);
    blockStartedAtRef.current = Date.now();
  }

  function getBlockElapsedSeconds() {
    if (!blockStartedAtRef.current) {
      return 0;
    }

    return Math.max(1, Math.round((Date.now() - blockStartedAtRef.current) / 1000));
  }

  function buildFallbackGuidance(reason: 'hint' | 'incorrect', nextHintIndex: number) {
    if (!lesson) {
      return null;
    }

    const staticHint = lesson.content.hints.at(nextHintIndex);
    if (staticHint) {
      return {
        guidance: {
          kind: 'static' as const,
          title: `Hint ${nextHintIndex + 1}`,
          body: staticHint,
          detail:
            lesson.content.hints.length > 1
              ? `${nextHintIndex + 1} of ${lesson.content.hints.length}`
              : 'Use this hint, then try again.',
        },
        nextHintIndex,
      };
    }

    if (reason === 'incorrect' && lesson.content.explanation) {
      return {
        guidance: {
          kind: 'fallback' as const,
          title: 'Next step',
          body: lesson.content.explanation,
          detail: 'Review the explanation, then try again.',
        },
        nextHintIndex,
      };
    }

    return {
      guidance: {
        kind: 'fallback' as const,
        title: 'Next step',
        body: 'No extra hint is available for this block yet. Review the prompt and try again.',
      },
      nextHintIndex,
    };
  }

  async function markBlockStarted(sessionId: string | null, blockId: string) {
    if (!sessionId) {
      return;
    }

    await learnerApi.recordEvent(sessionId, {
      blockId,
      eventType: 'started',
    });
  }

  async function loadBlock(
    packData: ContentPackDetail,
    activeSessionId: string | null,
    nextData?: {
      complete: boolean;
      blocksCompleted?: number;
      message?: string;
      nextBlock?: {
        id: string;
        blockId: string;
        title: string;
        objective: string;
        targetMode: string;
        sequenceOrder: number;
      };
      progress?: {
        completed: number;
        currentMode: string;
      };
    } | null
  ) {
    const blocks = packData.pack.blocks;
    const fallbackIndex = Math.min(
      packData.learnerProgress?.blocksCompleted ?? 0,
      blocks.length - 1
    );
    const blockSummary = nextData?.nextBlock
      ? (blocks.find((block) => block.blockId === nextData.nextBlock?.blockId) ?? {
          id: nextData.nextBlock.id,
          blockId: nextData.nextBlock.blockId,
          title: nextData.nextBlock.title,
          objective: nextData.nextBlock.objective,
          targetMode: nextData.nextBlock.targetMode,
          sequenceOrder: nextData.nextBlock.sequenceOrder,
          timeBudgetSeconds: 0,
        })
      : blocks.at(fallbackIndex);

    if (!blockSummary) {
      throw new Error('No blocks are available for this course.');
    }

    const [blockResult, progressResult] = await Promise.allSettled([
      contentApi.getBlock(params.courseId, blockSummary.blockId),
      learnerApi.getProgress(params.courseId),
    ]);

    const blockDetail = blockResult.status === 'fulfilled' ? blockResult.value : null;
    const progress = progressResult.status === 'fulfilled' ? progressResult.value : null;
    const contentRecord =
      blockDetail && typeof blockDetail.block.content === 'object' && blockDetail.block.content
        ? (blockDetail.block.content as Record<string, unknown>)
        : null;

    const hints = Array.isArray(blockDetail?.block.hints)
      ? blockDetail.block.hints.filter(
          (hint): hint is string => typeof hint === 'string' && hint.trim().length > 0
        )
      : [];

    const blockIndex = blocks.findIndex((block) => block.blockId === blockSummary.blockId);
    const blocksCompleted =
      nextData?.progress?.completed ??
      progress?.progress.blocksCompleted ??
      packData.learnerProgress?.blocksCompleted ??
      0;
    const masteryPercent = Math.round(
      (progress?.progress.overallMastery ?? packData.learnerProgress?.overallMastery ?? 0) * 100
    );
    const learnerMode =
      blockDetail?.learnerMode ??
      progress?.progress.currentMode ??
      packData.learnerProgress?.currentMode ??
      'L1_RECALL';

    setLesson({
      id: blockSummary.blockId,
      courseTitle: packData.pack.title,
      blockTitle: blockDetail?.block.title || blockSummary.title || 'Learning block',
      objective: blockSummary.objective || blockDetail?.block.objective || 'Complete this block.',
      learnerMode,
      targetMode: blockDetail?.block.targetMode || blockSummary.targetMode,
      progressPercent: masteryPercent,
      totalBlocks: packData.pack.totalBlocks,
      currentBlock: blockIndex >= 0 ? blockIndex + 1 : Math.max(blockSummary.sequenceOrder, 1),
      blocksCompleted,
      estimatedTimeMinutes:
        blockDetail?.block.timeBudgetSeconds && blockDetail.block.timeBudgetSeconds > 0
          ? Math.max(1, Math.round(blockDetail.block.timeBudgetSeconds / 60))
          : blockSummary.timeBudgetSeconds > 0
            ? Math.max(1, Math.round(blockSummary.timeBudgetSeconds / 60))
            : 15,
      content: {
        question:
          (typeof contentRecord?.question === 'string' && contentRecord.question) ||
          blockSummary.objective ||
          'Complete this block.',
        hints,
        correctAnswer:
          (typeof contentRecord?.correctAnswer === 'string' && contentRecord.correctAnswer) || '',
        explanation:
          (typeof contentRecord?.explanation === 'string' && contentRecord.explanation) || '',
      },
    });

    setLearnerContext({
      blocksCompleted,
      masteryPercent,
      learnerMode,
      recentActivitySummary: summarizeRecentActivity(progress?.recentActivity ?? []),
      inProbation: progress?.progress.inProbation ?? false,
    });

    resetBlockUi();
    await markBlockStarted(activeSessionId, blockSummary.blockId).catch(() => {});
  }

  async function advanceToNextBlock() {
    if (!pack || !lesson) {
      return;
    }

    setIsAdvancing(true);
    setErrorMessage(null);

    try {
      const nextData = await contentApi.getNextBlock(params.courseId);

      if (nextData.complete) {
        setCompletion({
          message: nextData.message || 'Course complete.',
          blocksCompleted: nextData.blocksCompleted ?? lesson.totalBlocks,
        });
        setLesson(null);

        if (sessionContext.sessionId) {
          await learnerApi.endSession(sessionContext.sessionId).catch(() => {});
        }
        return;
      }

      const refreshedPack = await contentApi.getPack(params.courseId);
      setPack(refreshedPack.pack);
      await loadBlock(refreshedPack, sessionContext.sessionId, nextData);
    } catch (error) {
      setErrorMessage(extractMessage(error));
    } finally {
      setIsAdvancing(false);
    }
  }

  async function requestGuidance(reason: 'hint' | 'incorrect') {
    if (!lesson) {
      return;
    }

    setIsHintLoading(true);

    const staticFallback = buildFallbackGuidance(reason, hintIndex);

    try {
      if (sessionContext.sessionId) {
        const response = await learnerApi.getTeachingGuidance(sessionContext.sessionId, {
          blockId: lesson.id,
          content: [lesson.content.question, lesson.content.explanation]
            .filter(Boolean)
            .join('\n\n'),
        });

        setSessionContext((current) => ({
          ...current,
          teachingMode:
            response.suggestedMode > (current.teachingMode ?? response.currentMode)
              ? response.suggestedMode
              : (current.teachingMode ?? response.currentMode),
        }));

        if (response.shouldTeach && response.content) {
          setGuidance({
            kind: 'adaptive',
            title: 'Next step',
            body: response.content,
            detail: 'Adjusted for this session.',
          });
          return;
        }
      }

      if (staticFallback) {
        setGuidance(staticFallback.guidance);
        setHintIndex(
          staticFallback.nextHintIndex +
            (reason === 'hint' && staticFallback.guidance.kind === 'static' ? 1 : 0)
        );
      }
    } catch {
      if (staticFallback) {
        setGuidance(staticFallback.guidance);
        setHintIndex(
          staticFallback.nextHintIndex +
            (reason === 'hint' && staticFallback.guidance.kind === 'static' ? 1 : 0)
        );
      }
    } finally {
      setIsHintLoading(false);
    }
  }

  async function handleShowHint() {
    if (!lesson) {
      return;
    }

    if (sessionContext.sessionId) {
      await learnerApi
        .recordEvent(sessionContext.sessionId, {
          blockId: lesson.id,
          eventType: 'hint_used',
          responseData: { hintIndex },
        })
        .catch(() => {});
    }

    await requestGuidance('hint');
  }

  function handleRetry() {
    setSubmitted(false);
    setIsCorrect(false);
    setShowExplanation(false);
    setErrorMessage(null);
  }

  async function handleSubmit() {
    if (!lesson || !userAnswer.trim()) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const hasAnswerKey = lesson.content.correctAnswer.trim().length > 0;
    const correct = hasAnswerKey
      ? normalizeAnswer(userAnswer) === normalizeAnswer(lesson.content.correctAnswer)
      : userAnswer.trim().length > 0;

    setSubmitted(true);
    setIsCorrect(correct);
    setShowExplanation(!correct);

    if (sessionContext.sessionId) {
      await learnerApi
        .recordEvent(sessionContext.sessionId, {
          blockId: lesson.id,
          eventType: 'completed',
          correctness: correct ? 1 : 0,
          timeSpentSeconds: getBlockElapsedSeconds(),
          responseData: { answer: userAnswer },
        })
        .catch(() => {});
    }

    if (correct) {
      setGuidance(null);
      setLearnerContext((current) =>
        current
          ? {
              ...current,
              blocksCompleted: Math.min(current.blocksCompleted + 1, lesson.totalBlocks),
            }
          : current
      );
    } else {
      await requestGuidance('incorrect');
    }

    setIsSubmitting(false);
  }

  async function handleExit() {
    setIsExiting(true);

    if (sessionContext.sessionId) {
      await learnerApi.endSession(sessionContext.sessionId).catch(() => {});
    }

    router.push('/dashboard');
  }

  useEffect(() => {
    let cancelled = false;

    async function initializeLesson() {
      setLoading(true);
      setErrorMessage(null);
      setCompletion(null);
      sessionStartedAtRef.current = Date.now();
      blockStartedAtRef.current = Date.now();

      try {
        const deviceInfo = {
          userAgent: navigator.userAgent,
          deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
          hardwareConcurrency: navigator.hardwareConcurrency,
        };

        const [packResult, nextResult, sessionResult] = await Promise.allSettled([
          contentApi.getPack(params.courseId),
          contentApi.getNextBlock(params.courseId),
          learnerApi.startSession(params.courseId, deviceInfo),
        ]);

        if (packResult.status !== 'fulfilled') {
          throw packResult.reason;
        }

        const packData = packResult.value;
        const nextData = nextResult.status === 'fulfilled' ? nextResult.value : null;

        let activeSessionId: string | null = null;
        let teachingMode: number | null = null;
        let deviceProfile: string | null = null;

        if (sessionResult.status === 'fulfilled') {
          activeSessionId = sessionResult.value.sessionId;
          teachingMode = sessionResult.value.teaching?.mode ?? null;
          deviceProfile = sessionResult.value.teaching?.deviceProfile ?? null;
        } else {
          const recentSessions = await learnerApi.getRecentSessions(10).catch(() => null);
          activeSessionId =
            recentSessions?.sessions.find((session) => session.status === 'active')?.id ?? null;
        }

        if (cancelled) {
          return;
        }

        setPack(packData.pack);
        setSessionContext({
          sessionId: activeSessionId,
          teachingMode,
          deviceProfile,
        });

        if (nextData?.complete) {
          setCompletion({
            message: nextData.message || 'Course complete.',
            blocksCompleted: nextData.blocksCompleted ?? packData.pack.totalBlocks,
          });

          if (activeSessionId) {
            await learnerApi.endSession(activeSessionId).catch(() => {});
          }
          return;
        }

        await loadBlock(packData, activeSessionId, nextData);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(extractMessage(error));
          setLesson(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initializeLesson();

    return () => {
      cancelled = true;
    };
  }, [params.courseId]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!sessionStartedAtRef.current) {
        return;
      }

      setElapsedTime(Math.max(0, Math.round((Date.now() - sessionStartedAtRef.current) / 1000)));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ts-black">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (errorMessage && !lesson && !completion) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ts-black px-4 text-center text-ts-mist">
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        <Link href="/content">
          <Button>Back to Courses</Button>
        </Link>
      </div>
    );
  }

  if (completion) {
    return (
      <div className="flex min-h-screen flex-col bg-ts-black px-4 py-10 text-ts-mist">
        <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center">
          <Card className="relative w-full overflow-hidden border-ts-slate bg-ts-charcoal text-ts-mist">
            <Image
              src="/brand/topshelf-sisyphus-trace.svg"
              alt=""
              aria-hidden="true"
              width={320}
              height={320}
              className="pointer-events-none absolute -right-12 -top-10 hidden opacity-[0.07] md:block"
            />
            <CardContent className="relative space-y-6 p-8">
              <div className="space-y-2 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
                <h1 className="font-heading text-2xl font-bold">Course complete.</h1>
                <p className="text-sm text-muted-foreground">{completion.message}</p>
              </div>

              <div className="grid gap-3 rounded-xl border border-ts-slate bg-ts-black/40 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Blocks</p>
                  <p className="mt-1 text-lg font-semibold">{completion.blocksCompleted}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Session time
                  </p>
                  <p className="mt-1 text-lg font-semibold">{formatTime(elapsedTime)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button className="flex-1" onClick={() => router.push('/dashboard')}>
                  View Dashboard
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-ts-slate bg-transparent text-ts-mist hover:bg-ts-black/60 hover:text-ts-mist"
                  onClick={() => router.push('/content')}
                >
                  Browse Content
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return null;
  }

  const canRequestHint = lesson.content.hints.length > 0 || Boolean(sessionContext.sessionId);
  const canAdvance = submitted && isCorrect;

  return (
    <div className="flex min-h-screen flex-col bg-ts-black text-ts-mist">
      <header className="sticky top-0 z-50 border-b border-ts-slate bg-ts-black/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-ts-mist hover:bg-ts-charcoal hover:text-ts-mist"
            onClick={handleExit}
            loading={isExiting}
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Exit</span>
          </Button>

          <div className="flex flex-1 items-center justify-center gap-4 px-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {lesson.currentBlock} / {lesson.totalBlocks}
            </span>
            <Progress
              value={(lesson.currentBlock / lesson.totalBlocks) * 100}
              className="h-2 w-32 bg-ts-charcoal sm:w-52"
            />
            <span className="text-sm font-medium">{lesson.progressPercent}%</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {formatTime(elapsedTime)}
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-6" id="main-content">
        <div className="w-full max-w-3xl space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-ts-slate bg-ts-charcoal p-5">
            <Image
              src="/brand/topshelf-sisyphus-trace.svg"
              alt=""
              aria-hidden="true"
              width={280}
              height={280}
              className="pointer-events-none absolute -right-10 -top-12 hidden opacity-[0.08] md:block"
            />

            <div className="relative space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  {lesson.courseTitle}
                </p>
                <h1 className="mt-2 font-heading text-2xl font-bold">{lesson.blockTitle}</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{lesson.objective}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-ts-slate bg-ts-black/40 p-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Current level
                  </div>
                  <p className="mt-2 text-sm font-semibold">{getLevelName(lesson.learnerMode)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Target: {getLevelName(lesson.targetMode)}
                  </p>
                </div>

                <div className="rounded-xl border border-ts-slate bg-ts-black/40 p-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <Shield className="h-3.5 w-3.5" />
                    Support
                  </div>
                  <p className="mt-2 text-sm font-semibold">
                    {getSupportLevelLabel(sessionContext.teachingMode)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getSupportLevelNote(sessionContext.teachingMode)}
                  </p>
                </div>

                <div className="rounded-xl border border-ts-slate bg-ts-black/40 p-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Pace
                  </div>
                  <p className="mt-2 text-sm font-semibold">{lesson.estimatedTimeMinutes} min</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {lesson.blocksCompleted} block{lesson.blocksCompleted === 1 ? '' : 's'} done
                  </p>
                </div>

                <div className="rounded-xl border border-ts-slate bg-ts-black/40 p-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Session
                  </div>
                  <p className="mt-2 text-sm font-semibold">
                    {getDeviceProfileLabel(sessionContext.deviceProfile)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {learnerContext?.recentActivitySummary || 'No recent work yet.'}
                  </p>
                </div>
              </div>

              {learnerContext?.inProbation && (
                <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-ts-mist">
                  Stay with this block until it feels stable. Progress on this pack is being held
                  for consistency.
                </div>
              )}

              {errorMessage && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-ts-mist">
                  {errorMessage}
                </div>
              )}
            </div>
          </div>

          <Card className="overflow-hidden border-ts-slate bg-ts-charcoal text-ts-mist">
            <CardContent className="p-6">
              <div className="mb-6">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
                  <Zap className="h-4 w-4" />
                  Challenge
                </div>
                <p className="text-lg leading-relaxed">{lesson.content.question}</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    value={userAnswer}
                    onChange={(event) => setUserAnswer(event.target.value)}
                    disabled={submitted && isCorrect}
                    placeholder="Type your answer here."
                    className={cn(
                      'min-h-28 w-full resize-none rounded-xl border border-ts-slate bg-ts-black/70 p-4 font-mono text-sm text-ts-mist focus:outline-none focus:ring-2 focus:ring-ring',
                      submitted && isCorrect && 'border-success bg-success/10',
                      submitted && !isCorrect && 'border-destructive bg-destructive/10'
                    )}
                  />
                  {submitted && (
                    <div
                      className={cn(
                        'absolute right-3 top-3',
                        isCorrect ? 'text-success' : 'text-destructive'
                      )}
                    >
                      {isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <X className="h-5 w-5" />}
                    </div>
                  )}
                </div>

                {guidance && !isCorrect && (
                  <div
                    className={cn(
                      'rounded-xl border p-4',
                      guidance.kind === 'adaptive' && 'border-warning/40 bg-warning/10',
                      guidance.kind === 'static' && 'border-warning/30 bg-ts-black/50',
                      guidance.kind === 'fallback' && 'border-ts-slate bg-ts-black/40'
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-sm font-medium text-ts-mist">
                        <Lightbulb className="h-4 w-4 text-warning" />
                        {guidance.title}
                      </span>
                      {guidance.kind === 'static' && hintIndex < lesson.content.hints.length && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-ts-mist hover:bg-ts-black/60 hover:text-ts-mist"
                          onClick={handleShowHint}
                          disabled={isHintLoading}
                        >
                          Next hint
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-ts-mist">{guidance.body}</p>
                    {guidance.detail && (
                      <p className="mt-2 text-xs text-muted-foreground">{guidance.detail}</p>
                    )}
                  </div>
                )}

                {showExplanation && lesson.content.explanation && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
                      <MessageSquare className="h-4 w-4" />
                      Explanation
                    </div>
                    <p className="text-sm text-ts-mist">{lesson.content.explanation}</p>
                    {lesson.content.correctAnswer && (
                      <div className="mt-3 rounded-lg bg-ts-black/50 p-3 font-mono text-sm">
                        Correct answer:{' '}
                        <span className="text-success">{lesson.content.correctAnswer}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  {!submitted ? (
                    <>
                      {canRequestHint && (
                        <Button
                          variant="outline"
                          className="border-ts-slate bg-transparent text-ts-mist hover:bg-ts-black/60 hover:text-ts-mist"
                          onClick={handleShowHint}
                          loading={isHintLoading}
                        >
                          <Lightbulb className="mr-2 h-4 w-4" />
                          Need a hint?
                        </Button>
                      )}
                      <Button className="flex-1" onClick={handleSubmit} loading={isSubmitting}>
                        Check Answer
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {!isCorrect && (
                        <Button
                          variant="outline"
                          className="border-ts-slate bg-transparent text-ts-mist hover:bg-ts-black/60 hover:text-ts-mist"
                          onClick={handleRetry}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Try Again
                        </Button>
                      )}
                      {isCorrect && (
                        <Button
                          className="flex-1"
                          onClick={advanceToNextBlock}
                          loading={isAdvancing}
                        >
                          Continue
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {submitted && isCorrect && (
            <div className="rounded-xl border border-success/40 bg-success/10 p-4 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-success" />
              <p className="font-medium text-success">
                {lesson.content.correctAnswer ? 'Correct.' : 'Response saved.'}
              </p>
              <p className="text-sm text-muted-foreground">
                Block time: {formatTime(getBlockElapsedSeconds())}
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-ts-slate bg-ts-black px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            Previous unavailable
          </div>
          <span>
            Block {lesson.currentBlock} of {lesson.totalBlocks}
          </span>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {canAdvance ? 'Next block ready' : `${lesson.estimatedTimeMinutes} min target`}
          </div>
        </div>
      </footer>
    </div>
  );
}
