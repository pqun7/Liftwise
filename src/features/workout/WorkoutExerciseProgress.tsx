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
    <nav aria-label="Workout exercises" className="workout-exercise-progress">
      {exercises.map((entry, index) => {
        const current = entry.exercise.id === currentId;
        const done =
          entry.exercise.skipped ||
          (entry.sets.length > 0 && entry.sets.every((set) => set.completed));
        return (
          <div key={entry.exercise.id} className="workout-progress-step">
            <button
              type="button"
              onClick={() => onSelect(entry.exercise.id)}
              aria-label={`${entry.exercise.exerciseName}, ${done ? 'completed or skipped' : current ? 'current' : 'upcoming'}`}
              aria-current={current ? 'step' : undefined}
              className="workout-progress-button"
            >
              <span
                className={`workout-progress-node ${current ? 'is-current' : ''} ${done ? 'is-done' : ''}`}
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
                className={`workout-progress-connector ${done ? 'is-done' : ''}`}
              />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
