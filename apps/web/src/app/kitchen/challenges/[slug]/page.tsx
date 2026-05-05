/**
 * Kitchen Challenge Runner.
 * Drives one content pack through SOLVE → CONSEQUENCE → TEACH → VERIFY → MASTERY.
 */
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ChallengePhase, ChallengeType, EventType, type ChallengeConfig } from '@topshelf/engine';
import { useChallenge } from '@/hooks/use-challenge';
import { RushTimer } from '@/components/kitchen/RushTimer';
import { DirtyHandTimer } from '@/components/kitchen/DirtyHandTimer';
import { TicketQueue } from '@/components/kitchen/TicketQueue';
import { InventoryBins } from '@/components/kitchen/InventoryBins';
import { ReflectionHUD } from '@/components/kitchen/ReflectionHUD';
import { GradeBadge } from '@/components/kitchen/GradeBadge';
import { RecipeCard } from '@/components/kitchen/RecipeCard';
import { SafetyAlert } from '@/components/kitchen/SafetyAlert';
import { TempGauge } from '@/components/kitchen/TempGauge';
import { getPack } from '@/lib/kitchen-packs';

export default function ChallengeRunnerPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const config = useMemo(() => getPack(params.slug), [params.slug]);
  const ch = useChallenge(config);

  if (!config) {
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
            No content pack for <code>{params.slug}</code>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="kitchen-page challenge-page">
      <header className="kitchen-nav challenge-header">
        <Link href="/kitchen" className="kitchen-nav__back">
          <ArrowLeft size={20} aria-hidden /> Exit
        </Link>
        <h1 className="challenge-header__title">{config.title}</h1>
        <span className="challenge-header__phase">
          {(ch.phase ?? ChallengePhase.SETUP).toUpperCase()}
        </span>
      </header>

      <PhaseView config={config} ch={ch} onExit={() => router.push('/kitchen')} />
    </main>
  );
}

function PhaseView({
  config,
  ch,
  onExit,
}: {
  config: ChallengeConfig;
  ch: ReturnType<typeof useChallenge>;
  onExit: () => void;
}) {
  switch (ch.phase) {
    case null:
    case ChallengePhase.SETUP:
      return <SetupView config={config} onStart={ch.start} />;
    case ChallengePhase.SOLVE:
    case ChallengePhase.VERIFY:
      return <SolveView config={config} ch={ch} />;
    case ChallengePhase.CONSEQUENCE:
      return <ConsequenceView ch={ch} />;
    case ChallengePhase.TEACH:
      return <TeachView config={config} ch={ch} />;
    case ChallengePhase.MASTERY:
      return <MasteryView ch={ch} onExit={onExit} />;
    case ChallengePhase.COMPLETED:
      return (
        <div className="kitchen-card">
          <button type="button" className="btn-action btn-primary" onClick={onExit}>
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

// ---------- SETUP ----------

function SetupView({ config, onStart }: { config: ChallengeConfig; onStart: () => void }) {
  const min = Math.floor(config.timeLimitSeconds / 60);
  const sec = (config.timeLimitSeconds % 60).toString().padStart(2, '0');
  return (
    <section className="kitchen-card challenge-setup">
      <h2>{config.title}</h2>
      <p className="challenge-setup__briefing">{config.briefing}</p>
      <dl className="challenge-setup__meta">
        <div>
          <dt>Time</dt>
          <dd>
            {min}:{sec}
          </dd>
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

// ---------- SOLVE ----------

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
    case ChallengeType.TEMP_CHECK:
      return <TempCheckView config={config} ch={ch} />;
    case ChallengeType.GHOST_RECIPE:
    case ChallengeType.STATION_SETUP:
    case ChallengeType.INVENTORY_SCRAMBLE:
    case ChallengeType.LABOR_PREP:
    case ChallengeType.HAZARD_SCAN:
    case ChallengeType.MOCK_IMPOSSIBLE:
      return <SimpleSolveView config={config} ch={ch} />;
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

  const finishTicket = (id: string) => {
    ch.completeTicket(id);
    const next = new Set(completed).add(id);
    setCompleted(next);
    if (next.size >= tickets.length) ch.endSolve();
  };

  const selectIngredient = (ingId: string) => {
    const ing = ingredients.find((i) => i.id === ingId);
    if (!ing) return;
    ch.logEvent(EventType.INGREDIENT_SELECTED, { ingredientId: ing.id, spoiled: ing.isSpoiled });
    if (ing.isSpoiled) {
      setAlert({
        headline: 'Spoiled product grabbed',
        sub: 'A real shift would mean comps or a sickness complaint.',
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
          lastHandwashAt={ch.lastHandwashAt}
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
          onFire={(id) => ch.logEvent(EventType.TICKET_STARTED, { ticketId: id })}
          onComplete={finishTicket}
          startedAt={startedAt}
        />
      </section>

      <section className="rush-layout__inventory">
        <h2>Walk-in</h2>
        <InventoryBins ingredients={ingredients} onSelect={(i) => selectIngredient(i.id)} />
      </section>

      <SafetyAlert
        open={alert !== null}
        headline={alert?.headline ?? ''}
        {...(alert?.sub ? { subtext: alert.sub } : {})}
        onDismiss={() => setAlert(null)}
      />
    </div>
  );
}

function TempCheckView({
  config,
  ch,
}: {
  config: ChallengeConfig;
  ch: ReturnType<typeof useChallenge>;
}) {
  const stations = useMemo(
    () => [
      { id: 'walkin', label: 'Walk-in cooler', min: 33, max: 40 },
      { id: 'freezer', label: 'Freezer', min: -10, max: 0 },
      { id: 'hothold', label: 'Hot hold', min: 140, max: 165 },
      { id: 'line-reach', label: 'Line reach-in', min: 33, max: 40 },
    ],
    []
  );
  const [values, setValues] = useState<Record<string, number>>({
    walkin: 38,
    freezer: -5,
    hothold: 150,
    'line-reach': 38,
  });

  const submit = () => {
    for (const s of stations) {
      ch.logEvent(EventType.TEMP_ESTIMATED, {
        stationId: s.id,
        value: values[s.id],
        target: { min: s.min, max: s.max },
      });
    }
    ch.endSolve();
  };

  return (
    <section className="kitchen-card">
      <header className="generic-solve__head">
        <h2>Record every temp</h2>
        <RushTimer remainingMs={ch.timeRemainingMs} totalMs={config.timeLimitSeconds * 1000} />
      </header>
      <div className="temp-grid">
        {stations.map((s) => (
          <TempGauge
            key={s.id}
            label={s.label}
            value={values[s.id] ?? 0}
            min={s.min}
            max={s.max}
            editable
            onChange={(v) => setValues((prev) => ({ ...prev, [s.id]: v }))}
          />
        ))}
      </div>
      <div className="generic-solve__actions">
        <button type="button" className="btn-action btn-primary" onClick={submit}>
          Submit readings
        </button>
      </div>
    </section>
  );
}

/** Fallback for challenge types without a custom UI: timer + submit. */
function SimpleSolveView({
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
        <RushTimer remainingMs={ch.timeRemainingMs} totalMs={config.timeLimitSeconds * 1000} />
      </header>
      <p>{config.briefing}</p>
      <div className="generic-solve__actions">
        <button
          type="button"
          className="btn-action btn-safe"
          onClick={() => ch.logEvent(EventType.SEQUENCE_STEP_DONE, {})}
        >
          Mark step done
        </button>
        <button type="button" className="btn-action btn-primary" onClick={ch.endSolve}>
          Submit
        </button>
      </div>
    </section>
  );
}

// ---------- CONSEQUENCE ----------

function ConsequenceView({ ch }: { ch: ReturnType<typeof useChallenge> }) {
  if (!ch.consequence) {
    return (
      <div className="kitchen-card">
        <p>Computing…</p>
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

// ---------- TEACH ----------

function TeachView({
  config,
  ch,
}: {
  config: ChallengeConfig;
  ch: ReturnType<typeof useChallenge>;
}) {
  const highlightSteps = useMemo(() => {
    const set = new Set<string>();
    for (const inf of ch.infractions) {
      // Map infractions to recipe steps when possible (best effort).
      if (config.expertRecipe) {
        for (const step of config.expertRecipe.steps) {
          const keyword = inf.domain.split('_')[0] ?? '';
          if (keyword && step.instruction.toLowerCase().includes(keyword)) {
            set.add(step.id);
          }
        }
      }
    }
    return set;
  }, [ch.infractions, config.expertRecipe]);

  return (
    <section className="kitchen-card challenge-teach">
      <h2>The expert standard</h2>
      {config.expertRecipe && (
        <RecipeCard recipe={config.expertRecipe} highlightStepIds={highlightSteps} />
      )}

      {ch.infractions.length > 0 && (
        <>
          <h3>What tripped you up</h3>
          <ul className="challenge-teach__lessons">
            {ch.infractions.slice(0, 6).map((inf) => (
              <li key={inf.id}>
                <h4>{inf.explanation}</h4>
                <p className="challenge-teach__why">Why: {inf.whyItMatters}</p>
                <p className="challenge-teach__fix">Expert: {inf.expertApproach}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="challenge-teach__actions">
        <button type="button" className="btn-action btn-primary" onClick={ch.toVerify}>
          Prove it — verify run
        </button>
        <button type="button" className="btn-action btn-ghost" onClick={ch.toMastery}>
          Skip to mastery
        </button>
      </div>
    </section>
  );
}

// ---------- MASTERY ----------

function MasteryView({ ch, onExit }: { ch: ReturnType<typeof useChallenge>; onExit: () => void }) {
  return (
    <section className="kitchen-card challenge-mastery">
      <h2>Mastery scored</h2>
      {ch.grade && <GradeBadge grade={ch.grade as 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'} size="lg" />}
      <p>
        {ch.events.length} events logged · {ch.infractionCount} hidden infractions caught
      </p>
      <div className="challenge-mastery__actions">
        <button
          type="button"
          className="btn-action btn-primary"
          onClick={() => {
            ch.finish();
            onExit();
          }}
        >
          Return to kitchen
        </button>
      </div>
    </section>
  );
}
