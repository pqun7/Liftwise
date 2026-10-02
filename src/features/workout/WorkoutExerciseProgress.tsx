import { Check } from 'lucide-react';
import type { HydratedWorkoutExercise } from './workoutService';

export function WorkoutExerciseProgress({
  exercises,
  currentId,
  onSelect,
}: {
  exercises: HydratedWorkoutExercise[];
  currentId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav
      aria-label="Workout exercises"
      className="flex flex-wrap items-center justify-between gap-y-2 py-1"
    >
      {exercises.map((entry, index) => {
        const current = entry.exercise.id === currentId;
        const done =
          entry.exercise.skipped ||
          (entry.sets.length > 0 && entry.sets.every((set) => set.completed));
        return (
          <div key={entry.exercise.id} className="flex min-w-11 flex-1 items-center last:flex-none">
            <button
              type="button"
              onClick={() => onSelect(entry.exercise.id)}
              aria-label={`${entry.exercise.exerciseName}, ${done ? 'completed or skipped' : current ? 'current' : 'upcoming'}`}
              aria-current={current ? 'step' : undefined}
              className="flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-mint"
            >
              <span
                className={`flex size-5 items-center justify-center rounded-full ${current ? 'border-2 border-mint bg-mint outline-2 outline-offset-3 outline-mint' : done ? 'bg-mint text-app' : 'border border-border bg-surface-3 text-secondary'}`}
              >
                {done ? (
                  <Check size={14} aria-hidden="true" />
                ) : (
                  <span className="sr-only">{index + 1}</span>
                )}
              </span>
            </button>
            {index < exercises.length - 1 ? (
              <span
                aria-hidden="true"
                className={`h-0.5 min-w-1 flex-1 rounded-full ${done ? 'bg-mint' : 'bg-border'}`}
              />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
