import type { WorkoutSet } from './entities';

export function calculateWorkoutVolume(sets: readonly WorkoutSet[]): number {
  return sets.reduce((total, set) => {
    if (!set.completed || set.weight === null || set.reps === null) {
      return total;
    }

    return total + set.weight * set.reps;
  }, 0);
}
