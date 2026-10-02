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
  const start = rangeStart(range, now);
  const previousStart =
    range === 'ALL'
      ? start
      : new Date(Date.parse(start) - (now.getTime() - Date.parse(start))).toISOString();
  const [workouts, previous] = await Promise.all([
    progressRepository.history(start, now.toISOString()),
    range === 'ALL'
      ? Promise.resolve([])
      : progressRepository.history(previousStart, new Date(Date.parse(start) - 1).toISOString()),
  ]);
  return { workouts, previous, range, now: now.toISOString(), start };
}
export async function workoutHistoryLoader() {
  return { workouts: await progressRepository.history(rangeStart('ALL')) };
}
export async function bodyMeasurementsLoader() {
  return { bodyMetrics: await bodyMetricRepository.list() };
}
export async function exercisePickerLoader() {
  return { exercises: await progressRepository.exerciseOptions() };
}
export async function exerciseHistoryLoader({ params, request }: LoaderFunctionArgs) {
  if (!params.exerciseId) throw new Error('Exercise ID is required.');
  const [workouts, exercises] = await Promise.all([
    progressRepository.exerciseHistory(params.exerciseId),
    progressRepository.exerciseOptions(),
  ]);
  return {
    workouts,
    exercises,
    exerciseId: params.exerciseId,
    range: selectedRange(request.url),
    now: new Date().toISOString(),
  };
}
