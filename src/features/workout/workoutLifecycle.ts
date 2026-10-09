import { liveQuery } from 'dexie';
import { database, type LiftwiseDatabase } from '../../lib/storage/database';
import { WorkoutRepository } from '../../lib/storage/repositories/workoutRepository';
import { WORKOUT_HEARTBEAT_MS } from '../../domain/workoutLifecycle';

/** One coordinator for all routes. Each window has a separate, transactional lease. */
export function watchWorkoutLifecycle(
  changed: () => void,
  failed: (message: string | null) => void,
  db: LiftwiseDatabase = database,
  visibility: Pick<
    Document,
    'visibilityState' | 'addEventListener' | 'removeEventListener'
  > = document,
) {
  const repository = new WorkoutRepository(db);
  const clientId = crypto.randomUUID();
  let stopped = false;
  let tail = Promise.resolve();
  let signature: string | undefined;
  let structure: string | undefined;
  let refreshTimer: number | undefined;
  let heartbeat: number | undefined;
  const saveCheckpoint = (visible: boolean) => {
    const now = new Date();
    tail = tail
      .then(async () => {
        if (stopped) return;
        if (visible) await repository.recoverInterrupted(now);
        await repository.checkpointPresence(clientId, visible, now);
        if (!stopped) failed(null);
      })
      .catch(() => {
        if (!stopped) failed('Workout timing could not be saved. Keep this window open and retry.');
      });
  };
  const checkpoint = () => saveCheckpoint(visibility.visibilityState === 'visible');
  const hide = () => saveCheckpoint(false);
  const subscription = liveQuery(async () => {
    const sessions = await db.workoutSessions.where('status').anyOf(['active', 'paused']).toArray();
    return {
      active: sessions.some((session) => session.status === 'active'),
      signature: sessions
        .map((session) => `${session.id}:${session.status}:${session.updatedAt}`)
        .sort()
        .join('|'),
      structure: sessions
        .map((session) => `${session.id}:${session.status}`)
        .sort()
        .join('|'),
    };
  }).subscribe({
    next: (next) => {
      if (stopped) return;
      if (next.active && heartbeat === undefined)
        heartbeat = window.setInterval(() => {
          if (visibility.visibilityState === 'visible') checkpoint();
        }, WORKOUT_HEARTBEAT_MS);
      else if (!next.active) {
        window.clearInterval(heartbeat);
        heartbeat = undefined;
      }
      if (
        signature !== undefined &&
        signature !== next.signature &&
        visibility.visibilityState === 'visible'
      ) {
        window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(changed, 300);
      }
      if (structure !== next.structure) checkpoint();
      signature = next.signature;
      structure = next.structure;
    },
    error: () =>
      failed('Workout changes could not be synchronized. Reload after saving your changes.'),
  });
  visibility.addEventListener('visibilitychange', checkpoint);
  window.addEventListener('pagehide', hide);
  window.addEventListener('pageshow', checkpoint);
  checkpoint();
  return () => {
    stopped = true;
    subscription.unsubscribe();
    window.clearInterval(heartbeat);
    window.clearTimeout(refreshTimer);
    visibility.removeEventListener('visibilitychange', checkpoint);
    window.removeEventListener('pagehide', hide);
    window.removeEventListener('pageshow', checkpoint);
  };
}
