import type { Program, ProgramDay, WorkoutSession } from './entities';
import { completedSessionDate } from './completedSessionDate';
import {
  addLocalCalendarDays,
  dateFromKey,
  localDateKey,
  weekStart,
  weekdayOf,
} from './localCalendar';

type Completion = Pick<WorkoutSession, 'status' | 'startedAt' | 'endedAt' | 'scheduledDate'>;
export type StreakDayStatus =
  | 'completed'
  | 'missed'
  | 'rest'
  | 'today'
  | 'future'
  | 'not-tracked'
  | 'unscheduled';
export type ScheduleDayStatus = 'training' | 'rest' | 'unscheduled';

// Match Home's dated-program convention. Undated/empty programs cannot establish
// rest dates; do not infer rest merely from an absence of completed workouts.
export function scheduledTrainingWeekdays(
  graph:
    | {
        program: Pick<Program, 'archived' | 'draft'>;
        days: { day: Pick<ProgramDay, 'weekday'>; exercises: readonly unknown[] }[];
      }
    | undefined,
): number[] | null {
  if (!graph || graph.program.archived || graph.program.draft) return null;
  const weekdays = [
    ...new Set(
      graph.days.flatMap(({ day, exercises }) =>
        exercises.length &&
        day.weekday != null &&
        Number.isInteger(day.weekday) &&
        day.weekday >= 0 &&
        day.weekday <= 6
          ? [day.weekday]
          : [],
      ),
    ),
  ];
  return weekdays.length ? weekdays : null;
}
export interface StreakDay {
  date: string;
  status: StreakDayStatus;
  isToday: boolean;
  connectedForward: number;
}
export interface StreakStats {
  currentStreak: number;
  bestStreak: number;
  missedDays: number;
  hasEverTrained: boolean;
  trackingStartDate: string | null;
  week: StreakDay[];
}

export function completionDate(session: Completion, now: Date): string | null {
  return completedSessionDate(session, now);
}

export function calculateStreakStats(
  sessions: readonly Completion[],
  periodStart: string,
  now = new Date(),
  trainingWeekdays: readonly number[] | null = null,
  resolveScheduleDay?: (date: string) => ScheduleDayStatus,
): StreakStats {
  const scheduled = new Set(
    trainingWeekdays?.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
  );
  const scheduleDay = (date: string): ScheduleDayStatus =>
    resolveScheduleDay
      ? resolveScheduleDay(date)
      : scheduled.size > 0
        ? scheduled.has(weekdayOf(dateFromKey(date)))
          ? 'training'
          : 'rest'
        : 'unscheduled';
  const dates = [
    ...new Set(
      sessions.flatMap((session) => {
        const date = completionDate(session, now);
        return date ? [date] : [];
      }),
    ),
  ].sort();
  const completed = new Set(dates);
  const today = localDateKey(now);
  const trackingStartDate = dates[0] ?? null;
  let currentStreak = 0;
  for (
    let date = completed.has(today) ? today : addLocalCalendarDays(today, -1);
    trackingStartDate !== null && date >= trackingStartDate;
    date = addLocalCalendarDays(date, -1)
  ) {
    if (completed.has(date)) currentStreak++;
    else if (scheduleDay(date) !== 'rest') break;
  }
  let bestStreak = 0,
    run = 0,
    previous: string | null = null;
  for (const date of dates) {
    let connected = previous !== null;
    if (previous) {
      for (
        let gap = addLocalCalendarDays(previous, 1);
        gap < date;
        gap = addLocalCalendarDays(gap, 1)
      ) {
        if (scheduleDay(gap) !== 'rest') {
          connected = false;
          break;
        }
      }
    }
    run = connected ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    previous = date;
  }
  let missedDays = 0;
  if (trackingStartDate) {
    for (
      let date = periodStart > trackingStartDate ? periodStart : trackingStartDate;
      date < today;
      date = addLocalCalendarDays(date, 1)
    ) {
      if (!completed.has(date) && date < today && scheduleDay(date) === 'training') missedDays++;
    }
  }
  const monday = localDateKey(weekStart(now));
  const week = Array.from({ length: 7 }, (_, index): StreakDay => {
    const date = addLocalCalendarDays(monday, index);
    const isToday = date === today;
    const status: StreakDayStatus = completed.has(date)
      ? 'completed'
      : date < today && (!trackingStartDate || date < trackingStartDate)
        ? 'not-tracked'
        : scheduleDay(date) === 'rest'
          ? 'rest'
          : date > today
            ? 'future'
            : isToday
              ? 'today'
              : scheduleDay(date) === 'unscheduled'
                ? 'unscheduled'
                : 'missed';
    let connectedForward = 0;
    if (status === 'completed') {
      for (let next = index + 1; next < 7; next++) {
        const nextDate = addLocalCalendarDays(monday, next);
        if (completed.has(nextDate)) {
          connectedForward = next - index;
          break;
        }
        if (scheduleDay(nextDate) !== 'rest') break;
      }
    }
    return { date, status, isToday, connectedForward };
  });
  return {
    currentStreak,
    bestStreak,
    missedDays,
    hasEverTrained: !!trackingStartDate,
    trackingStartDate,
    week,
  };
}
