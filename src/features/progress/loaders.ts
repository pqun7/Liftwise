import { completionDate } from '../../domain/streak';
import { localPeriodStart } from '../../domain/localCalendar';
import type { LoaderFunctionArgs } from 'react-router-dom';
import { ranges, rangeStart, type DateRange } from '../../domain/analytics';
import { bodyMetricRepository } from '../../lib/storage/repositories/bodyMetricRepository';
import { progressRepository } from './progressService';

export function selectedRange(url: string): DateRange {
  const value = new URL(url).searchParams.get('range');
  return ranges.find((range) => range === value) ?? '3M';
}
export async function progressLoader({ request }: LoaderFunctionArgs) {
  const range = selectedRange(request.url);
  const now = new Date();
  const start = localPeriodStart(range, now);
  const [history, streak] = await Promise.all([
    progressRepository.history(rangeStart('ALL'), now.toISOString()),
    progressRepository.streak(now, undefined, start),
  ]);
  const workouts = history.filter(({ session }) => {
    const date = completionDate(session, now);
    return date !== null && date >= start;
  });
  return { workouts, range, now: now.toISOString(), start, streak };
}
export async function workoutHistoryLoader() {
  const now = new Date();
  const [workouts, streak] = await Promise.all([
    progressRepository.history(rangeStart('ALL'), now.toISOString()),
    progressRepository.streak(now, undefined, localPeriodStart('ALL', now)),
  ]);
  return {
    workouts,
    streak,
  };
}
export async function bodyMeasurementsLoader() {
  const [bodyMetrics, streak] = await Promise.all([
    bodyMetricRepository.list(),
    progressRepository.streak(),
  ]);
  return { bodyMetrics, streak };
}
export async function exercisePickerLoader() {
  const [exercises, streak] = await Promise.all([
    progressRepository.exerciseOptions(),
    progressRepository.streak(),
  ]);
  return { exercises, streak };
}
export async function exerciseHistoryLoader({ params, request }: LoaderFunctionArgs) {
  if (!params.exerciseId) throw new Error('Exercise ID is required.');
  const [workouts, exercises, streak] = await Promise.all([
    progressRepository.exerciseHistory(params.exerciseId),
    progressRepository.exerciseOptions(),
    progressRepository.streak(),
  ]);
  return {
    workouts,
    exercises,
    streak,
    exerciseId: params.exerciseId,
    range: selectedRange(request.url),
    now: new Date().toISOString(),
  };
}
