import type { WorkoutSession } from './entities';
import { isLocalDateKey, localDateKey } from './localCalendar';

type CompletedSessionDateInput = Pick<
  WorkoutSession,
  'status' | 'startedAt' | 'endedAt' | 'scheduledDate'
>;

/** The assigned local date for a completed workout; legacy records use completion time. */
export function completedSessionDate(
  session: CompletedSessionDateInput,
  now = new Date(),
): string | null {
  if (session.status !== 'completed') return null;
  const started = Date.parse(session.startedAt);
  const finished = Date.parse(session.endedAt ?? session.startedAt);
  if (
    !Number.isFinite(started) ||
    !Number.isFinite(finished) ||
    finished < started ||
    finished > now.getTime()
  )
    return null;
  if (session.scheduledDate && isLocalDateKey(session.scheduledDate)) {
    return session.scheduledDate <= localDateKey(now) ? session.scheduledDate : null;
  }
  return localDateKey(new Date(finished));
}
