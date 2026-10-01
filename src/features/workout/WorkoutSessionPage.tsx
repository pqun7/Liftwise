import { useEffect, useState } from 'react';
import { Link, useLoaderData, useNavigate, useRevalidator } from 'react-router-dom';

import type { WorkoutSet, WorkoutSetType } from '../../domain/entities';
import {
  formatDuration,
  restRemainingSeconds,
  workoutElapsedSeconds,
} from '../../domain/workoutTime';
import {
  addWorkoutSet,
  clearWorkoutRest,
  deleteWorkoutSet,
  discardWorkout,
  finishWorkout,
  pauseWorkout,
  removeWorkoutExercise,
  reorderWorkoutExercises,
  resumeWorkout,
  setCurrentWorkoutExercise,
  startWorkoutRest,
  updateWorkoutNotes,
  updateWorkoutSet,
  type HydratedWorkoutGraph,
} from './workoutService';
import { formatPreviousSets, formatWorkoutPrescription } from './workoutFormat';

function nullableNumber(value: string): number | null {
  return value.trim() === '' ? null : Number(value);
}

function WorkoutSetRow({
  set,
  sessionId,
  restSeconds,
  refresh,
}: Readonly<{
  set: WorkoutSet;
  sessionId: string;
  restSeconds: number | null;
  refresh: () => Promise<void>;
}>) {
  const [weight, setWeight] = useState(set.weight?.toString() ?? '');
  const [reps, setReps] = useState(set.reps?.toString() ?? '');
  const [rir, setRir] = useState(set.rir?.toString() ?? '');
  const [setType, setSetType] = useState<WorkoutSetType>(set.setType);
  const [error, setError] = useState<string | null>(null);
  const persist = async (input: Parameters<typeof updateWorkoutSet>[1]) => {
    setError(null);
    try {
      await updateWorkoutSet(set.id, input);
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Set could not be saved.');
    }
  };
  const toggleComplete = async () => {
    setError(null);
    try {
      await updateWorkoutSet(set.id, {
        weight: nullableNumber(weight),
        reps: nullableNumber(reps),
        rir: nullableNumber(rir),
        setType,
        completed: !set.completed,
      });
      if (!set.completed && restSeconds !== null) {
        await startWorkoutRest(sessionId, restSeconds);
      }
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Set could not be saved.');
    }
  };

  return (
    <div className={`workout-set-row${set.completed ? ' set-complete' : ''}`}>
      <span className="set-number">{set.setNumber}</span>
      <label>
        <span>kg</span>
        <input
          inputMode="decimal"
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
          onBlur={() => void persist({ weight: nullableNumber(weight) })}
          aria-label={`Set ${set.setNumber} weight`}
        />
      </label>
      <label>
        <span>Reps</span>
        <input
          inputMode="numeric"
          value={reps}
          onChange={(event) => setReps(event.target.value)}
          onBlur={() => void persist({ reps: nullableNumber(reps) })}
          aria-label={`Set ${set.setNumber} reps`}
        />
      </label>
      <label>
        <span>RIR</span>
        <input
          inputMode="decimal"
          value={rir}
          onChange={(event) => setRir(event.target.value)}
          onBlur={() => void persist({ rir: nullableNumber(rir) })}
          aria-label={`Set ${set.setNumber} RIR`}
        />
      </label>
      <label className="set-type-field">
        <span>Type</span>
        <select
          value={setType}
          aria-label={`Set ${set.setNumber} type`}
          onChange={(event) => {
            const value = event.target.value as WorkoutSetType;
            setSetType(value);
            void persist({ setType: value });
          }}
        >
          <option value="warmup">Warmup</option>
          <option value="working">Working</option>
          <option value="drop">Drop</option>
          <option value="failure">Failure</option>
        </select>
      </label>
      <button
        className="set-complete-action"
        type="button"
        aria-pressed={set.completed}
        onClick={() => void toggleComplete()}
      >
        {set.completed ? 'Completed' : 'Complete set'}
      </button>
      <button
        className="set-delete-action"
        type="button"
        aria-label={`Delete set ${set.setNumber}`}
        onClick={() => {
          if (window.confirm(`Delete set ${set.setNumber}?`))
            void deleteWorkoutSet(set.id).then(refresh);
        }}
      >
        Delete
      </button>
      {error ? (
        <p className="form-error set-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function WorkoutSessionPage() {
  const { workout } = useLoaderData<{ workout: HydratedWorkoutGraph }>();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
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

      {pageError ? (
        <p className="form-error" role="alert">
          {pageError}
        </p>
      ) : null}

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
          return (
            <article
              className={`session-exercise-card${current ? ' current-exercise' : ''}`}
              key={entry.exercise.id}
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
              <p className="previous-performance">
                <strong>Previous:</strong> {formatPreviousSets(entry.previous?.sets ?? [])}
              </p>
              <div className="workout-set-list">
                {entry.sets.map((set) => (
                  <WorkoutSetRow
                    key={set.id}
                    set={set}
                    sessionId={session.id}
                    restSeconds={entry.exercise.plannedRestSeconds}
                    refresh={refresh}
                  />
                ))}
              </div>
              {mutable ? (
                <div className="row-actions">
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
