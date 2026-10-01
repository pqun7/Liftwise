import type { WorkoutSet } from './entities';

export const DEFAULT_WEIGHT_STEP = 2.5;

export function previousSetFor(
  set: WorkoutSet,
  previous: readonly WorkoutSet[],
): WorkoutSet | undefined {
  const matching = previous.filter((item) => item.completed && item.setType === set.setType);
  return matching.find((item) => item.setNumber === set.setNumber) ?? matching.at(-1);
}

export function lastUsedSet(
  set: WorkoutSet,
  today: readonly WorkoutSet[],
  previous: readonly WorkoutSet[],
): WorkoutSet | undefined {
  return (
    today
      .filter(
        (item) => item.completed && item.setType === set.setType && item.setNumber < set.setNumber,
      )
      .at(-1) ?? previousSetFor(set, previous)
  );
}

export function copiedSetValues(source: WorkoutSet) {
  return { weight: source.weight, reps: source.reps, rir: source.rir };
}
