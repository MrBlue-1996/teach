'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Zap,
  Flame,
  Timer,
  Thermometer,
  Calculator,
  ClipboardList,
  Shuffle,
  Eye,
  QrCode,
  Lock,
  AlertTriangle,
  Star,
  BookOpen,
  Smartphone,
} from 'lucide-react';
import { ChallengeType } from '@topshelf/engine';
import { listPacks, type KitchenChallengeConfig } from '@/lib/kitchen-packs';

// ---------------------------------------------------------------------------
// Mock data — self-contained, no external store/engine imports
// ---------------------------------------------------------------------------

const MOCK_USER = {
  rank: 'Line Cook III',
  rankColor: 'hsl(217, 91%, 60%)',
  streakDays: 12,
  xp: 2_340,
};

const DAILY_SPEC = {
  stationFocus: 'Mesquite Grill',
  specialOfTheDay: "Uncle Julio's Chicken Fajitas",
  quickChallengeSlug: 'uj-fajita-rush',
  greeting: 'Mise is life. Let\u2019s go.',
};

interface ChallengeCard {
  slug: string;
  title: string;
  icon: React.ElementType;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  difficultyColor: string;
}

const CHALLENGE_ICONS: Record<ChallengeType, React.ElementType> = {
  [ChallengeType.RUSH_HOUR]: Flame,
  [ChallengeType.GHOST_RECIPE]: Calculator,
  [ChallengeType.STATION_SETUP]: ClipboardList,
  [ChallengeType.TEMP_CHECK]: Thermometer,
  [ChallengeType.INVENTORY_SCRAMBLE]: Shuffle,
  [ChallengeType.LABOR_PREP]: Timer,
  [ChallengeType.HAZARD_SCAN]: AlertTriangle,
  [ChallengeType.MOCK_IMPOSSIBLE]: AlertTriangle,
};

function getDifficulty(
  level: KitchenChallengeConfig['difficultyLevel']
): ChallengeCard['difficulty'] {
  if (level >= 4) return 'Expert';
  if (level === 3) return 'Hard';
  if (level === 2) return 'Medium';
  return 'Easy';
}

function getDifficultyColor(level: KitchenChallengeConfig['difficultyLevel']) {
  if (level >= 4) return 'text-[hsl(var(--kitchen-danger-bright,0_84%_60%))]';
  if (level === 3) return 'text-[hsl(var(--kitchen-danger))]';
  if (level === 2) return 'text-[hsl(var(--kitchen-caution))]';
  return 'text-[hsl(var(--kitchen-safe))]';
}

function toChallengeCard(pack: KitchenChallengeConfig): ChallengeCard {
  const icon = CHALLENGE_ICONS[pack.type] ?? Zap;

  return {
    slug: pack.slug,
    title: pack.title,
    icon,
    difficulty: getDifficulty(pack.difficultyLevel),
    difficultyColor: getDifficultyColor(pack.difficultyLevel),
  };
}

const CHALLENGES: ChallengeCard[] = listPacks().map(toChallengeCard);

interface MasteryDomain {
  label: string;
  percent: number;
  color: string;
  hidden: boolean;
}

// Dashboard preview — shows 4 representative domains. Full 11-domain
// breakdown lives on /kitchen/mastery (see "View Mastery" quick action).
const MASTERY_DOMAINS: MasteryDomain[] = [
  { label: 'Sanitation', percent: 72, color: 'hsl(142, 71%, 45%)', hidden: false },
  { label: 'Food Safety', percent: 58, color: 'hsl(0, 72%, 51%)', hidden: false },
  { label: 'Speed', percent: 45, color: 'hsl(38, 92%, 50%)', hidden: false },
  { label: 'Kitchen Math', percent: 30, color: 'hsl(217, 91%, 60%)', hidden: false },
];

// ---------------------------------------------------------------------------
// Small helper — circular progress ring (SVG)
// ---------------------------------------------------------------------------

function CircularProgress({
  percent,
  color,
  size = 96,
  strokeWidth = 8,
  children,
}: {
  percent: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(220, 15%, 20%)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function KitchenDashboardPage() {
  const [user] = useState(MOCK_USER);
  const [spec] = useState(DAILY_SPEC);
  const [challenges] = useState(CHALLENGES);
  const [mastery] = useState(MASTERY_DOMAINS);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* ================================================================
          HEADER
          ================================================================ */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Logo + brand */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: 'hsl(217, 91%, 60%)' }}
          >
            <Zap className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">TopShelf Kitchen</h1>
            <p className="text-[hsl(var(--k-muted))] text-sm">Solve First, Then Teach</p>
          </div>
        </div>

        {/* Rank badge + streak */}
        <div className="flex items-center gap-4">
          {/* Rank */}
          <div
            className="kitchen-card flex items-center gap-2 px-4 py-2"
            style={{ borderColor: user.rankColor }}
          >
            <Star className="h-5 w-5" style={{ color: user.rankColor }} />
            <span className="font-bold" style={{ color: user.rankColor }}>
              {user.rank}
            </span>
          </div>

          {/* Streak */}
          <div className="kitchen-card flex items-center gap-2 px-4 py-2">
            <Flame className="h-5 w-5 text-[hsl(var(--kitchen-caution))]" />
            <div className="leading-tight">
              <span className="text-xl font-bold">{user.streakDays}</span>
              <span className="ml-1 text-sm text-[hsl(var(--k-muted))]">day streak</span>
            </div>
          </div>
        </div>
      </header>

      {/* ================================================================
          DAILY SPEC CARD
          ================================================================ */}
      <section className="kitchen-card mb-8 border-l-4 border-l-[hsl(var(--kitchen-caution))]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="mb-1 text-xl font-bold uppercase tracking-wide text-[hsl(var(--kitchen-caution))]">
              Daily Spec
            </h2>
            <p className="mb-2 text-[hsl(var(--k-muted))]">{spec.greeting}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-lg">
              <span>
                <strong>Station:</strong> {spec.stationFocus}
              </span>
              <span>
                <strong>Special:</strong> {spec.specialOfTheDay}
              </span>
            </div>
          </div>
          <Link
            href={`/kitchen/challenges/${spec.quickChallengeSlug}`}
            className="btn-action btn-caution whitespace-nowrap"
          >
            Quick Challenge
          </Link>
        </div>
      </section>

      {/* ================================================================
          CHALLENGE GRID
          ================================================================ */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold uppercase tracking-wide">Challenges</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {challenges.map((c) => {
            const Icon = c.icon;
            const inner = (
              <div className="kitchen-card flex h-full flex-col items-start gap-3">
                {/* Top row: icon + status */}
                <div className="flex w-full items-center justify-between">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ background: 'hsl(220, 18%, 16%)' }}
                  >
                    <Icon className="h-6 w-6 text-[hsl(var(--kf))]" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold leading-snug">{c.title}</h3>

                {/* Difficulty badge */}
                <span
                  className={`text-sm font-semibold uppercase tracking-wider ${c.difficultyColor}`}
                >
                  {c.difficulty}
                </span>
              </div>
            );

            return (
              <Link key={c.slug} href={`/kitchen/challenges/${c.slug}`} className="block">
                {inner}
              </Link>
            );
          })}
        </div>
      </section>

      {/* ================================================================
          MASTERY SUMMARY
          ================================================================ */}
      <section className="kitchen-card mb-8">
        <h2 className="mb-6 text-xl font-bold uppercase tracking-wide">Mastery</h2>
        <div className="flex flex-wrap items-center justify-center gap-8 sm:justify-start">
          {mastery.map((d) => (
            <div key={d.label} className="flex flex-col items-center gap-2">
              {d.hidden ? (
                <CircularProgress percent={0} color="hsl(220, 15%, 25%)" size={96} strokeWidth={8}>
                  <Lock className="h-6 w-6 text-[hsl(var(--k-muted))]" />
                </CircularProgress>
              ) : (
                <CircularProgress percent={d.percent} color={d.color} size={96} strokeWidth={8}>
                  <span className="text-xl font-bold">{d.percent}%</span>
                </CircularProgress>
              )}
              <span className="text-sm font-semibold uppercase tracking-wide text-[hsl(var(--k-muted))]">
                {d.hidden ? 'Hidden' : d.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================
          QUICK ACTIONS
          ================================================================ */}
      <section className="mb-4">
        <h2 className="mb-4 text-xl font-bold uppercase tracking-wide">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href={`/kitchen/challenges/${challenges[0]?.slug ?? 'uj-fajita-rush'}`}>
            <span className="btn-action btn-primary flex w-full items-center justify-center gap-3">
              <Shuffle className="h-6 w-6" />
              Start Challenge
            </span>
          </Link>

          <Link href="/kitchen/mastery">
            <button className="btn-action btn-safe flex w-full items-center justify-center gap-3">
              <Eye className="h-6 w-6" />
              View Mastery
            </button>
          </Link>

          <Link href="/kitchen/qr-validate">
            <button className="btn-action btn-ghost flex w-full items-center justify-center gap-3">
              <QrCode className="h-6 w-6" />
              QR Validate
            </button>
          </Link>

          <Link href="/kitchen/recipes">
            <button className="btn-action btn-ghost flex w-full items-center justify-center gap-3">
              <BookOpen className="h-6 w-6" />
              Recipe Book
            </button>
          </Link>

          <Link href="/kitchen/preview">
            <button className="btn-action btn-ghost flex w-full items-center justify-center gap-3">
              <Smartphone className="h-6 w-6" />
              Phone Emulator
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
