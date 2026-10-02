import type { ProgramExercise } from '../../domain/entities';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import type { WorkoutSession } from '../../domain/entities';

export function chronologicalDays(days: ProgramGraph['days']) {
  return [...days].sort(
    (a, b) => (a.day.weekday ?? 7) - (b.day.weekday ?? 7) || a.day.order - b.day.order,
  );
}

/** Uses the device's local calendar, including DST and week rollover. */
export function nextProgramWorkout(graph: ProgramGraph, completed: WorkoutSession[], now: Date) {
  const eligible = graph.days.filter(({ exercises }) => exercises.length > 0);
  if (!eligible.some(({ day }) => day.weekday != null)) {
    const ordered = [...eligible].sort((a, b) => a.day.order - b.day.order);
    const last = completed
      .filter((session) => session.status === 'completed' && session.programId === graph.program.id)
      .sort((a, b) => (b.endedAt ?? b.startedAt).localeCompare(a.endedAt ?? a.startedAt))[0];
    const index = ordered.findIndex(({ day }) => day.id === last?.programDayId);
    return ordered[(index + 1) % Math.max(1, ordered.length)] ?? null;
  }
  const today = (now.getDay() + 6) % 7;
  const sameDate = (date: Date) => date.toDateString() === now.toDateString();
  const distance = (entry: ProgramGraph['days'][number]) => {
    if (entry.day.weekday == null) return 8;
    const offset = (entry.day.weekday - today + 7) % 7;
    const done = completed.some(
      (session) =>
        session.status === 'completed' &&
        session.programDayId === entry.day.id &&
        sameDate(new Date(session.endedAt ?? session.startedAt)),
    );
    return offset === 0 && done ? 7 : offset;
  };
  return (
    [...eligible].sort((a, b) => distance(a) - distance(b) || a.day.order - b.day.order)[0] ?? null
  );
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
