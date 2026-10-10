import type { WorkoutSession } from './entities';
import { completedSessionDate } from './completedSessionDate';
import type { ProgramGraph } from '../lib/storage/repositories/programRepository';
import {
  addLocalCalendarDays,
  dateFromKey,
  isLocalDateKey,
  localDateKey,
  weekdayOf,
} from './localCalendar';

export type CalendarDate = string;
export type TrainingDayStatus =
  | 'active'
  | 'completed'
  | 'no-program'
  | 'unscheduled'
  | 'empty'
  | 'missed'
  | 'scheduled'
  | 'future'
  | 'rest';
export type ScheduledWorkout = { entry: ProgramGraph['days'][number]; date: CalendarDate | null };

/** The weekly schedule shown by Plan, shared by Home, Calendar, and Streak projections. */
export function resolveWeeklyProgramDay(
  graph: ProgramGraph | undefined,
  weekday: number,
): ProgramGraph['days'][number] | null {
  if (!graph) return null;
  return graph.days.find(({ day }) => day.weekday === weekday) ?? null;
}

export function effectiveProgramStartDate(graph: ProgramGraph | undefined): CalendarDate | null {
  if (!graph || graph.program.archived || graph.program.draft) return null;
  const cycleStart =
    graph.program.scheduleType === 'cycle' &&
    graph.program.cycleStartDate &&
    isLocalDateKey(graph.program.cycleStartDate)
      ? graph.program.cycleStartDate
      : null;
  if (cycleStart) return cycleStart;
  // Use the program's creation date for weekly and legacy dated schedules so
  // the current schedule cannot mark dates before that program existed missed.
  const created = new Date(graph.program.createdAt);
  return Number.isFinite(created.getTime()) ? localDateKey(created) : null;
}

/** Calendar schedule and unfinished sessions are independent. Undated plans rotate by completion. */
export function trainingCalendar(
  graph: ProgramGraph | undefined,
  sessions: readonly WorkoutSession[],
  now: Date,
  lastProgramDayId?: string | null,
) {
  const today = localDateKey(now);
  const programStart = effectiveProgramStartDate(graph);
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
      return resolveWeeklyProgramDay(graph, weekdayOf(dateFromKey(date)));
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
        completedSessionDate(session, now) !== null,
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
    if (programStart && date < programStart) return null;
    const entry = getScheduledEntry(date);
    if (!graph || !dated) {
      return (
        sessions.find(
          (item) =>
            item.status === 'completed' &&
            completedSessionDate(item, now) === date &&
            (!graph || item.programId === graph.program.id),
        ) ?? null
      );
    }
    if (!entry || entry.day.kind === 'recovery' || !entry.exercises.length) return null;
    return (
      sessions.find(
        (item) =>
          item.status === 'completed' &&
          completedSessionDate(item, now) === date &&
          item.programId === graph?.program.id &&
          item.programDayId === entry.day.id,
      ) ?? null
    );
  };
  const completedToday = !!getCompletedSession(today);
  const activeSession =
    sessions.find(
      (session) =>
        (session.status === 'active' || session.status === 'paused') &&
        (!graph || session.programId === graph.program.id),
    ) ?? null;
  // Read-only projections: no persisted copy of today's status or calendar entries.
  const getDayState = (date: CalendarDate) => {
    const entry = getScheduledEntry(date);
    const session = getCompletedSession(date);
    const status: TrainingDayStatus =
      activeSession &&
      (date === today || sessionCalendarDate(activeSession) === date)
        ? 'active'
        : session
          ? 'completed'
          : !graph || graph.program.draft || graph.program.archived
            ? 'no-program'
              : programStart && date < programStart
                ? 'unscheduled'
            : !dated
              ? 'unscheduled'
              : graph?.program.scheduleType === 'cycle' && date < (graph.program.cycleStartDate ?? '')
                ? 'unscheduled'
                : entry && entry.day.kind !== 'recovery'
                ? !entry.exercises.length
                  ? 'empty'
                  : date < today
                    ? 'missed'
                      : date > today
                        ? 'future'
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
      dated &&
      (!programStart || date >= programStart) &&
      (graph?.program.scheduleType === 'cycle'
        ? date >= (graph.program.cycleStartDate ?? '') &&
          getScheduledEntry(date)?.day.kind === 'recovery'
        : !getScheduledEntry(date)),
    activeSession,
  };
}

/** Legacy records have only a timestamp. Never rewrite them using the reopening date. */
export function sessionCalendarDate(
  session: Pick<WorkoutSession, 'startedAt' | 'scheduledDate'>,
): CalendarDate {
  return session.scheduledDate ?? localDateKey(new Date(session.startedAt));
}
