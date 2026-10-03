import type { HydratedWorkoutExercise } from './workoutService';
export function WorkoutExerciseProgress({
  exercises,
  currentId,
  onSelect,
  disabled = false,
}: {
  exercises: HydratedWorkoutExercise[];
  currentId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid min-w-0 gap-1">
      <nav aria-label="Workout exercises" className="workout-exercise-progress">
        {exercises.map((entry, index) => {
          const current = entry.exercise.id === currentId;
          const completed = entry.sets.filter((set) => set.completed).length;
          const done = entry.sets.length > 0 && completed === entry.sets.length;
          const skipped = entry.exercise.skipped;
          return (
            <div key={entry.exercise.id} className="workout-progress-step">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(entry.exercise.id)}
                aria-label={`${entry.exercise.exerciseName}, ${skipped ? 'skipped' : done ? 'completed' : completed ? `${completed} of ${entry.sets.length} sets completed` : 'upcoming'}${current ? ', current' : ''}`}
                aria-current={current ? 'step' : undefined}
                className="workout-progress-button"
              >
                <span
                  className={`workout-progress-node ${current ? 'is-current' : ''} ${done ? 'is-done' : ''} ${skipped ? 'is-skipped' : ''} ${completed && !done ? 'is-partial' : ''}`}
                ></span>
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
    </div>
  );
}
