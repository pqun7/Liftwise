import { ChartNoAxesColumnIncreasing, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { ExerciseImage } from '../exercises/ExerciseImage';
import { previousSetFor } from '../../domain/workoutPrefill';
import { formatDuration } from '../../domain/workoutTime';
import type { HydratedWorkoutExercise } from './workoutService';
import { formatPreviousSets, targetRange } from './workoutFormat';

export function CurrentExerciseCard({ entry }: { entry: HydratedWorkoutExercise }) {
  const location = useLocation();
  const exercise = entry.exercise;
  const images = entry.displayExercise?.images;
  const current = entry.sets.find((set) => !set.completed);
  const history = entry.previous?.sets ?? [];
  const reference = current ? previousSetFor(current, history) : history.at(-1);
  return (
    <Card as="article" aria-label={exercise.exerciseName} className="workout-current-card ui-card">
      <Link
        to={`/exercises/${encodeURIComponent(exercise.exerciseId)}`}
        state={{
          returnTo: location.pathname + location.search,
          returnKey: location.key,
          returnLabel: 'Workout',
        }}
        className="workout-current-exercise"
      >
        <ExerciseImage
          key={exercise.exerciseId}
          image={images?.start ?? images?.main ?? images?.peak ?? null}
          className="workout-current-image"
        />
        <h2 className="min-w-0 flex-1 text-xl font-bold leading-tight">{exercise.exerciseName}</h2>
        <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-secondary" />
      </Link>
      <section aria-label="Target" className="text-xs text-secondary">
        <span className="sr-only">Sets</span>
        {exercise.plannedTargetSets ?? '—'} sets · <span className="sr-only">Reps</span>
        {targetRange(exercise.plannedMinReps, exercise.plannedMaxReps)} reps · RIR{' '}
        {targetRange(exercise.plannedRirMin, exercise.plannedRirMax)} · Rest{' '}
        {exercise.plannedRestSeconds === null
          ? 'Not set'
          : formatDuration(exercise.plannedRestSeconds)}
      </section>
      {reference && entry.previous ? (
        <Link
          to={`/workout/${entry.previous.exercise.workoutSessionId}`}
          aria-label="Last workout"
          className="flex min-h-11 items-center gap-2 text-xs"
        >
          <ChartNoAxesColumnIncreasing
            size={18}
            className="shrink-0 text-mint"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <span className="text-sm text-secondary">Previous · Set {reference.setNumber}</span>
            <p className="mt-1 text-sm font-semibold">
              {formatPreviousSets([reference]).replace(' ×', ' kg ×')}
            </p>
          </div>
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
      ) : (
        <p className="workout-no-history">No previous workout data</p>
      )}
    </Card>
  );
}
