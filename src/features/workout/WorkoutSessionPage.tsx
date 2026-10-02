import { ActiveWorkoutLogger } from './ActiveWorkoutLogger';
import { WorkoutSummary } from './WorkoutSummary';
import { MobilePage } from '../../components/layout/MobilePage';
import { Textarea } from '../../components/ui/FormControl';
import { useEffect, useRef, useState } from 'react';
import { Link, useLoaderData, useRevalidator } from 'react-router-dom';

import type { SetCompletionUndo } from '../../lib/storage/repositories/workoutRepository';
import { WorkoutExerciseCard } from './WorkoutExerciseCard';
import { formatDuration, workoutElapsedSeconds } from '../../domain/workoutTime';
import {
  addWorkoutSet,
  removeWorkoutExercise,
  reorderWorkoutExercises,
  setCurrentWorkoutExercise,
  skipWorkoutExercise,
  undoWorkoutCompletion,
  type HydratedWorkoutGraph,
} from './workoutService';

export function WorkoutSessionPage() {
  const { workout } = useLoaderData<{ workout: HydratedWorkoutGraph }>();
  const revalidator = useRevalidator();
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const operationInFlight = useRef(false);
  const [undo, setUndo] = useState<SetCompletionUndo | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [pageError, setPageError] = useState<string | null>(null);
  const refresh = async () => {
    await revalidator.revalidate();
  };
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  const run = async (action: () => Promise<unknown>) => {
    if (operationInFlight.current) return;
    operationInFlight.current = true;
    setBusy(true);
    setPageError(null);
    try {
      await action();
      await refresh();
    } catch (nextError) {
      setPageError(
        nextError instanceof Error ? nextError.message : 'The change could not be saved.',
      );
    } finally {
      operationInFlight.current = false;
      setBusy(false);
    }
  };
  const session = workout.session;
  const mutable = session.status === 'active' || session.status === 'paused';

  const overview = (
    <div className="grid gap-4">
      {workout.exercises.map((entry, index) => (
        <WorkoutExerciseCard
          key={entry.exercise.id}
          entry={entry}
          sessionId={session.id}
          mutable={mutable}
          current={session.currentExerciseId === entry.exercise.id}
          hidden={collapsed.has(entry.exercise.id)}
          busy={busy}
          canMoveUp={index > 0}
          canMoveDown={index < workout.exercises.length - 1}
          refresh={refresh}
          onCompleted={setUndo}
          onCurrent={() => void run(() => setCurrentWorkoutExercise(session.id, entry.exercise.id))}
          onCollapse={() =>
            setCollapsed((current) => {
              const changed = new Set(current);
              if (changed.has(entry.exercise.id)) changed.delete(entry.exercise.id);
              else changed.add(entry.exercise.id);
              return changed;
            })
          }
          onSkip={() =>
            void run(() => skipWorkoutExercise(entry.exercise.id, !entry.exercise.skipped))
          }
          onAddSet={() => void run(() => addWorkoutSet(entry.exercise.id))}
          onMove={(direction) => {
            const ids = workout.exercises.map(({ exercise }) => exercise.id);
            const target = index + direction;
            [ids[index], ids[target]] = [ids[target]!, ids[index]!];
            void run(() => reorderWorkoutExercises(session.id, ids));
          }}
          onRemove={() => {
            if (window.confirm(`Remove ${entry.exercise.exerciseName} from this workout?`))
              void run(() => removeWorkoutExercise(entry.exercise.id));
          }}
        />
      ))}
    </div>
  );
  if (mutable)
    return (
      <ActiveWorkoutLogger
        workout={workout}
        now={now}
        busy={busy}
        run={run}
        refresh={refresh}
        onCompleted={setUndo}
        undo={undo}
        error={pageError}
        overview={overview}
        onUndo={() => {
          if (undo)
            void run(async () => {
              await undoWorkoutCompletion(undo);
              setUndo(null);
            });
        }}
      />
    );

  if (session.status === 'completed') return <WorkoutSummary workout={workout} />;

  return (
    <MobilePage className="grid gap-4" aria-labelledby="session-title">
      <Link className="back-link" to="/workout">
        ← Workouts
      </Link>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-mint">{session.status} · saved locally</p>
          <h1 id="session-title" className="text-2xl font-bold">
            {session.name ?? 'Quick Workout'}
          </h1>
        </div>
        <strong aria-label="Elapsed workout time">
          {formatDuration(workoutElapsedSeconds(session, now))}
        </strong>
      </header>
      {pageError ? (
        <p role="alert" className="text-red-300">
          {pageError}
        </p>
      ) : null}
      <label className="grid gap-2 text-sm">
        <span>Workout notes</span>
        <Textarea value={session.notes ?? ''} disabled />
      </label>
      {overview}
      {workout.exercises.length === 0 ? <p>No exercises recorded.</p> : null}
    </MobilePage>
  );
}
