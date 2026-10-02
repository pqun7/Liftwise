import { useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Ellipsis, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/FormControl';
import { iconButtonClasses, buttonClasses } from '../../components/ui/controlStyles';
import { WorkoutExerciseProgress } from './WorkoutExerciseProgress';
import { CurrentExerciseCard } from './CurrentExerciseCard';
import { SetLogger } from './SetLogger';
import { RestTimer } from './RestTimer';
import { KeepAwake } from './KeepAwake';
import {
  formatDuration,
  restRemainingSeconds,
  workoutElapsedSeconds,
} from '../../domain/workoutTime';
import type { SetCompletionUndo } from '../../lib/storage/repositories/workoutRepository';
import {
  clearWorkoutRest,
  extendWorkoutRest,
  finishWorkout,
  discardWorkout,
  pauseWorkout,
  resumeWorkout,
  setCurrentWorkoutExercise,
  updateWorkoutNotes,
  type HydratedWorkoutGraph,
} from './workoutService';

export function ActiveWorkoutLogger({
  workout,
  now,
  busy,
  run,
  refresh,
  onCompleted,
  undo,
  onUndo,
  overview,
  error,
}: {
  workout: HydratedWorkoutGraph;
  now: number;
  busy: boolean;
  run: (action: () => Promise<unknown>) => Promise<void>;
  refresh: () => Promise<void>;
  onCompleted: (undo: SetCompletionUndo) => void;
  undo: SetCompletionUndo | null;
  onUndo: () => void;
  overview: ReactNode;
  error: string | null;
}) {
  const [showOverview, setShowOverview] = useState(false);
  const navigate = useNavigate();
  const session = workout.session;
  const index = Math.max(
    0,
    workout.exercises.findIndex((entry) => entry.exercise.id === session.currentExerciseId),
  );
  const entry = workout.exercises[index];
  const current = entry?.sets.find((set) => !set.completed);
  const next = workout.exercises
    .slice(index + 1)
    .find(
      (item) =>
        !item.exercise.skipped && (!item.sets.length || item.sets.some((set) => !set.completed)),
    );
  const unfinished = workout.exercises.find(
    (item) =>
      !item.exercise.skipped && (!item.sets.length || item.sets.some((set) => !set.completed)),
  );
  const rest = restRemainingSeconds(session, now);
  const finish = () =>
    void run(async () => {
      await finishWorkout(session.id);
      await navigate('/workout');
    });
  const timer = session.restEndsAt ? (
    <RestTimer
      remaining={rest}
      duration={Math.max(
        1,
        (Date.parse(session.restEndsAt) - Date.parse(session.restStartedAt ?? session.restEndsAt)) /
          1000,
      )}
      nextSet={current?.setNumber}
      disabled={busy}
      onAdd={() => void run(() => extendWorkoutRest(session.id))}
      onEnd={() => void run(() => clearWorkoutRest(session.id))}
    />
  ) : null;
  return (
    <section className="grid min-w-0 gap-4" aria-labelledby="session-title">
      <header className="flex items-center justify-between gap-3">
        <Link to="/" aria-label="Leave workout, keep session saved" className={iconButtonClasses()}>
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <div className="min-w-0 text-center">
          <h1 id="session-title" className="truncate text-xl font-bold">
            {session.name ?? 'Quick Workout'}
          </h1>
          <p className="mt-1 text-sm text-secondary">
            {entry
              ? `${index + 1} of ${workout.exercises.length} exercises`
              : 'Add your first exercise'}
          </p>
        </div>
        <details className="relative">
          <summary
            aria-label="Workout menu"
            className={`${iconButtonClasses()} list-none cursor-pointer [&::-webkit-details-marker]:hidden`}
          >
            <Ellipsis size={20} aria-hidden="true" />
          </summary>
          <div className="absolute right-0 z-30 mt-2 grid w-52 gap-2 rounded-2xl border border-border bg-surface-3 p-3 shadow-lg">
            <Button onClick={() => setShowOverview((value) => !value)}>Workout Overview</Button>
            <Button
              disabled={busy}
              onClick={() =>
                void run(() =>
                  session.status === 'paused'
                    ? resumeWorkout(session.id)
                    : pauseWorkout(session.id),
                )
              }
            >
              {session.status === 'paused' ? 'Resume' : 'Pause'}
            </Button>
            <Button disabled={busy} onClick={finish}>
              Finish Workout
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm('Discard this workout? Saved sets remain as a discarded record.')
                )
                  void run(async () => {
                    await discardWorkout(session.id);
                    await navigate('/workout');
                  });
              }}
            >
              Cancel Workout
            </Button>
            <KeepAwake active={session.status === 'active'} />
          </div>
        </details>
      </header>
      <p className="text-center text-xs text-secondary" aria-label="Elapsed workout time">
        {session.status === 'paused' ? 'Paused' : 'Saved locally'} ·{' '}
        {formatDuration(workoutElapsedSeconds(session, now))}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {entry && !showOverview ? (
        <>
          <WorkoutExerciseProgress
            exercises={workout.exercises}
            currentId={entry.exercise.id}
            onSelect={(id) => {
              if (!busy) void run(() => setCurrentWorkoutExercise(session.id, id));
            }}
          />
          <CurrentExerciseCard entry={entry} />
          {entry.exercise.plannedNotes ? (
            <p className="text-sm text-secondary">Target notes: {entry.exercise.plannedNotes}</p>
          ) : null}
          {entry.exercise.skipped ? (
            <p className="text-sm text-secondary">Skipped · saved locally</p>
          ) : (
            <SetLogger
              key={`${entry.exercise.id}:${entry.sets.map((set) => `${set.id}-${set.completed}`).join(',')}`}
              sets={entry.sets}
              previous={entry.previous?.sets ?? []}
              refresh={refresh}
              onCompleted={onCompleted}
              footer={timer}
              disabled={busy}
            />
          )}
          {!current || entry.exercise.skipped ? (
            next || unfinished ? (
              <Button
                variant="primary"
                size="large"
                onClick={() =>
                  void run(() =>
                    setCurrentWorkoutExercise(session.id, (next ?? unfinished)!.exercise.id),
                  )
                }
                disabled={busy}
              >
                Next Exercise <ArrowRight size={20} aria-hidden="true" />
              </Button>
            ) : (
              <Button variant="primary" size="large" disabled={busy} onClick={finish}>
                <Check size={20} aria-hidden="true" />
                Finish Workout
              </Button>
            )
          ) : null}
        </>
      ) : !entry ? (
        <p className="rounded-2xl border border-border bg-surface p-4 text-secondary">
          No exercises yet. Add an exercise to begin logging sets.
        </p>
      ) : null}
      {undo && now <= undo.expiresAt ? (
        <aside
          role="status"
          className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-3 py-1 text-sm"
        >
          <span>Set saved</span>
          <Button variant="ghost" disabled={busy} onClick={onUndo}>
            Undo completion
          </Button>
        </aside>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <Link className={buttonClasses('outline')} to={`/workout/${session.id}/exercises`}>
          Add Exercise
        </Link>
        <Button
          variant="ghost"
          aria-expanded={showOverview}
          onClick={() => setShowOverview((value) => !value)}
        >
          {showOverview ? 'Close overview' : 'Workout Overview'}
        </Button>
      </div>
      {showOverview ? (
        <section aria-label="Workout Overview" className="grid gap-4">
          <label className="grid gap-2 text-sm">
            <span>Workout notes</span>
            <Textarea
              defaultValue={session.notes ?? ''}
              onBlur={(event) =>
                void run(() => updateWorkoutNotes(session.id, event.target.value.trim() || null))
              }
            />
          </label>
          {overview}
        </section>
      ) : null}
    </section>
  );
}
