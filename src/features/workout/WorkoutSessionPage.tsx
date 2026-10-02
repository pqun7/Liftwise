import { RestTimer } from './RestTimer';
import { MobilePage } from '../../components/layout/MobilePage';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/FormControl';
import { useEffect, useState } from 'react';
import { Link, useLoaderData, useNavigate, useRevalidator } from 'react-router-dom';

import type { SetCompletionUndo } from '../../lib/storage/repositories/workoutRepository';
import { WorkoutExerciseCard } from './WorkoutExerciseCard';
import { KeepAwake } from './KeepAwake';
import {
  formatDuration,
  restRemainingSeconds,
  workoutElapsedSeconds,
} from '../../domain/workoutTime';
import {
  addWorkoutSet,
  clearWorkoutRest,
  discardWorkout,
  finishWorkout,
  pauseWorkout,
  removeWorkoutExercise,
  reorderWorkoutExercises,
  resumeWorkout,
  setCurrentWorkoutExercise,
  updateWorkoutNotes,
  skipWorkoutExercise,
  undoWorkoutCompletion,
  type HydratedWorkoutGraph,
} from './workoutService';

export function WorkoutSessionPage() {
  const { workout } = useLoaderData<{ workout: HydratedWorkoutGraph }>();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
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
      setBusy(false);
    }
  };
  const session = workout.session;
  const mutable = session.status === 'active' || session.status === 'paused';
  const rest = restRemainingSeconds(session, now);

  return (
    <MobilePage className="workout-session grid gap-4" aria-labelledby="session-title">
      <Link className="back-link" to="/workout">
        ← Workouts
      </Link>
      <header className="workout-session-header">
        <div>
          <p className="section-kicker">{session.status} · saved locally</p>
          <h1 id="session-title">{session.name ?? 'Quick Workout'}</h1>
        </div>
        <strong aria-label="Elapsed workout time">
          {formatDuration(workoutElapsedSeconds(session, now))}
        </strong>
      </header>
      {mutable ? <KeepAwake active={session.status === 'active'} /> : null}

      <div className="workout-sticky-controls">
        {mutable && workout.exercises.length > 0 ? (
          <aside className="workout-current-control">
            <a
              href={'#exercise-' + (session.currentExerciseId ?? workout.exercises[0]!.exercise.id)}
            >
              Current:{' '}
              {workout.exercises.find(({ exercise }) => exercise.id === session.currentExerciseId)
                ?.exercise.exerciseName ?? workout.exercises[0]!.exercise.exerciseName}
            </a>
            <span>{rest > 0 ? 'Rest ' + formatDuration(rest) : 'Ready for next set'}</span>
          </aside>
        ) : null}
        {pageError ? (
          <p className="form-error" role="alert">
            {pageError}
          </p>
        ) : null}

        {undo && now <= undo.expiresAt ? (
          <aside className="workout-undo" role="status">
            Set saved{' '}
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await undoWorkoutCompletion(undo);
                  setUndo(null);
                })
              }
            >
              Undo completion
            </Button>
          </aside>
        ) : null}
      </div>
      {mutable ? (
        <div className="workout-session-actions">
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(() =>
                session.status === 'paused' ? resumeWorkout(session.id) : pauseWorkout(session.id),
              )
            }
          >
            {session.status === 'paused' ? 'Resume' : 'Pause'}
          </Button>
          <Button
            variant="primary"
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await finishWorkout(session.id);
                await navigate('/workout');
              })
            }
          >
            Finish Workout
          </Button>
          <Button
            className="danger-text"
            type="button"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  'Discard this workout? Saved sets will remain as a discarded record.',
                )
              )
                void run(async () => {
                  await discardWorkout(session.id);
                  await navigate('/workout');
                });
            }}
          >
            Discard
          </Button>
        </div>
      ) : null}

      {session.restEndsAt ? (
        <RestTimer remaining={rest} onEnd={() => void run(() => clearWorkoutRest(session.id))} />
      ) : null}

      <label className="workout-notes">
        <span>Workout notes</span>
        <Textarea
          defaultValue={session.notes ?? ''}
          disabled={!mutable}
          onBlur={(event) =>
            void run(() => updateWorkoutNotes(session.id, event.target.value.trim() || null))
          }
          placeholder="Notes are saved when you leave this field"
        />
      </label>

      {mutable ? (
        <Link className="compact-link" to={`/workout/${session.id}/exercises`}>
          Add Exercise
        </Link>
      ) : null}

      <div className="session-exercise-list">
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
            onCurrent={() =>
              void run(() => setCurrentWorkoutExercise(session.id, entry.exercise.id))
            }
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
      {workout.exercises.length === 0 ? (
        <div className="empty-state">
          <h2>No exercises yet</h2>
          <p>Add an exercise to begin logging sets.</p>
        </div>
      ) : null}
    </MobilePage>
  );
}
