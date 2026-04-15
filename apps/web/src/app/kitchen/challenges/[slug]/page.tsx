/**
 * TopShelf Service LLC - Challenge Runner Page
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 *
 * Dynamic route that plays any challenge content pack through the full
 * SOLVE → CONSEQUENCE → TEACH → VERIFY → MASTERY lifecycle.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  ChallengePhase,
  ChallengeType,
  EventType,
  type ChallengeConfig,
} from '@topshelf/engine';
import { useChallenge } from '@/hooks/use-challenge';
import { RushTimer } from '@/components/kitchen/RushTimer';
import { DirtyHandTimer } from '@/components/kitchen/DirtyHandTimer';
import { TicketQueue } from '@/components/kitchen/TicketQueue';
import { InventoryBins } from '@/components/kitchen/InventoryBins';
import { ReflectionHUD } from '@/components/kitchen/ReflectionHUD';
import { GradeBadge } from '@/components/kitchen/GradeBadge';
import { SafetyAlert } from '@/components/kitchen/SafetyAlert';
import { getPack } from '@/lib/kitchen-packs';

export default function ChallengeRunnerPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;

  const [config, setConfig] = useState<ChallengeConfig | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    const pack = getPack(slug);
    if (pack) {
      setConfig(pack);
      setLoadState('ready');
    } else {
      setLoadState('missing');
    }
  }, [slug]);

  const ch = useChallenge(config);

  if (loadState === 'loading') {
    return (
      <main className="kitchen-page">
        <div className="kitchen-loading">
          <Loader2 className="animate-spin" size={40} aria-hidden /> Loading challenge…
        </div>
      </main>
    );
  }

  if (loadState === 'missing' || !config) {
    return (
      <main className="kitchen-page">
        <header className="kitchen-nav">
          <Link href="/kitchen" className="kitchen-nav__back">
            <ArrowLeft size={20} aria-hidden /> Back
          </Link>
        </header>
        <div className="kitchen-card">
          <h1>Challenge not found</h1>
          <p>
            No content pack exists for <code>{slug}</code>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="kitchen-page challenge-page">
      <ChallengeHeader title={config.title} phase={ch.phase} />
      <PhaseRouter config={config} ch={ch} onFinish={() => router.push('/kitchen')} />
    </main>
  );
}

function ChallengeHeader({
  title,
  phase,
}: {
  title: string;
  phase: ChallengePhase | null;
}) {
  return (
    <header className="kitchen-nav challenge-header">
      <Link href="/kitchen" className="kitchen-nav__back">
        <ArrowLeft size={20} aria-hidden /> Exit
      </Link>
      <h1 className="challenge-header__title">{title}</h1>
      <span className="challenge-header__phase" aria-label="Current phase">
        {phase?.toUpperCase() ?? ''}
      </span>
    </header>
  );
}

function PhaseRouter({
  config,
  ch,
  onFinish,
}: {
  config: ChallengeConfig;
  ch: ReturnType<typeof useChallenge>;
  onFinish: () => void;
}) {
  switch (ch.phase) {
    case ChallengePhase.SETUP:
    case null:
      return <SetupView config={config} onStart={ch.start} />;
    case ChallengePhase.SOLVE:
    case ChallengePhase.VERIFY:
      return <SolveView config={config} ch={ch} />;
    case ChallengePhase.CONSEQUENCE:
      return <ConsequenceView ch={ch} />;
    case ChallengePhase.TEACH:
      return <TeachView ch={ch} />;
    case ChallengePhase.MASTERY:
      return <MasteryView ch={ch} onFinish={onFinish} />;
    case ChallengePhase.COMPLETED:
      return (
        <div className="kitchen-card">
          <h2>Challenge closed</h2>
          <button type="button" className="btn-action btn-primary" onClick={onFinish}>
            Return to kitchen
          </button>
        </div>
      );
    case ChallengePhase.COOLDOWN:
      return (
        <div className="kitchen-card">
          <h2>Take a breath</h2>
          <p>Three strikes. Step back and review before another attempt.</p>
        </div>
      );
    default:
      return null;
  }
}

function SetupView({
  config,
  onStart,
}: {
  config: ChallengeConfig;
  onStart: () => void;
}) {
  return (
    <section className="kitchen-card challenge-setup">
      <h2>{config.title}</h2>
      <p className="challenge-setup__briefing">{config.briefing}</p>
      <dl className="challenge-setup__meta">
        <div>
          <dt>Time limit</dt>
          <dd>{Math.floor(config.timeLimitSeconds / 60)}:{(config.timeLimitSeconds % 60).toString().padStart(2, '0')}</dd>
        </div>
        <div>
          <dt>Difficulty</dt>
          <dd>{'★'.repeat(config.difficultyLevel)}</dd>
        </div>
      </dl>
      <button type="button" className="btn-action btn-primary" onClick={onStart}>
        Fire
      </button>
    </section>
  );
}

function SolveView({
  config,
  ch,
}: {
  config: ChallengeConfig;
  ch: ReturnType<typeof useChallenge>;
}) {
  switch (config.type) {
    case ChallengeType.RUSH_HOUR:
      return <RushHourView config={config} ch={ch} />;
    default:
      return <GenericSolveView config={config} ch={ch} />;
  }
}

function RushHourView({
  config,
  ch,
}: {
  config: ChallengeConfig;
  ch: ReturnType<typeof useChallenge>;
}) {
  const tickets = config.tickets ?? [];
  const ingredients = config.availableIngredients ?? [];
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [alert, setAlert] = useState<{ headline: string; sub?: string } | null>(null);
  const startedAt = useMemo(() => Date.now(), []);

  const fireTicket = (id: string) => {
    ch.logEvent(EventType.TICKET_STARTED, { ticketId: id });
  };
  const finishTicket = (id: string) => {
    ch.completeTicket(id);
    setCompleted((s) => new Set(s).add(id));
    if (completed.size + 1 >= tickets.length) {
      ch.endSolve();
    }
  };
  const selectIng = (ingId: string) => {
    const ing = ingredients.find((i) => i.id === ingId);
    if (!ing) return;
    ch.logEvent(EventType.INGREDIENT_SELECTED, { ingredientId: ing.id, spoiled: ing.isSpoiled });
    if (ing.isSpoiled) {
      setAlert({
        headline: 'Spoiled product grabbed',
        sub: 'A real shift would mean a $2k comp or a 24-hour sickness complaint. The system saw it.',
      });
    }
  };

  return (
    <div className="rush-layout">
      <aside className="rush-layout__hud">
        <RushTimer
          remainingMs={ch.timeRemainingMs}
          totalMs={config.timeLimitSeconds * 1000}
          label={ch.isVerification ? 'Verify' : 'Rush'}
        />
        <DirtyHandTimer
          lastHandwashAt={null}
          challengeStartedAt={startedAt}
          onWash={ch.recordHandwash}
        />
        <div className="rush-layout__counter">
          <strong>{ch.ticketsCompleted}</strong> / {ch.ticketsTotal} plates
        </div>
        <button type="button" className="btn-action btn-caution" onClick={ch.endSolve}>
          End rush
        </button>
      </aside>

      <section className="rush-layout__tickets">
        <h2>Tickets</h2>
        <TicketQueue
          tickets={tickets}
          completedIds={completed}
          onFire={fireTicket}
          onComplete={finishTicket}
          startedAt={startedAt}
        />
      </section>

      <section className="rush-layout__inventory">
        <h2>Walk-in</h2>
        <InventoryBins ingredients={ingredients} onSelect={(ing) => selectIng(ing.id)} />
      </section>

      <SafetyAlert
        open={alert !== null}
        headline={alert?.headline ?? ''}
        subtext={alert?.sub}
        onDismiss={() => setAlert(null)}
      />
    </div>
  );
}

function GenericSolveView({
  config,
  ch,
}: {
  config: ChallengeConfig;
  ch: ReturnType<typeof useChallenge>;
}) {
  return (
    <section className="kitchen-card">
      <header className="generic-solve__head">
        <h2>{config.title}</h2>
        <RushTimer
          remainingMs={ch.timeRemainingMs}
          totalMs={config.timeLimitSeconds * 1000}
        />
      </header>
      <p>
        This challenge type (<code>{config.type}</code>) uses the same event-sourced
        engine. A rich UI for it will ship in the next pack. For now you can still log
        events and complete it — the shadow validator is watching.
      </p>
      <div className="generic-solve__actions">
        <button
          type="button"
          className="btn-action btn-primary"
          onClick={() => ch.logEvent(EventType.SEQUENCE_STEP_DONE, { manual: true })}
        >
          Log step
        </button>
        <button type="button" className="btn-action btn-caution" onClick={ch.endSolve}>
          Submit
        </button>
      </div>
    </section>
  );
}

function ConsequenceView({ ch }: { ch: ReturnType<typeof useChallenge> }) {
  if (!ch.consequence) {
    return (
      <div className="kitchen-card">
        <p>Computing consequences…</p>
      </div>
    );
  }
  return (
    <section className="kitchen-card challenge-consequence">
      <ReflectionHUD consequence={ch.consequence} events={ch.events} />
      <div className="challenge-consequence__actions">
        <button type="button" className="btn-action btn-primary" onClick={ch.toTeach}>
          Show me the right way
        </button>
      </div>
    </section>
  );
}

function TeachView({ ch }: { ch: ReturnType<typeof useChallenge> }) {
  return (
    <section className="kitchen-card challenge-teach">
      <h2>The expert standard</h2>
      <p>
        Here&apos;s what a veteran would have done. Read the <em>why</em> behind each step
        — that&apos;s what separates a line cook from a chef.
      </p>
      <ul className="challenge-teach__lessons">
        {ch.infractions.slice(0, 6).map((inf) => (
          <li key={inf.id}>
            <h3>{inf.explanation}</h3>
            <p className="challenge-teach__why">Why it matters: {inf.whyItMatters}</p>
            <p className="challenge-teach__fix">Expert approach: {inf.expertApproach}</p>
          </li>
        ))}
      </ul>
      <div className="challenge-teach__actions">
        <button type="button" className="btn-action btn-primary" onClick={ch.toVerify}>
          Prove it — verify run
        </button>
      </div>
    </section>
  );
}

function MasteryView({
  ch,
  onFinish,
}: {
  ch: ReturnType<typeof useChallenge>;
  onFinish: () => void;
}) {
  return (
    <section className="kitchen-card challenge-mastery">
      <h2>Mastery scored</h2>
      {ch.grade && <GradeBadge grade={ch.grade as 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'} size="lg" />}
      <p>You logged {ch.events.length} events and {ch.infractionCount} hidden infractions.</p>
      <div className="challenge-mastery__actions">
        <button
          type="button"
          className="btn-action btn-primary"
          onClick={() => {
            ch.finish();
            onFinish();
          }}
        >
          Return to kitchen
        </button>
      </div>
    </section>
  );
}
