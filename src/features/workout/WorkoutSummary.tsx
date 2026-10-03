import { Check, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { calculateWorkoutVolume } from '../../domain/calculations';
import { ExerciseImage } from '../exercises/ExerciseImage';
import { formatDuration, workoutElapsedSeconds } from '../../domain/workoutTime';
import { formatPreviousSets } from './workoutFormat';
import type { HydratedWorkoutGraph } from './workoutService';

export function WorkoutSummary({
  workout,
  onUndo,
}: {
  workout: HydratedWorkoutGraph;
  onUndo?: (() => void) | undefined;
}) {
  const [review, setReview] = useState(false);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  const completed = workout.exercises.flatMap(({ sets }) => sets.filter((set) => set.completed));
  const exercises = workout.exercises.filter(({ sets }) => sets.some((set) => set.completed));
  const allSets = workout.exercises.flatMap((entry) => entry.sets);
  const rirs = completed.flatMap((set) => (set.rir === null ? [] : [set.rir]));
  if (!review)
    return (
      <section className="workout-flow workout-summary" aria-labelledby="session-title">
        <header className="workout-summary-header">
          <span className="workout-summary-check">
            <Check size={28} aria-hidden="true" />
          </span>
          <h1 id="session-title">Workout complete</h1>
          <p className="text-secondary">Great work. Today's workout is saved.</p>
        </header>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="type-section-title">{workout.session.name ?? 'Quick Workout'}</h2>
          <p className="mt-1 text-sm text-secondary">
            {exercises.length} exercises · {completed.length} sets ·{' '}
            {Math.ceil(workoutElapsedSeconds(workout.session) / 60)} min
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center text-sm">
          {[
            ['Total volume', `${calculateWorkoutVolume(completed).toLocaleString()} kg`],
            ['Total sets', `${completed.length} / ${allSets.length}`],
            ['Duration', `${Math.ceil(workoutElapsedSeconds(workout.session) / 60)} min`],
            ['Exercises', exercises.length],
            ['Sets unlogged', allSets.length - completed.length],
            [
              'Avg. RIR',
              rirs.length
                ? (rirs.reduce((sum, value) => sum + value, 0) / rirs.length).toFixed(1)
                : '—',
            ],
          ].map(([label, value]) => (
            <div className="rounded-xl border border-border bg-surface p-3" key={label}>
              <dt className="text-xs text-secondary">{label}</dt>
              <dd className="mt-1 type-card-title tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <Link to="/workout" className="workout-primary">
          Done
        </Link>
        <Button size="large" onClick={() => setReview(true)}>
          View Workout
        </Button>
        {onUndo ? (
          <Button variant="ghost" onClick={onUndo}>
            Undo completion
          </Button>
        ) : null}
      </section>
    );
  return (
    <section className="workout-flow workout-summary" aria-labelledby="session-title">
      <header className="workout-summary-header">
        <span className="workout-summary-check">
          <Check size={28} aria-hidden="true" />
        </span>
        <p>Workout complete</p>
        <h1 id="session-title">{workout.session.name ?? 'Quick Workout'}</h1>
        <span className="text-secondary">Your session is saved.</span>
      </header>
      <dl className="workout-summary-metrics">
        <div>
          <dt>Duration</dt>
          <dd>{formatDuration(workoutElapsedSeconds(workout.session))}</dd>
        </div>
        <div>
          <dt>Exercises</dt>
          <dd>{exercises.length}</dd>
        </div>
        <div>
          <dt>Sets completed</dt>
          <dd>{completed.length}</dd>
        </div>
      </dl>
      <section className="workout-summary-exercises" aria-label="Exercise summaries">
        <h2>Session recap</h2>
        {workout.exercises.map((entry) => {
          const sets = entry.sets.filter((set) => set.completed);
          const images = entry.displayExercise?.images;
          return (
            <article key={entry.exercise.id}>
              <div className="workout-summary-exercise-heading">
                <ExerciseImage
                  image={images?.start ?? images?.main ?? images?.peak ?? null}
                  className="workout-preview-image"
                />
                <div>
                  <h3>{entry.exercise.exerciseName}</h3>
                  <p>
                    {entry.exercise.skipped
                      ? 'Skipped'
                      : `${sets.length} of ${entry.sets.length} sets completed`}
                  </p>
                </div>
                <Link
                  to={`/exercises/${encodeURIComponent(entry.exercise.exerciseId)}`}
                  aria-label={`${entry.exercise.exerciseName} details`}
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </Link>
              </div>
              {sets.length ? (
                <ol>
                  {sets.map((set) => (
                    <li key={set.id}>
                      <span>Set {set.setNumber}</span>
                      <strong>{formatPreviousSets([set]).replace(' ×', ' kg ×')}</strong>
                      <Check size={15} aria-label="Completed set" />
                    </li>
                  ))}
                </ol>
              ) : null}
            </article>
          );
        })}
        {!workout.exercises.length ? <p>No exercises recorded.</p> : null}
      </section>
      {workout.session.notes ? (
        <section className="workout-summary-notes">
          <h2>Notes</h2>
          <p>{workout.session.notes}</p>
        </section>
      ) : null}
      <Link to="/workout" className="workout-primary workout-summary-done">
        Done
      </Link>
    </section>
  );
}
