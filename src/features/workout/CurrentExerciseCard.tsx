import { ChartNoAxesColumnIncreasing, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { ExerciseImage } from '../exercises/ExerciseImage';
import { previousSetFor } from '../../domain/workoutPrefill';
import { formatDuration } from '../../domain/workoutTime';
import type { HydratedWorkoutExercise } from './workoutService';
import { formatPreviousSets, targetRange } from './workoutFormat';

export function CurrentExerciseCard({ entry }: { entry: HydratedWorkoutExercise }) {
  const exercise = entry.exercise;
  const images = entry.displayExercise?.images;
  const current = entry.sets.find((set) => !set.completed);
  const history = entry.previous?.sets ?? [];
  const reference = current ? previousSetFor(current, history) : history.at(-1);
  return (
    <Card as="article" aria-label={exercise.exerciseName} className="workout-current-card">
      <Link
        to={`/exercises/${encodeURIComponent(exercise.exerciseId)}`}
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
      <section aria-label="Target" className="grid gap-2">
        <h3 className="text-sm font-semibold text-secondary">Target</h3>
        <dl className="grid grid-cols-4 gap-2">
          {[
            ['Sets', exercise.plannedTargetSets ?? 'Not set'],
            ['Reps', targetRange(exercise.plannedMinReps, exercise.plannedMaxReps)],
            ['RIR', targetRange(exercise.plannedRirMin, exercise.plannedRirMax)],
            [
              'Rest',
              exercise.plannedRestSeconds === null
                ? 'Not set'
                : formatDuration(exercise.plannedRestSeconds),
            ],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-sm text-secondary">{label}</dt>
              <dd className="mt-1 break-words text-base font-bold text-primary">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      {reference && entry.previous ? (
        <Link
          to={`/workout/${entry.previous.exercise.workoutSessionId}`}
          aria-label="Last workout"
          className="workout-previous-row"
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
