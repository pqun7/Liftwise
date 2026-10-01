import type { WorkoutSession } from './entities';

export function workoutElapsedSeconds(session: WorkoutSession, now = Date.now()): number {
  const effectiveEnd = session.endedAt
    ? new Date(session.endedAt).getTime()
    : session.status === 'paused' && session.pausedAt
      ? new Date(session.pausedAt).getTime()
      : now;
  return Math.max(
    0,
    Math.floor((effectiveEnd - new Date(session.startedAt).getTime()) / 1_000) -
      session.pausedDurationSeconds,
  );
}

export function restRemainingSeconds(session: WorkoutSession, now = Date.now()): number {
  if (session.restEndsAt === null) return 0;
  return Math.max(0, Math.ceil((new Date(session.restEndsAt).getTime() - now) / 1_000));
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
