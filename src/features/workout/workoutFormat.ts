import type { WorkoutExercise, WorkoutSet } from '../../domain/entities';

export function range(minimum: number | null, maximum: number | null, suffix: string): string {
  if (minimum === null && maximum === null) return `No ${suffix} target`;
  if (minimum === maximum || maximum === null) return `${minimum ?? maximum} ${suffix}`;
  if (minimum === null) return `Up to ${maximum} ${suffix}`;
  return `${minimum}–${maximum} ${suffix}`;
}

export function targetRange(minimum: number | null, maximum: number | null): string {
  if (minimum === null && maximum === null) return 'Not set';
  if (minimum === null) return `≤ ${maximum}`;
  if (maximum === null) return `≥ ${minimum}`;
  return minimum === maximum ? String(minimum) : `${minimum}–${maximum}`;
}

export function formatWorkoutPrescription(exercise: WorkoutExercise): string {
  const sets =
    exercise.plannedTargetSets === null ? 'No set target' : `${exercise.plannedTargetSets} sets`;
  return `${sets} · ${range(exercise.plannedMinReps, exercise.plannedMaxReps, 'reps')} · ${range(exercise.plannedRirMin, exercise.plannedRirMax, 'RIR')}`;
}

export function formatPreviousSets(sets: readonly WorkoutSet[]): string {
  if (!sets.length) return 'No previous completed performance';
  return sets
    .map(
      ({ weight, reps, rir }) =>
        `${weight ?? '—'} × ${reps ?? '—'}${rir === null ? '' : ` @ ${rir} RIR`}`,
    )
    .join(' · ');
}
