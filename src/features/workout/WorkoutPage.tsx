import { estimatedProgramMinutes } from '../plan/programDisplay';
import { dateFromKey, localDateKey } from '../../domain/localCalendar';
import { useRef, useState } from 'react';
import { Link, useLoaderData, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, ChevronRight, Play, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { buttonClasses } from '../../components/ui/controlStyles';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { MobilePage } from '../../components/layout/MobilePage';
import { WorkoutLandingHero } from './WorkoutLandingHero';
import { WorkoutPreview } from './WorkoutPreview';
import { countLabel } from '../home/homeData';
import { startPlannedWorkout, type WorkoutLandingData } from './workoutService';
import { WorkoutRecoveryActions } from './WorkoutRecoveryActions';

export function WorkoutPage() {
  const data = useLoaderData<WorkoutLandingData>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const selected = data.previews.find(
    ({ day }) =>
      day.id === (params.get('day') ?? (data.state === 'scheduled' ? data.todayDayId : null)),
  );
  const state =
    selected && !data.unfinished && selected.day.id !== data.completedToday?.programDayId
      ? selected.entries.length
        ? 'scheduled'
        : 'empty-workout'
      : data.state;
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
            ? 'Rest day'
            : state === 'empty-workout'
              ? 'Add exercises to your workout'
              : 'No active training program';
  const description =
    state === 'in-progress'
      ? `${data.unfinished!.completedSets} of ${data.unfinished!.totalSets} sets completed · ${data.unfinished!.status === 'paused' ? 'Paused' : 'In progress'}`
      : state === 'scheduled'
        ? `${countLabel(selected!.entries.length, 'exercise')} · ${sets}${unspecified ? '+' : ''} planned sets${minutes == null ? '' : ` · ~${minutes} min estimate`}`
        : state === 'completed-today'
          ? `${data.completedToday!.name} · ${data.completedToday!.completedSets} completed sets. Your workout is saved locally.`
          : state === 'rest-day'
            ? 'Take time to recover. Your next planned workout is below.'
            : state === 'empty-workout'
              ? "This workout doesn't have any exercises yet."
              : 'Create a program and choose training days to get started.';

  const pinned = state === 'scheduled' && selected!.entries.length > 5;
  const plannedAction = (
    <Button
      variant="primary"
      size="large"
      className="workout-primary ui-button ui-button-primary ui-button-large"
      disabled={busy || missing}
      onClick={() => void start(() => startPlannedWorkout(selected!.day.id))}
    >
      <Play size={18} aria-hidden="true" />
      {busy ? 'Opening workout…' : 'Start Workout'}
    </Button>
  );

  return (
    <MobilePage
      className={`workout-flow workout-landing grid gap-4 ${pinned ? 'pb-20' : ''}`}
    >
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
            ? selected?.day.weekday == null
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
              Resume Workout
            </Link>
            {data.unfinished!.status === 'paused' ||
            data.unfinished!.scheduledDate !== data.todayDate ? (
              <WorkoutRecoveryActions
                sessionId={data.unfinished!.id}
                completedSets={data.unfinished!.completedSets}
              />
            ) : null}
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
            to={
              state === 'no-program'
                ? '/plan/new'
                : state === 'empty-workout'
                  ? `/plan/${data.activeProgram?.id}/days/${selected?.day.id ?? data.todayDayId}/exercises`
                  : `/plan/${data.activeProgram?.id}`
            }
          >
            {state === 'no-program'
              ? 'Create Program'
              : state === 'empty-workout'
                ? 'Add Exercises'
                : 'View Program'}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        )}
      </WorkoutLandingHero>
      {data.unfinished ? (
        <p className="text-sm text-secondary">
          Active session · Started{' '}
          {dateFromKey(
            data.unfinished.scheduledDate ?? localDateKey(new Date(data.unfinished.startedAt)),
          ).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </p>
      ) : null}

      {selected && !data.unfinished ? <WorkoutPreview entries={selected.entries} /> : null}
      {data.recent.length ? (
        <section aria-labelledby="history-title" className="grid gap-2">
          <SectionHeader
            id="history-title"
            title="Recent workouts"
            trailing={
              <Link
                to="/progress"
                className="flex min-h-11 min-w-11 items-center text-sm text-mint"
              >
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
      ) : null}
      <p className="flex items-center justify-center gap-2 text-xs text-muted">
        <ShieldCheck size={16} aria-hidden="true" />
        Saved on this device · works offline
      </p>
      {pinned ? <div className="workout-landing-action">{plannedAction}</div> : null}
    </MobilePage>
  );
}
