import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useLoaderData, useNavigate, useSearchParams } from 'react-router-dom';

import type { Exercise } from '../../domain/entities';
import { searchExercises } from '../../domain/exerciseSearch';
import { formatExerciseValue } from '../exercises/formatters';
import {
  addExerciseToWorkout,
  replaceWorkoutExercise,
  type HydratedWorkoutGraph,
} from './workoutService';

export function WorkoutExercisePickerPage() {
  const { workout, exercises } = useLoaderData<{
    workout: HydratedWorkoutGraph;
    exercises: Exercise[];
  }>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const replaceId = params.get('replace');
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [bodyPart, setBodyPart] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const bodyParts = useMemo(
    () =>
      [
        ...new Set(exercises.map(({ bodyPart: value }) => value).filter((value) => value !== null)),
      ].sort(),
    [exercises],
  );
  const results = useMemo(
    () => searchExercises(exercises, deferredQuery, bodyPart ? { bodyPart } : {}).slice(0, 60),
    [deferredQuery, exercises, bodyPart],
  );
  const add = async (exerciseId: string) => {
    setBusyId(exerciseId);
    try {
      if (replaceId) {
        if (!workout.exercises.some(({ exercise }) => exercise.id === replaceId))
          throw new Error('Exercise does not belong to this workout.');
        await replaceWorkoutExercise(replaceId, exerciseId);
      } else await addExerciseToWorkout(workout.session.id, exerciseId);
      await navigate(`/workout/${workout.session.id}`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Exercise could not be saved.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="page-stack" aria-labelledby="workout-picker-title">
      <Link className="back-link" to={`/workout/${workout.session.id}`}>
        ← {workout.session.name ?? 'Quick Workout'}
      </Link>
      <header className="program-header">
        <p className="section-kicker">Session exercise</p>
        <h1 id="workout-picker-title">
          {replaceId ? 'Replace for this workout' : 'Add to this workout'}
        </h1>
        <p>This changes only the current session, never the source program.</p>
      </header>
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}
      <label className="search-field">
        <span className="sr-only">Search exercises</span>
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search exercises"
          autoComplete="off"
        />
      </label>
      <label className="filter-field">
        <span>Body part</span>
        <select value={bodyPart} onChange={(event) => setBodyPart(event.target.value)}>
          <option value="">All</option>
          {bodyParts.map((value) => (
            <option key={value} value={value}>
              {formatExerciseValue(value)}
            </option>
          ))}
        </select>
      </label>
      <p className="result-count" aria-live="polite">
        Showing {results.length} matching exercises
      </p>
      <div className="picker-list">
        {results.map((exercise) => (
          <button
            className="picker-row workout-picker-row"
            type="button"
            key={exercise.id}
            disabled={busyId !== null}
            onClick={() => void add(exercise.id)}
          >
            <div>
              <strong>{exercise.name}</strong>
              <span>
                {formatExerciseValue(exercise.primaryMuscles[0] ?? exercise.bodyPart)} ·{' '}
                {formatExerciseValue(exercise.equipment ?? 'bodyweight')}
              </span>
            </div>
            <span aria-hidden="true">＋</span>
          </button>
        ))}
      </div>
    </section>
  );
}
