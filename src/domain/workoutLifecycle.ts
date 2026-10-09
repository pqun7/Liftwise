import type { WorkoutSession } from './entities';

export const WORKOUT_AWAY_GRACE_MS = 5 * 60_000;
export const WORKOUT_HEARTBEAT_MS = 15_000;
export const WORKOUT_LEASE_MS = 45_000;

/** Never interpret a lack of set edits as inactivity: the user may be lifting. */
export function workoutInterruption(session: WorkoutSession, now: number) {
  if (session.status !== 'active') return null;
  const windows = Object.values(session.presence ?? {});
  if (
    windows.some(
      (entry) =>
        entry.hiddenAt === null &&
        now - Date.parse(entry.seenAt) <= WORKOUT_LEASE_MS &&
        Date.parse(entry.seenAt) <= now + WORKOUT_LEASE_MS,
    )
  )
    return null;
  const anchor = windows.length
    ? Math.max(...windows.map((entry) => Date.parse(entry.hiddenAt ?? entry.seenAt)))
    : Date.parse(session.updatedAt);
  const clockChanged = anchor > now + WORKOUT_LEASE_MS;
  if (!clockChanged && now - anchor < WORKOUT_AWAY_GRACE_MS) return null;
  return {
    pausedAt: new Date(
      Math.max(Date.parse(session.startedAt), Math.min(anchor, now)),
    ).toISOString(),
    reason:
      windows.length && windows.every((entry) => entry.hiddenAt !== null) && !clockChanged
        ? ('away' as const)
        : ('recovery' as const),
  };
}
