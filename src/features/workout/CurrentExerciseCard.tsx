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
    : `Last set: ${formatPreviousSets(history.slice(-1))} · ${history.length} sets`;
  return (
    <Card as="article" aria-label={entry.exercise.exerciseName} className="grid gap-3">
      <Link
        to={`/exercises/${encodeURIComponent(entry.exercise.exerciseId)}`}
        className="flex min-h-20 items-center gap-3 no-underline"
      >
        <ExerciseImage
          key={entry.exercise.exerciseId}
          image={image}
          className="!h-20 !w-28 shrink-0 rounded-xl bg-surface-3 object-contain"
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
          className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs no-underline"
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
        <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-secondary">
          No previous workout data
        </p>
      )}
    </Card>
  );
}
