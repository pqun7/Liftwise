import { ChartNoAxesColumnIncreasing, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { ExerciseImage } from '../exercises/ExerciseImage';
import type { HydratedWorkoutExercise } from './workoutService';
import { formatPreviousSets, formatWorkoutPrescription } from './workoutFormat';

export function CurrentExerciseCard({ entry }: { entry: HydratedWorkoutExercise }) {
  const images = entry.displayExercise?.images;
  const image = images?.start ?? images?.main ?? images?.peak ?? null;
  const history = entry.previous?.sets.filter((set) => set.completed) ?? [];
  const first = history[0];
  const uniform =
    first &&
    history.every(
      (set) => set.weight === first.weight && set.reps === first.reps && set.rir === first.rir,
    );
  const summary = uniform
    ? `${first.weight ?? '—'} kg × ${first.reps ?? '—'} × ${history.length}${first.rir === null ? '' : ` · RIR ${first.rir}`}`
    : `${formatPreviousSets(history.slice(-1)).replace(' ×', ' kg ×')} · ${history.length} sets`;
  return (
    <Card as="article" aria-label={entry.exercise.exerciseName} className="workout-current-card">
      <Link
        to={`/exercises/${encodeURIComponent(entry.exercise.exerciseId)}`}
        className="workout-current-exercise"
      >
        <ExerciseImage
          key={entry.exercise.exerciseId}
          image={image}
          className="workout-current-image"
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold leading-tight">{entry.exercise.exerciseName}</h2>
          <p className="mt-1 text-xs leading-relaxed text-secondary">
            {formatWorkoutPrescription(entry.exercise)}
          </p>
        </div>
        <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-secondary" />
      </Link>
      {entry.previous ? (
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
          <span className="font-semibold">Last workout</span>
          <span className="min-w-0 flex-1 text-secondary">{summary}</span>
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
      ) : (
        <p className="workout-no-history">No previous workout data</p>
      )}
    </Card>
  );
}
