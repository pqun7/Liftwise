import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { WorkoutSaveContext } from './WorkoutSaveContext';
import { ArrowLeft, ArrowRight, Ellipsis, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
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
  addWorkoutSet,
  extendWorkoutRest,
  finishWorkout,
  discardWorkout,
  pauseWorkout,
  resumeWorkout,
  setCurrentWorkoutExercise,
  skipWorkoutExercise,
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
  showOverview,
  setShowOverview,
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
  showOverview: boolean;
  setShowOverview: (value: boolean) => void;
}) {
  const [reviewFinish, setReviewFinish] = useState(false);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (reviewFinish) reviewHeading.current?.focus();
  }, [reviewFinish]);
  const session = workout.session;
  const saves = useContext(WorkoutSaveContext);
  const index = Math.max(
    0,
    workout.exercises.findIndex((entry) => entry.exercise.id === session.currentExerciseId),
  );
  const entry = workout.exercises[index];
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [entry?.exercise.id]);
  const current = entry?.sets.find((set) => !set.completed);
  const next = workout.exercises
    .slice(index + 1)
    .find(
      (item) =>
        !item.exercise.skipped && (!item.sets.length || item.sets.some((set) => !set.completed)),
    );
  const unfinished = workout.exercises.find(
    (item) =>
      item.exercise.id !== entry?.exercise.id &&
      !item.exercise.skipped &&
      (!item.sets.length || item.sets.some((set) => !set.completed)),
  );
  const rest = restRemainingSeconds(session, now);
  const incompleteSets = workout.exercises
    .filter((item) => !item.exercise.skipped)
    .flatMap((item) => item.sets)
    .filter((set) => !set.completed).length;
  const emptyExercises = workout.exercises.filter(
    (item) => !item.exercise.skipped && !item.sets.length,
  ).length;
  const completedSets = workout.exercises
    .flatMap((item) => item.sets)
    .filter((set) => set.completed).length;
  const finish = () => {
    menu.current?.removeAttribute('open');
    if (incompleteSets || emptyExercises) setReviewFinish(true);
    else void run(() => finishWorkout(session.id));
  };
  const toggleOverview = () => {
    if (busy) return;
    // Presentation changes need committed drafts, but do not need another full route load.
    void (saves?.flush() ?? Promise.resolve())
      .then(() => setShowOverview(!showOverview))
      .catch(() => {});
  };
  const timer = session.restEndsAt ? (
    <RestTimer
      remaining={rest}
      duration={Math.max(
        1,
        (Date.parse(session.restEndsAt) - Date.parse(session.restStartedAt ?? session.restEndsAt)) /
          1000,
      )}
      nextSet={entry?.exercise.skipped ? undefined : current?.setNumber}
      disabled={busy}
      onAdd={() => void run(() => extendWorkoutRest(session.id))}
      onEnd={() => void run(() => clearWorkoutRest(session.id))}
    />
  ) : null;
  return (
    <section className="workout-flow workout-active" aria-labelledby="session-title">
      <header className="workout-session-header">
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
        <details ref={menu} className="relative">
          <summary
            aria-label="Workout menu"
            className={`${iconButtonClasses()} list-none cursor-pointer [&::-webkit-details-marker]:hidden`}
          >
            <Ellipsis size={20} aria-hidden="true" />
          </summary>
          <div className="absolute right-0 z-30 mt-2 grid w-52 gap-2 rounded-2xl border border-border bg-surface-3 p-3 shadow-lg">
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
                  });
              }}
            >
              Discard Workout
            </Button>
            <KeepAwake active={session.status === 'active'} />
          </div>
        </details>
      </header>
      <p className="workout-session-status" aria-label="Elapsed workout time">
        {session.status === 'paused'
          ? 'Paused'
          : `${completedSets}/${completedSets + incompleteSets} sets completed`}{' '}
        · {formatDuration(workoutElapsedSeconds(session, now))}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {session.status === 'paused' ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-mint p-3">
          <p className="text-sm">Workout paused</p>
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => void run(() => resumeWorkout(session.id))}
          >
            Resume Workout
          </Button>
        </div>
      ) : null}
      {reviewFinish ? (
        <section
          aria-labelledby="finish-review-title"
          className="grid gap-3 rounded-2xl border border-border bg-surface p-4"
        >
          <h2
            ref={reviewHeading}
            tabIndex={-1}
            id="finish-review-title"
            className="text-xl font-bold"
          >
            Finish this workout?
          </h2>
          <p>
            {incompleteSets} sets are incomplete
            {emptyExercises ? ` · ${emptyExercises} exercises have no sets` : ''}.
          </p>
          <p className="text-sm text-secondary">
            Your {completedSets} completed sets will be kept. Unfinished sets will not count toward
            performance.
          </p>
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => void run(() => finishWorkout(session.id))}
          >
            Finish anyway
          </Button>
          <Button disabled={busy} onClick={() => setReviewFinish(false)}>
            Keep training
          </Button>
        </section>
      ) : null}
      {entry && !showOverview && !reviewFinish ? (
        <>
          <WorkoutExerciseProgress
            disabled={busy}
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
            <div className="flex items-center justify-between gap-2 text-sm text-secondary">
              <span>Exercise skipped</span>
              <Button
                disabled={busy}
                onClick={() => void run(() => skipWorkoutExercise(entry.exercise.id, false))}
              >
                Resume exercise
              </Button>
            </div>
          ) : (
            <SetLogger
              key={`${entry.exercise.id}:${entry.exercise.exerciseId}`}
              sets={entry.sets}
              previous={entry.previous?.sets ?? []}
              refresh={refresh}
              onCompleted={onCompleted}
              footer={timer}
              disabled={busy || session.status === 'paused'}
            />
          )}
          {entry.exercise.skipped ? timer : null}
          {!entry.sets.length && !entry.exercise.skipped ? (
            <Button
              disabled={busy || session.status === 'paused'}
              onClick={() => void run(() => addWorkoutSet(entry.exercise.id))}
            >
              Add set
            </Button>
          ) : null}
          {!current || entry.exercise.skipped ? (
            next || unfinished ? (
              <Button
                variant="primary"
                size="large"
                className="workout-primary workout-active-action"
                onClick={() =>
                  void run(() =>
                    setCurrentWorkoutExercise(session.id, (next ?? unfinished)!.exercise.id),
                  )
                }
                disabled={busy || session.status === 'paused'}
              >
                Next Exercise <ArrowRight size={20} aria-hidden="true" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="large"
                className="workout-primary workout-active-action"
                disabled={busy || session.status === 'paused'}
                onClick={finish}
              >
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
      {!reviewFinish ? (
        <div className="flex items-center justify-between gap-2">
          <Link
            className={buttonClasses('outline')}
            to={`/workout/${session.id}/exercises`}
            aria-disabled={busy}
            onClick={(event) => {
              if (busy) event.preventDefault();
            }}
          >
            Add Exercise
          </Link>
          <Button variant="ghost" aria-expanded={showOverview} onClick={() => toggleOverview()}>
            {showOverview ? 'Close overview' : 'Workout Overview'}
          </Button>
        </div>
      ) : null}
      {showOverview && !reviewFinish ? (
        <section aria-label="Workout Overview" className="grid gap-4">
          {timer}
          <label className="grid gap-2 text-sm">
            <span>Workout notes</span>
            <Textarea
              defaultValue={session.notes ?? ''}
              onChange={(event) => {
                const notes = event.target.value;
                void saves
                  ?.save('workout-notes', () =>
                    updateWorkoutNotes(session.id, notes.trim() || null),
                  )
                  .catch(() => {});
              }}
            />
          </label>
          {overview}
        </section>
      ) : null}
    </section>
  );
}
