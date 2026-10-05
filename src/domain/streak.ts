import type { Program, ProgramDay, WorkoutSession } from './entities';
import {
  addLocalCalendarDays,
  dateFromKey,
  localDateKey,
  weekStart,
  weekdayOf,
} from './localCalendar';

type Completion = Pick<WorkoutSession, 'status' | 'startedAt' | 'endedAt'>;
export type StreakDayStatus = 'completed' | 'missed' | 'rest' | 'today' | 'future' | 'not-tracked';

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
}
export interface StreakStats {
  currentStreak: number;
  bestStreak: number;
  missedDays: number;
  hasEverTrained: boolean;
  trackingStartDate: string | null;
  week: StreakDay[];
}

// Legacy completed records may lack endedAt; use the same fallback as Home.
// A present but invalid endedAt is never silently replaced with startedAt.
export function completionDate(session: Completion, now: Date): string | null {
  if (session.status !== 'completed') return null;
  const stamp = new Date(session.endedAt ?? session.startedAt);
  const started = Date.parse(session.startedAt);
  if (
    !Number.isFinite(stamp.getTime()) ||
    !Number.isFinite(started) ||
    stamp.getTime() < started ||
    stamp.getTime() > now.getTime()
  )
    return null;
  return localDateKey(stamp);
}

export function calculateStreakStats(
  sessions: readonly Completion[],
  periodStart: string,
  now = new Date(),
  trainingWeekdays: readonly number[] | null = null,
): StreakStats {
  const scheduled = new Set(
    trainingWeekdays?.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
  );
  const isRest = (date: string) =>
    scheduled.size > 0 && !scheduled.has(weekdayOf(dateFromKey(date)));
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
    else if (!isRest(date)) break;
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
        if (!isRest(gap)) {
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
      if (!completed.has(date) && !isRest(date)) missedDays++;
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
        : isRest(date)
          ? 'rest'
          : date > today
            ? 'future'
            : isToday
              ? 'today'
              : 'missed';
    return { date, status, isToday };
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
