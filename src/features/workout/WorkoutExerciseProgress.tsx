import { Check, Minus, ChevronDown } from 'lucide-react';
import { Select } from '../../components/ui/FormControl';
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
                >
                  {skipped ? (
                    <Minus size={14} aria-hidden="true" />
                  ) : done ? (
                    <Check size={14} aria-hidden="true" />
                  ) : (
                    <span aria-hidden="true">{index + 1}</span>
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
      <label className="sr-only" htmlFor="jump-exercise">
        Jump to exercise
      </label>
      <div className="relative">
        <Select
          className="appearance-none pr-10"
          id="jump-exercise"
          value={currentId}
          disabled={disabled}
          onChange={(event) => onSelect(event.target.value)}
        >
          {exercises.map((entry, index) => (
            <option key={entry.exercise.id} value={entry.exercise.id}>
              {index + 1}. {entry.exercise.exerciseName} ·{' '}
              {entry.exercise.skipped
                ? 'Skipped'
                : `${entry.sets.filter((set) => set.completed).length}/${entry.sets.length} sets`}
            </option>
          ))}
        </Select>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
        />
      </div>
    </div>
  );
}
