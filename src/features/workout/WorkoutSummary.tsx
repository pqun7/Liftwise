import { Check, ChevronRight } from 'lucide-react';
import { useScreenState } from '../../app/useScreenState';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { WorkoutComplete } from './WorkoutComplete';
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
  const [review, setReview] = useScreenState('review', false);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const completed = workout.exercises.flatMap(({ sets }) => sets.filter((set) => set.completed));
  const exercises = workout.exercises.filter(({ sets }) => sets.some((set) => set.completed));
  const allSets = workout.exercises.flatMap((entry) => entry.sets);
  const rirs = completed.flatMap((set) => (set.rir === null ? [] : [set.rir]));
  if (!review && params.get('details') !== '1')
    return (
      <div className="grid gap-3">
        {workout.session.durationEstimated ? (
          <p className="text-sm text-secondary">
            Duration is estimated from the last saved checkpoint.
          </p>
        ) : null}
        <WorkoutComplete
          workout={{
            name: workout.session.name ?? 'Quick Workout',
            exercises: exercises.length,
            completedSets: completed.length,
            totalSets: allSets.length,
            duration: Math.ceil(workoutElapsedSeconds(workout.session) / 60),
            totalVolume: calculateWorkoutVolume(completed),
            rir: rirs.length ? rirs.reduce((sum, value) => sum + value, 0) / rirs.length : null,
          }}
          onDone={() => {
            void navigate('/workout');
          }}
          onViewDetails={() => setReview(true)}
          onUndo={onUndo}
        />
      </div>
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
          <dt>{workout.session.durationEstimated ? 'Estimated duration' : 'Duration'}</dt>
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
      <Link
        to="/workout"
        className="workout-primary ui-button ui-button-primary ui-button-large workout-summary-done"
      >
        Done
      </Link>
    </section>
  );
}
