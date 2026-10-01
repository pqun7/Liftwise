import type { WorkoutExercise, WorkoutSession, WorkoutSet } from './entities';
import { workoutElapsedSeconds } from './workoutTime';

export interface AnalyticsWorkout {
  session: WorkoutSession;
  exercises: { exercise: WorkoutExercise; sets: WorkoutSet[] }[];
}
export const metrics = [
  'e1rm',
  'weight',
  'reps',
  'volume',
  'totalReps',
  'workingSets',
  'averageRir',
] as const;
export type Metric = (typeof metrics)[number];
export const metricLabels: Record<Metric, string> = {
  e1rm: 'Estimated 1RM (kg)',
  weight: 'Best Set Weight (kg)',
  reps: 'Best Set Reps',
  volume: 'Volume (kg·reps)',
  totalReps: 'Total Reps',
  workingSets: 'Working Sets',
  averageRir: 'Average RIR',
};
export const ranges = ['1M', '3M', '6M', '1Y', 'ALL'] as const;
export type DateRange = (typeof ranges)[number];
export function rangeStart(range: DateRange, now = new Date()): string {
  if (range === 'ALL') return '0000-01-01T00:00:00.000Z';
  const result = new Date(now);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() - { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 }[range]);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result.toISOString();
}
export function qualifiedSet(set: WorkoutSet): boolean {
  return (
    set.completed &&
    ['working', 'failure', 'drop'].includes(set.setType) &&
    set.weight !== null &&
    Number.isFinite(set.weight) &&
    set.weight >= 0 &&
    set.reps !== null &&
    Number.isInteger(set.reps) &&
    set.reps > 0
  );
}
// Epley v1: singles use actual load; limit estimates to 2–10 reps, no RIR extrapolation.
export function estimated1RM(set: WorkoutSet): number | null {
  if (
    !qualifiedSet(set) ||
    set.setType === 'drop' ||
    !set.weight ||
    set.reps! > 10 ||
    (set.rir !== null && (!Number.isFinite(set.rir) || set.rir > 3 || set.rir < 0))
  )
    return null;
  return set.reps === 1 ? set.weight : set.weight * (1 + set.reps! / 30);
}
export function setMetrics(sets: readonly WorkoutSet[]): Record<Metric, number | null> {
  const included = sets.filter(qualifiedSet);
  const estimates = included.map(estimated1RM).filter((value): value is number => value !== null);
  const rirs = included
    .map(({ rir }) => rir)
    .filter(
      (value): value is number =>
        value !== null && Number.isFinite(value) && value >= 0 && value <= 10,
    );
  return {
    e1rm: estimates.length ? Math.max(...estimates) : null,
    weight: included.length ? Math.max(...included.map((set) => set.weight!)) : null,
    reps: included.length ? Math.max(...included.map((set) => set.reps!)) : null,
    volume: included.reduce((sum, set) => sum + set.weight! * set.reps!, 0),
    totalReps: included.reduce((sum, set) => sum + set.reps!, 0),
    workingSets: included.length,
    averageRir: rirs.length ? rirs.reduce((sum, value) => sum + value, 0) / rirs.length : null,
  };
}
export function completedChronologically(
  workouts: readonly AnalyticsWorkout[],
): AnalyticsWorkout[] {
  return workouts
    .filter(({ session }) => session.status === 'completed')
    .sort(
      (a, b) =>
        a.session.startedAt.localeCompare(b.session.startedAt) ||
        a.session.id.localeCompare(b.session.id),
    );
}
export function exercisePoints(workouts: readonly AnalyticsWorkout[], exerciseId: string) {
  return completedChronologically(workouts).flatMap((graph) => {
    const entries = graph.exercises.filter(({ exercise }) => exercise.exerciseId === exerciseId);
    if (!entries.length) return [];
    const sets = entries.flatMap((entry) => entry.sets);
    return [
      {
        sessionId: graph.session.id,
        date: graph.session.startedAt,
        name: entries[0]!.exercise.exerciseName,
        sets,
        ...setMetrics(sets),
      },
    ];
  });
}
export function exerciseSummary(workouts: readonly AnalyticsWorkout[], exerciseId: string) {
  const points = exercisePoints(workouts, exerciseId).filter((point) => point.workingSets! > 0);
  const sets = points.flatMap((point) => point.sets).filter(qualifiedSet);
  const bestSet =
    [...sets].sort(
      (a, b) => b.weight! * b.reps! - a.weight! * a.reps! || b.weight! - a.weight!,
    )[0] ?? null;
  return {
    last: points.at(-1) ?? null,
    sessions: points.length,
    lifetimeWorkingSets: sets.length,
    bestSet,
    bestWeight: sets.length ? Math.max(...sets.map((set) => set.weight!)) : null,
    bestE1rm: sets
      .map(estimated1RM)
      .reduce<number | null>(
        (best, value) => (value === null ? best : Math.max(best ?? 0, value)),
        null,
      ),
  };
}
export type PrType =
  'Weight PR' | 'Rep PR' | 'Estimated 1RM PR' | 'Set Volume PR' | 'Exercise-session Volume PR';
export interface PrEvent {
  id: string;
  sessionId: string;
  exerciseId: string;
  name: string;
  date: string;
  type: PrType;
  value: number;
  previous: number;
  weight: number | null;
}
export function detectPrs(workouts: readonly AnalyticsWorkout[]): PrEvent[] {
  const events: PrEvent[] = [];
  const records = new Map<string, number>();
  for (const graph of completedChronologically(workouts)) {
    const grouped = new Map<string, { name: string; sets: WorkoutSet[] }>();
    for (const { exercise, sets } of graph.exercises) {
      const group = grouped.get(exercise.exerciseId) ?? { name: exercise.exerciseName, sets: [] };
      group.sets.push(...sets.filter(qualifiedSet));
      grouped.set(exercise.exerciseId, group);
    }
    for (const [exerciseId, group] of grouped) {
      const candidates: {
        type: PrType;
        key: string;
        value: number;
        step: number;
        weight: number | null;
      }[] = [];
      const values = setMetrics(group.sets);
      if (values.weight !== null && values.weight > 0)
        candidates.push({
          type: 'Weight PR',
          key: 'weight',
          value: values.weight,
          step: 0.5,
          weight: null,
        });
      if (values.e1rm !== null)
        candidates.push({
          type: 'Estimated 1RM PR',
          key: 'e1rm',
          value: values.e1rm,
          step: 1,
          weight: null,
        });
      if (group.sets.length) {
        candidates.push({
          type: 'Set Volume PR',
          key: 'set-volume',
          value: Math.max(...group.sets.map((set) => set.weight! * set.reps!)),
          step: 1,
          weight: null,
        });
        candidates.push({
          type: 'Exercise-session Volume PR',
          key: 'session-volume',
          value: values.volume!,
          step: 1,
          weight: null,
        });
      }
      const weights = new Set(group.sets.map((set) => set.weight!));
      for (const weight of weights)
        candidates.push({
          type: 'Rep PR',
          key: `reps:${weight}`,
          value: Math.max(
            ...group.sets.filter((set) => set.weight === weight).map((set) => set.reps!),
          ),
          step: 1,
          weight,
        });
      for (const candidate of candidates) {
        const key = `${exerciseId}:${candidate.key}`;
        const previous = records.get(key);
        if (previous !== undefined && candidate.value - previous >= candidate.step - 1e-9)
          events.push({
            id: `${graph.session.id}:${key}`,
            sessionId: graph.session.id,
            exerciseId,
            name: group.name,
            date: graph.session.startedAt,
            type: candidate.type,
            value: candidate.value,
            previous,
            weight: candidate.weight,
          });
        records.set(key, Math.max(previous ?? 0, candidate.value));
      }
    }
  }
  return events;
}
export function weeklySummary(workouts: readonly AnalyticsWorkout[], now = new Date()) {
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const graphs = workouts.filter(
    ({ session }) =>
      session.status === 'completed' &&
      Date.parse(session.startedAt) >= monday.getTime() &&
      Date.parse(session.startedAt) <= now.getTime(),
  );
  const values = setMetrics(
    graphs.flatMap((graph) => graph.exercises.flatMap((entry) => entry.sets)),
  );
  return {
    workouts: graphs.length,
    workingSets: values.workingSets!,
    volume: values.volume!,
    durationSeconds: graphs.reduce((sum, graph) => sum + workoutElapsedSeconds(graph.session), 0),
  };
}
