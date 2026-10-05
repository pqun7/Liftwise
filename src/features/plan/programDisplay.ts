import type { ProgramExercise } from '../../domain/entities';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import type { WorkoutSession } from '../../domain/entities';
import { trainingCalendar } from '../../domain/trainingCalendar';

export function chronologicalDays(days: ProgramGraph['days']) {
  return [...days].sort(
    (a, b) => (a.day.weekday ?? 7) - (b.day.weekday ?? 7) || a.day.order - b.day.order,
  );
}

/** Strictly future for dated plans; completion rotation for undated plans. */
export function nextProgramWorkout(graph: ProgramGraph, completed: WorkoutSession[], now: Date) {
  const calendar = trainingCalendar(graph, completed, now);
  return calendar.next?.entry ?? null;
}

export function compactPrescription(item: ProgramExercise) {
  const reps =
    item.minReps == null
      ? item.maxReps
      : item.maxReps == null || item.minReps === item.maxReps
        ? item.minReps
        : `${item.minReps}–${item.maxReps}`;
  return `${item.targetSets ?? '—'} × ${reps ?? '—'}${item.restSeconds == null ? '' : ` · ${item.restSeconds} sec`}`;
}

/** Planning estimate only: 45s per set, prescribed inter-set rests and 60s transitions. */
export function estimatedProgramMinutes(exercises: readonly ProgramExercise[]): number | null {
  if (
    !exercises.length ||
    exercises.some((item) => item.targetSets == null || item.restSeconds == null)
  )
    return null;
  const seconds =
    exercises.reduce(
      (sum, item) =>
        sum + item.targetSets! * 45 + Math.max(0, item.targetSets! - 1) * item.restSeconds!,
      0,
    ) +
    Math.max(0, exercises.length - 1) * 60;
  return Math.ceil(seconds / 300) * 5;
}
