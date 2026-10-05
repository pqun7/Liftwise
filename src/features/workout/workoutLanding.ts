import type { HomeData } from '../home/homeData';
import { localDateKey, homeState } from '../home/homeData';
import { weekdayOf } from '../../domain/localCalendar';
import { sessionCalendarDate } from '../../domain/trainingCalendar';

export type WorkoutLandingState =
  'scheduled' | 'in-progress' | 'rest-day' | 'no-program' | 'completed-today' | 'empty-workout';

/** Weekdays are Monday-first (Monday = 0). Legacy undated plans use Home's next-in-plan rotation. */
export function deriveWorkoutLanding(home: HomeData, now: Date) {
  const today = home.calendar.dated ? home.calendar.scheduledToday : home.calendar.startableToday;
  const completedToday = [...home.recent, ...home.weekHistory].find(
    ({ session }) =>
      session.status === 'completed' &&
      session.endedAt &&
      sessionCalendarDate(session) === localDateKey(now) &&
      Date.parse(session.endedAt) <= now.getTime() &&
      session.programId === home.activeProgramId &&
      (!home.calendar.dated || session.programDayId === today?.day.id),
  );
  const program = home.programs.find(
    ({ program }) => program.id === home.activeProgramId && !program.draft && !program.archived,
  );
  const next = home.calendar.next?.entry;
  const emptyToday = program?.days.find(
    ({ day, exercises }) => day.weekday === weekdayOf(now) && exercises.length === 0,
  );
  const state: WorkoutLandingState = home.active
    ? 'in-progress'
    : !program
      ? 'no-program'
      : emptyToday
        ? 'empty-workout'
        : completedToday && !home.suggestion
          ? 'completed-today'
          : homeState(home, home.today);
  return {
    state,
    todayDayId: emptyToday?.day.id ?? today?.day.id ?? null,
    nextDayId: next?.day.id ?? null,
    nextDate: home.calendar.next?.date ?? null,
    completedToday,
  };
}
