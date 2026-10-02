import { estimatedProgramMinutes } from '../plan/programDisplay';
import { useRef, useState } from 'react';
import { Link, useLoaderData, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, ChevronRight, Play, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { buttonClasses } from '../../components/ui/controlStyles';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { MobilePage } from '../../components/layout/MobilePage';
import { PageIntro } from '../../components/PageIntro';
import { WorkoutLandingHero } from './WorkoutLandingHero';
import { WorkoutPreview } from './WorkoutPreview';
import { countLabel } from '../home/homeData';
import { startPlannedWorkout, type WorkoutLandingData } from './workoutService';

export function WorkoutPage() {
  const data = useLoaderData<WorkoutLandingData>();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const selected = data.previews.find(
    ({ day }) => day.id === (selectedId ?? (data.state === 'scheduled' ? data.todayDayId : null)),
  );
  const state = selected && !data.unfinished ? 'scheduled' : data.state;
  const next = data.previews.find(({ day }) => day.id === data.nextDayId);
  const sets =
    selected?.entries.reduce((sum, { prescription }) => sum + (prescription.targetSets ?? 0), 0) ??
    0;
  const unspecified = selected?.entries.some(
    ({ prescription }) => prescription.targetSets === null,
  );
  const minutes = selected
    ? estimatedProgramMinutes(selected.entries.map(({ prescription }) => prescription))
    : null;
  const missing = selected?.entries.some(({ exercise }) => !exercise);

  const start = async (action: () => Promise<string>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const id = await action();
      await navigate(`/workout/${id}`);
      // Retain lock through delayed navigation; successful creation must not be repeated.
    } catch (nextError) {
      pending.current = false;
      setBusy(false);
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Workout could not be started. Please retry.',
      );
    }
  };
  const title =
    state === 'in-progress'
      ? data.unfinished!.name
      : state === 'scheduled'
        ? selected!.day.name
        : state === 'completed-today'
          ? 'Training complete'
          : state === 'rest-day'
            ? 'No workout today'
            : 'Your training starts here';
  const description =
    state === 'in-progress'
      ? `${data.unfinished!.completedSets} of ${data.unfinished!.totalSets} sets completed · ${data.unfinished!.status === 'paused' ? 'Paused' : 'In progress'}`
      : state === 'scheduled'
        ? `${countLabel(selected!.entries.length, 'exercise')} · ${sets}${unspecified ? '+' : ''} planned sets${minutes == null ? '' : ` · ~${minutes} min estimate`}`
        : state === 'completed-today'
          ? `${data.completedToday!.name} · ${data.completedToday!.completedSets} completed sets. Your workout is saved locally.`
          : state === 'rest-day'
            ? 'Take time to recover. Your next planned workout is below.'
            : 'Create a program and choose training days to get started.';

  const pinned = state === 'scheduled' && selected!.entries.length > 5;
  const plannedAction = (
    <Button
      variant="primary"
      size="large"
      className="min-h-14"
      disabled={busy || missing}
      onClick={() => void start(() => startPlannedWorkout(selected!.day.id))}
    >
      <Play size={18} aria-hidden="true" />
      {busy ? 'Opening workout…' : 'Start Workout'}
    </Button>
  );

  return (
    <MobilePage className={`grid gap-5 ${pinned ? 'pb-20' : ''}`} aria-labelledby="workout-title">
      <PageIntro
        titleId="workout-title"
        eyebrow="Workout"
        title="Start training"
        description="Your next session, ready when you are."
      />
      {error ? (
        <p
          className="rounded-xl border border-border bg-surface p-3 text-sm text-secondary"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <WorkoutLandingHero
        eyebrow={
          state === 'scheduled'
            ? selectedId
              ? 'Selected workout'
              : selected?.day.weekday == null
                ? 'Next in your program'
                : 'Today’s workout'
            : state.replaceAll('-', ' ')
        }
        title={title}
        description={description}
        resting={state === 'rest-day' || state === 'completed-today'}
      >
        {state === 'in-progress' ? (
          <>
            <progress
              aria-label="Workout completion"
              value={data.unfinished!.completedSets}
              max={Math.max(1, data.unfinished!.totalSets)}
              className="h-1.5 w-full overflow-hidden rounded-full accent-mint"
            />
            <Link
              className={buttonClasses('primary', 'min-h-14', 'large')}
              to={`/workout/${data.unfinished!.id}`}
            >
              <Play size={18} aria-hidden="true" />
              Continue Workout
            </Link>
            <p className="text-center text-xs text-secondary">
              Resume the same saved session. Nothing starts again.
            </p>
          </>
        ) : state === 'scheduled' ? (
          <>
            {data.activeProgram?.goal ? (
              <span className="w-fit rounded-full border border-border bg-surface/70 px-3 py-1 text-xs capitalize">
                {data.activeProgram.goal}
              </span>
            ) : null}
            {pinned ? (
              <p className="text-xs text-secondary">
                Review your exercises below, then start when ready.
              </p>
            ) : (
              plannedAction
            )}
          </>
        ) : state === 'completed-today' ? (
          <Link
            className={buttonClasses('primary', 'min-h-14', 'large')}
            to={`/workout/${data.completedToday!.id}`}
          >
            <Check size={18} aria-hidden="true" />
            View Completed Workout
          </Link>
        ) : (
          <Link
            className={buttonClasses('primary', 'min-h-14', 'large')}
            to={state === 'no-program' ? '/plan/new' : `/plan/${data.activeProgram?.id}`}
          >
            {state === 'no-program' ? 'Create Program' : 'View Program'}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        )}
      </WorkoutLandingHero>

      {selected && !data.unfinished ? <WorkoutPreview entries={selected.entries} /> : null}
      {!data.unfinished ? (
        <>
          {data.activeProgram && data.previews.length ? (
            <Card className="grid gap-3" aria-label="Program context">
              <SectionHeader
                title="Your program"
                trailing={
                  <Link
                    to={`/plan/${data.activeProgram.id}`}
                    aria-label="View program"
                    className="flex min-h-11 min-w-11 items-center justify-center text-mint"
                  >
                    <ChevronRight size={20} aria-hidden="true" />
                  </Link>
                }
              />
              <p className="text-sm font-semibold">{data.activeProgram.name}</p>
              {state === 'rest-day' && next ? (
                <p className="text-sm text-secondary">
                  Next: {next.day.name}
                  {next.day.weekday != null
                    ? ` · ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][next.day.weekday]}`
                    : ' · next in your program'}
                </p>
              ) : null}
              <p className="text-xs text-muted">
                {state === 'scheduled' ? 'Choose another day' : 'Choose Different Workout'} ·
                selection does not start a session
              </p>
              <div className="flex flex-wrap gap-2">
                {data.previews.map(({ day }) => (
                  <Button
                    key={day.id}
                    variant={selected?.day.id === day.id ? 'outline' : 'secondary'}
                    aria-pressed={selected?.day.id === day.id}
                    disabled={busy}
                    onClick={() => {
                      setSelectedId(day.id);
                      setError(null);
                    }}
                  >
                    {day.name}
                  </Button>
                ))}
              </div>
            </Card>
          ) : null}
          <Link className={buttonClasses('secondary')} to="/progress">
            View Progress
          </Link>
        </>
      ) : null}
      {/* 
      {data.recent.length ? (
        <section aria-labelledby="history-title" className="grid gap-2">
          <SectionHeader
            id="history-title"
            title="Recent workouts"
            trailing={
              <Link to="/progress" className="flex min-h-11 items-center text-sm text-mint">
                See all
              </Link>
            }
          />
          {data.recent.map((workout) => (
            <Card as="article" key={workout.id} padding="none">
              <Link
                to={`/workout/${workout.id}`}
                className="flex min-h-20 items-center gap-3 p-4 no-underline"
              >
                <Check className="shrink-0 text-mint" size={20} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold">{workout.name}</h3>
                  <p className="mt-1 text-xs text-secondary">
                    {new Date(workout.startedAt).toLocaleDateString()} · {workout.completedSets}{' '}
                    completed sets
                  </p>
                </div>
                <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-muted" />
              </Link>
            </Card>
          ))}
        </section>
      ) : null} */}
      <p className="flex items-center justify-center gap-2 text-xs text-muted">
        <ShieldCheck size={16} aria-hidden="true" />
        Saved on this device · works offline
      </p>
      {pinned ? (
        <div className="fixed bottom-[calc(88px+var(--safe-bottom))] left-1/2 z-20 w-full max-w-[430px] -translate-x-1/2 bg-app/95 px-[max(16px,var(--safe-left))] py-3 backdrop-blur-xl [&>button]:w-full">
          {plannedAction}
        </div>
      ) : null}
    </MobilePage>
  );
}
