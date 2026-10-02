import { setMetrics, type AnalyticsWorkout } from '../../domain/analytics';
import { workoutElapsedSeconds } from '../../domain/workoutTime';

export function periodSummary(workouts: readonly AnalyticsWorkout[]) {
  const completed = workouts.filter(({ session }) => session.status === 'completed');
  const values = setMetrics(
    completed.flatMap((graph) => graph.exercises.flatMap((entry) => entry.sets)),
  );
  return {
    workouts: completed.length,
    duration: completed.reduce((sum, graph) => sum + workoutElapsedSeconds(graph.session), 0),
    volume: values.volume!,
    sets: values.workingSets!,
  };
}
export function comparison(current: number, previous: number): string | null {
  if (previous <= 0) return null;
  const delta = ((current - previous) / previous) * 100;
  return `${delta < 0 ? '↓' : '↑'} ${Math.abs(Math.round(delta))}%`;
}
// Factual activity frequency: distinct local calendar days with a completed session.
// This is not schedule adherence, since no canonical adherence rule exists.
export function trainingDays(workouts: readonly AnalyticsWorkout[]) {
  return new Set(
    workouts
      .filter(({ session }) => session.status === 'completed')
      .map(({ session }) => new Date(session.startedAt).toDateString()),
  ).size;
}
// Count local calendar dates touched by the rolling period, including partial end days.
export function calendarDays(from: string, until: string) {
  const ordinal = (stamp: string) => {
    const date = new Date(stamp);
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
  };
  return Math.max(1, ordinal(until) - ordinal(from) + 1);
}
export function weekdayActivity(workouts: readonly AnalyticsWorkout[]) {
  const counts = Array<number>(7).fill(0);
  for (const { session } of workouts)
    if (session.status === 'completed') counts[(new Date(session.startedAt).getDay() + 6) % 7]!++;
  return counts;
}
