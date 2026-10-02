import { useEffect, useState } from 'react';
import { Link, useLoaderData, useNavigate, useRevalidator } from 'react-router-dom';

import type { SetCompletionUndo } from '../../lib/storage/repositories/workoutRepository';
import { WorkoutSetRow } from './WorkoutSetRow';
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
import { formatPreviousSets, formatWorkoutPrescription } from './workoutFormat';

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
    <section className="page-stack workout-session" aria-labelledby="session-title">
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
            <button
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
            </button>
          </aside>
        ) : null}
      </div>
      {mutable ? (
        <div className="workout-session-actions">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(() =>
                session.status === 'paused' ? resumeWorkout(session.id) : pauseWorkout(session.id),
              )
            }
          >
            {session.status === 'paused' ? 'Resume' : 'Pause'}
          </button>
          <button
            className="primary-action"
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
          </button>
          <button
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
          </button>
        </div>
      ) : null}

      {session.restEndsAt ? (
        <aside className="rest-timer" aria-live="polite">
          <div>
            <span>Rest</span>
            <strong>{formatDuration(rest)}</strong>
          </div>
          <button type="button" onClick={() => void run(() => clearWorkoutRest(session.id))}>
            End rest
          </button>
        </aside>
      ) : null}

      <label className="workout-notes">
        <span>Workout notes</span>
        <textarea
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
        {workout.exercises.map((entry, index) => {
          const current = session.currentExerciseId === entry.exercise.id;
          const allComplete =
            entry.sets.length > 0 && entry.sets.every(({ completed }) => completed);
          const hidden = collapsed.has(entry.exercise.id);
          return (
            <article
              className={`session-exercise-card${current ? ' current-exercise' : ''}`}
              key={entry.exercise.id}
              id={'exercise-' + entry.exercise.id}
              aria-label={entry.exercise.exerciseName}
            >
              <header>
                <div>
                  <p className="section-kicker">Exercise {entry.exercise.order}</p>
                  <h2>{entry.exercise.exerciseName}</h2>
                  <p>{formatWorkoutPrescription(entry.exercise)}</p>
                </div>
                {mutable && !current ? (
                  <button
                    type="button"
                    onClick={() =>
                      void run(() => setCurrentWorkoutExercise(session.id, entry.exercise.id))
                    }
                  >
                    Set current
                  </button>
                ) : null}
              </header>
              {entry.exercise.plannedNotes ? (
                <p className="planned-note">Plan: {entry.exercise.plannedNotes}</p>
              ) : null}
              {entry.exercise.skipped ? (
                <p className="section-kicker">Skipped · saved locally</p>
              ) : null}
              {allComplete || hidden ? (
                <button
                  type="button"
                  aria-expanded={!hidden}
                  onClick={() =>
                    setCollapsed((current) => {
                      const changed = new Set(current);
                      if (hidden) changed.delete(entry.exercise.id);
                      else changed.add(entry.exercise.id);
                      return changed;
                    })
                  }
                >
                  {hidden ? 'Expand exercise' : 'Collapse completed exercise'}
                </button>
              ) : null}
              <div hidden={hidden}>
                <div className="previous-today">
                  <section aria-label="Previous performance">
                    <h3>Previous</h3>
                    <p className="previous-performance">
                      {formatPreviousSets(entry.previous?.sets ?? [])}
                    </p>
                  </section>
                  <section aria-label="Today performance">
                    <h3>Today</h3>
                    <p className="previous-performance">
                      {entry.sets.some(({ completed }) => completed)
                        ? formatPreviousSets(entry.sets.filter(({ completed }) => completed))
                        : 'No completed sets yet'}
                    </p>
                    <p>
                      {entry.sets.filter(({ completed }) => completed).length}/{entry.sets.length}{' '}
                      sets complete
                    </p>
                  </section>
                </div>
                <div className="workout-set-list">
                  {entry.sets.map((set) => (
                    <WorkoutSetRow
                      key={`${set.id}:${entry.exercise.exerciseId}`}
                      set={set}
                      today={entry.sets}
                      previous={entry.previous?.sets ?? []}
                      mutable={mutable && !entry.exercise.skipped}
                      completed={setUndo}
                      refresh={refresh}
                    />
                  ))}
                </div>
              </div>
              {mutable ? (
                <div className="row-actions">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        skipWorkoutExercise(entry.exercise.id, !entry.exercise.skipped),
                      )
                    }
                  >
                    {entry.exercise.skipped ? 'Resume exercise' : 'Skip exercise'}
                  </button>
                  {!entry.sets.some(({ completed }) => completed) ? (
                    <Link to={`/workout/${session.id}/exercises?replace=${entry.exercise.id}`}>
                      Replace Exercise for This Workout
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void run(() => addWorkoutSet(entry.exercise.id))}
                  >
                    ＋ Add set
                  </button>
                  <button
                    type="button"
                    disabled={index === 0}
                    aria-label={`Move ${entry.exercise.exerciseName} up`}
                    onClick={() => {
                      const ids = workout.exercises.map(({ exercise }) => exercise.id);
                      [ids[index - 1], ids[index]] = [ids[index]!, ids[index - 1]!];
                      void run(() => reorderWorkoutExercises(session.id, ids));
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === workout.exercises.length - 1}
                    aria-label={`Move ${entry.exercise.exerciseName} down`}
                    onClick={() => {
                      const ids = workout.exercises.map(({ exercise }) => exercise.id);
                      [ids[index], ids[index + 1]] = [ids[index + 1]!, ids[index]!];
                      void run(() => reorderWorkoutExercises(session.id, ids));
                    }}
                  >
                    ↓
                  </button>
                  <button
                    className="danger-text"
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(`Remove ${entry.exercise.exerciseName} from this workout?`)
                      )
                        void run(() => removeWorkoutExercise(entry.exercise.id));
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      {workout.exercises.length === 0 ? (
        <div className="empty-state">
          <h2>No exercises yet</h2>
          <p>Add an exercise to begin logging sets.</p>
        </div>
      ) : null}
    </section>
  );
}
