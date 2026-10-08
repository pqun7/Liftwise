import type { WorkoutSession } from './entities';
import type { ProgramGraph } from '../lib/storage/repositories/programRepository';
import { addLocalCalendarDays, dateFromKey, localDateKey, weekdayOf } from './localCalendar';

export type CalendarDate = string;
export type TrainingDayStatus =
  'active' | 'completed' | 'no-program' | 'unscheduled' | 'empty' | 'missed' | 'scheduled' | 'rest';
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
      ? graph.days.filter(({ day, exercises }) => day.kind !== 'recovery' && exercises.length > 0)
      : [];
  const dated =
    !!graph &&
    !graph.program.draft &&
    !graph.program.archived &&
    (graph.program.scheduleType === 'cycle'
      ? !!graph.program.cycleStartDate && graph.days.length > 0
      : graph.days.some(({ day }) => day.weekday != null));
  const cycleDays = [...(graph?.days ?? [])].sort((a, b) => a.day.order - b.day.order);
  const getScheduledEntry = (date: CalendarDate) => {
    if (!dated || !graph) return null;
    if (graph.program.scheduleType !== 'cycle')
      return graph.days.find(({ day }) => day.weekday === weekdayOf(dateFromKey(date))) ?? null;
    const anchor = graph.program.cycleStartDate!;
    if (date < anchor) return null;
    // UTC midnight here measures calendar dates, independent of local DST durations.
    const distance = Math.round(
      (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${anchor}T00:00:00Z`)) / 86400000,
    );
    return cycleDays[distance % cycleDays.length] ?? null;
  };
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
  const getScheduledWorkout = (date: CalendarDate) => {
    const entry = getScheduledEntry(date);
    return entry && entry.day.kind !== 'recovery' && entry.exercises.length ? entry : null;
  };
  const scheduledToday = getScheduledWorkout(today);
  const upcoming: ScheduledWorkout[] = dated
    ? Array.from(
        { length: graph?.program.scheduleType === 'cycle' ? Math.max(7, cycleDays.length) : 7 },
        (_, index) => {
          const date = addLocalCalendarDays(
            graph?.program.scheduleType === 'cycle' && today < (graph.program.cycleStartDate ?? '')
              ? addLocalCalendarDays(graph.program.cycleStartDate!, -1)
              : today,
            index + 1,
          );
          const entry = getScheduledWorkout(date);
          return entry ? [{ entry, date }] : [];
        },
      ).flat()
    : rotation.map((entry) => ({ entry, date: null }));
  const getCompletedSession = (date: CalendarDate) => {
    const entry = getScheduledEntry(date);
    return (
      sessions.find(
        (item) =>
          item.status === 'completed' &&
          sessionCalendarDate(item) === date &&
          (!graph || item.programId === graph.program.id) &&
          (date !== today || !entry || item.programDayId === entry.day.id) &&
          Date.parse(item.endedAt ?? item.startedAt) <= now.getTime(),
      ) ?? null
    );
  };
  const completedToday = !!getCompletedSession(today);
  const activeSession =
    sessions.find(({ status }) => status === 'active' || status === 'paused') ?? null;
  // Read-only projections: no persisted copy of today's status or calendar entries.
  const getDayState = (date: CalendarDate) => {
    const entry = getScheduledEntry(date);
    const session = getCompletedSession(date);
    const status: TrainingDayStatus =
      activeSession && (date === today || sessionCalendarDate(activeSession) === date)
        ? 'active'
        : session
          ? 'completed'
          : !graph || graph.program.draft || graph.program.archived
            ? 'no-program'
            : !dated
              ? 'unscheduled'
              : entry && entry.day.kind !== 'recovery'
                ? !entry.exercises.length
                  ? 'empty'
                  : date < today
                    ? 'missed'
                    : 'scheduled'
                : 'rest';
    return { status, entry, session: status === 'active' ? activeSession : session };
  };
  return {
    today,
    dated,
    scheduledToday,
    upcoming,
    next: upcoming[0] ?? null,
    startableToday: dated ? (completedToday ? null : scheduledToday) : (rotation[0] ?? null),
    getScheduledWorkout,
    getScheduledEntry,
    getCompletedSession,
    getDayState,
    isRestDay: (date: CalendarDate) =>
      dated && (!getScheduledEntry(date) || getScheduledEntry(date)?.day.kind === 'recovery'),
    activeSession,
  };
}

/** Legacy records have only a timestamp. Never rewrite them using the reopening date. */
export function sessionCalendarDate(
  session: Pick<WorkoutSession, 'startedAt' | 'scheduledDate'>,
): CalendarDate {
  return session.scheduledDate ?? localDateKey(new Date(session.startedAt));
}
