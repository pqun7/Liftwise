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
  const [workouts, bodyMetrics] = await Promise.all([
    progressRepository.history(rangeStart(range, now), now.toISOString()),
    bodyMetricRepository.list(),
  ]);
  return { workouts, bodyMetrics, range, now: now.toISOString() };
}
export async function exerciseHistoryLoader({ params, request }: LoaderFunctionArgs) {
  if (!params.exerciseId) throw new Error('Exercise ID is required.');
  return {
    workouts: await progressRepository.exerciseHistory(params.exerciseId),
    exerciseId: params.exerciseId,
    range: selectedRange(request.url),
    now: new Date().toISOString(),
  };
}
