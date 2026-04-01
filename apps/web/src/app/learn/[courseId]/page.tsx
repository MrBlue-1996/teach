'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  CheckCircle2,
  Clock,
  Zap,
  MessageSquare,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { contentApi, type ContentBlockDetail, type ContentPackDetail } from '@/lib/api/content';
import { learnerApi } from '@/lib/api/learner';

interface LessonData {
  id: string;
  courseTitle: string;
  blockTitle: string;
  level: string;
  progress: number;
  totalBlocks: number;
  currentBlock: number;
  estimatedTime: number;
  content: {
    type: string;
    question: string;
    hints: string[];
    correctAnswer: string;
    explanation: string;
  };
}

export default function LearnPage({ params }: { params: { courseId: string } }) {
  const router = useRouter();
  const [userAnswer, setUserAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Load content from API
  useEffect(() => {
    async function loadContent() {
      try {
        const [packResult, nextBlockResult] = await Promise.allSettled([
          contentApi.getPack(params.courseId),
          contentApi.getNextBlock(params.courseId),
        ]);

        let packData: ContentPackDetail | null = null;
        if (packResult.status === 'fulfilled') {
          packData = packResult.value;
        }

        // Start a learning session
        try {
          const session = await learnerApi.startSession(params.courseId);
          setSessionId(session.sessionId);
        } catch {
          // Session start may fail if one is already active
        }

        // Build lesson data from API response
        const pack = packData?.pack;
        const progress = packData?.learnerProgress;
        const blocks = pack?.blocks || [];
        const currentBlockIndex = progress?.currentBlockId
          ? blocks.findIndex((b) => b.blockId === progress.currentBlockId)
          : 0;

        let blockDetail: ContentBlockDetail | null = null;
        const targetBlock = blocks[currentBlockIndex >= 0 ? currentBlockIndex : 0];
        if (targetBlock && pack) {
          try {
            blockDetail = await contentApi.getBlock(pack.id, targetBlock.blockId);
          } catch {
            // Block detail may not be available
          }
        }

        const blockContent = blockDetail?.block?.content as Record<string, unknown> | undefined;
        const blockHints = blockDetail?.block?.hints as string[] | undefined;

        setLesson({
          id: targetBlock?.blockId || '1',
          courseTitle: pack?.title || 'Course',
          blockTitle: targetBlock?.title || blockDetail?.block?.title || 'Learning Block',
          level: targetBlock?.targetMode || blockDetail?.learnerMode || 'L2_EXPLAIN',
          progress: progress ? Math.round(progress.overallMastery * 100) : 0,
          totalBlocks: pack?.totalBlocks || blocks.length || 1,
          currentBlock: (currentBlockIndex >= 0 ? currentBlockIndex : 0) + 1,
          estimatedTime: targetBlock?.timeBudgetSeconds
            ? Math.round(targetBlock.timeBudgetSeconds / 60)
            : 15,
          content: {
            type: (blockContent?.type as string) || 'challenge',
            question:
              (blockContent?.question as string) ||
              targetBlock?.objective ||
              'Complete this learning block.',
            hints: blockHints || [],
            correctAnswer: (blockContent?.correctAnswer as string) || '',
            explanation: (blockContent?.explanation as string) || '',
          },
        });
      } catch {
        // Fallback: show error state
        setLesson(null);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, [params.courseId]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = () => {
    if (!lesson) return;
    const correct = lesson.content.correctAnswer
      ? userAnswer.trim().toLowerCase() === lesson.content.correctAnswer.toLowerCase()
      : false;
    setIsCorrect(correct);
    setSubmitted(true);
    if (!correct) {
      setShowExplanation(true);
    }
    // Record event if we have a session
    if (sessionId) {
      learnerApi
        .recordEvent(sessionId, {
          blockId: lesson.id,
          eventType: 'completed',
          correctness: correct ? 1 : 0,
          timeSpentSeconds: elapsedTime,
        })
        .catch(() => {});
    }
  };

  const handleNext = () => {
    // In real app, would save progress and load next block
    setUserAnswer('');
    setSubmitted(false);
    setIsCorrect(false);
    setShowHint(false);
    setHintIndex(0);
    setShowExplanation(false);
  };

  const handleRetry = () => {
    setUserAnswer('');
    setSubmitted(false);
    setShowExplanation(false);
  };

  const handleShowHint = () => {
    setShowHint(true);
  };

  const handleNextHint = () => {
    if (lesson && hintIndex < lesson.content.hints.length - 1) {
      setHintIndex(hintIndex + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Unable to load learning content.</p>
        <Link href="/content">
          <Button>Back to Courses</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Minimal Header - Focus Mode */}
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Exit */}
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Exit</span>
            </Button>
          </Link>

          {/* Progress */}
          <div className="flex flex-1 items-center justify-center gap-4 px-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {lesson.currentBlock} / {lesson.totalBlocks}
            </span>
            <Progress
              value={(lesson.currentBlock / lesson.totalBlocks) * 100}
              className="h-2 w-32 sm:w-48"
            />
            <span className="text-sm font-medium">{lesson.progress}%</span>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {formatTime(elapsedTime)}
          </div>
        </div>
      </header>

      {/* Main Learning Content */}
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          {/* Course Info */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{lesson.courseTitle}</p>
            <h1 className="text-xl font-semibold">{lesson.blockTitle}</h1>
          </div>

          {/* Challenge Card */}
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              {/* Question */}
              <div className="mb-6">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
                  <Zap className="h-4 w-4" />
                  Challenge
                </div>
                <p className="text-lg leading-relaxed">{lesson.content.question}</p>
              </div>

              {/* Answer Input */}
              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    disabled={submitted}
                    placeholder="Type your command here..."
                    className={cn(
                      'h-24 w-full resize-none rounded-lg border bg-muted/50 p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary',
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

                {/* Hint Section */}
                {showHint && !submitted && lesson.content.hints.length > 0 && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-400">
                        <Lightbulb className="h-4 w-4" />
                        Hint {hintIndex + 1} of {lesson.content.hints.length}
                      </span>
                      {hintIndex < lesson.content.hints.length - 1 && (
                        <Button variant="ghost" size="sm" onClick={handleNextHint}>
                          Next hint
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      {lesson.content.hints[hintIndex]}
                    </p>
                  </div>
                )}

                {/* Explanation (shown after wrong answer) */}
                {showExplanation && lesson.content.explanation && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
                      <MessageSquare className="h-4 w-4" />
                      Explanation
                    </div>
                    <p className="mb-3 text-sm">{lesson.content.explanation}</p>
                    {lesson.content.correctAnswer && (
                      <div className="rounded bg-muted p-2 font-mono text-sm">
                        Correct answer:{' '}
                        <span className="text-success">{lesson.content.correctAnswer}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {!submitted ? (
                    <>
                      {!showHint && lesson.content.hints.length > 0 && (
                        <Button variant="outline" onClick={handleShowHint}>
                          <Lightbulb className="mr-2 h-4 w-4" />
                          Need a hint?
                        </Button>
                      )}
                      <Button
                        className="flex-1"
                        onClick={handleSubmit}
                        disabled={!userAnswer.trim()}
                      >
                        Check Answer
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {!isCorrect && (
                        <Button variant="outline" onClick={handleRetry}>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Try Again
                        </Button>
                      )}
                      <Button className="flex-1" onClick={handleNext}>
                        {isCorrect ? 'Continue' : 'Next Challenge'}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Success Message */}
          {submitted && isCorrect && (
            <div className="animate-slide-up rounded-lg bg-success/10 p-4 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-success" />
              <p className="font-medium text-success">Correct! Great job!</p>
              <p className="text-sm text-muted-foreground">Time: {formatTime(elapsedTime)}</p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <footer className="border-t bg-background p-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Button variant="ghost" size="sm" disabled>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Block {lesson.currentBlock} of {lesson.totalBlocks}
          </span>
          <Button variant="ghost" size="sm" disabled={!submitted}>
            Skip
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
