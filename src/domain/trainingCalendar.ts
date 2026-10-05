import type { WorkoutSession } from './entities';
import type { ProgramGraph } from '../lib/storage/repositories/programRepository';
import { addLocalCalendarDays, dateFromKey, localDateKey, weekdayOf } from './localCalendar';

export type CalendarDate = string;
export type ScheduledWorkout = { entry: ProgramGraph['days'][number]; date: CalendarDate | null };

/** Calendar schedule and unfinished sessions are independent. Undated plans rotate by completion. */
export function trainingCalendar(
  graph: ProgramGraph | undefined,
  sessions: readonly WorkoutSession[],
  now: Date,
  lastProgramDayId?: string | null,
) {
  const today = localDateKey(now);
  const days =
    graph && !graph.program.archived && !graph.program.draft
      ? graph.days.filter(({ exercises }) => exercises.length > 0)
      : [];
  const dated = days.some(({ day }) => day.weekday != null);
  const last = sessions
    .filter(
      (session) =>
        session.status === 'completed' &&
        session.programId === graph?.program.id &&
        Date.parse(session.endedAt ?? session.startedAt) <= now.getTime(),
    )
    .sort((a, b) => (b.endedAt ?? b.startedAt).localeCompare(a.endedAt ?? a.startedAt))[0];
  const ordered = [...days].sort((a, b) => a.day.order - b.day.order);
  const index = ordered.findIndex(({ day }) => day.id === (lastProgramDayId ?? last?.programDayId));
  const rotation = [...ordered.slice(index + 1), ...ordered.slice(0, index + 1)];
  const getScheduledWorkout = (date: CalendarDate) =>
    dated ? (days.find(({ day }) => day.weekday === weekdayOf(dateFromKey(date))) ?? null) : null;
  const scheduledToday = getScheduledWorkout(today);
  const upcoming: ScheduledWorkout[] = dated
    ? days
        .flatMap((entry) => {
          if (entry.day.weekday == null) return [];
          const distance = (entry.day.weekday - weekdayOf(now) + 7) % 7 || 7;
          return [{ entry, date: addLocalCalendarDays(today, distance) }];
        })
        .sort((a, b) => a.date.localeCompare(b.date) || a.entry.day.order - b.entry.day.order)
    : rotation.map((entry) => ({ entry, date: null }));
  const completedToday = sessions.some(
    (session) =>
      session.status === 'completed' &&
      session.programDayId === scheduledToday?.day.id &&
      localDateKey(new Date(session.endedAt ?? session.startedAt)) === today &&
      Date.parse(session.endedAt ?? session.startedAt) <= now.getTime(),
  );
  return {
    today,
    dated,
    scheduledToday,
    upcoming,
    next: upcoming[0] ?? null,
    startableToday: dated ? (completedToday ? null : scheduledToday) : (rotation[0] ?? null),
    getScheduledWorkout,
    isRestDay: (date: CalendarDate) => dated && !getScheduledWorkout(date),
    activeSession:
      sessions.find(({ status }) => status === 'active' || status === 'paused') ?? null,
  };
}

/** Legacy records have only a timestamp. Never rewrite them using the reopening date. */
export function sessionCalendarDate(
  session: Pick<WorkoutSession, 'startedAt' | 'scheduledDate'>,
): CalendarDate {
  return session.scheduledDate ?? localDateKey(new Date(session.startedAt));
}
