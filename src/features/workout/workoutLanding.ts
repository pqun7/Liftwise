import type { HomeData } from '../home/homeData';
import { localDateKey, homeState } from '../home/homeData';

export type WorkoutLandingState =
  'scheduled' | 'in-progress' | 'rest-day' | 'no-program' | 'completed-today' | 'empty-workout';

/** Weekdays are Monday-first (Monday = 0). Legacy undated plans use Home's next-in-plan rotation. */
export function deriveWorkoutLanding(home: HomeData, now: Date) {
  const today = home.calendar.dated ? home.calendar.scheduledToday : home.calendar.startableToday;
  const completion = home.calendar.getCompletedSession(localDateKey(now));
  const completedToday = [...home.recent, ...home.weekHistory].find(
    ({ session }) => session.id === completion?.id,
  );
  const program = home.programs.find(
    ({ program }) => program.id === home.activeProgramId && !program.draft && !program.archived,
  );
  const next = home.calendar.next?.entry;
  const scheduledEntry = home.calendar.getScheduledEntry(localDateKey(now));
  const emptyToday =
    scheduledEntry?.day.kind !== 'recovery' && scheduledEntry?.exercises.length === 0
      ? scheduledEntry
      : null;
  const state: WorkoutLandingState = home.active
    ? 'in-progress'
    : completedToday && !home.suggestion
      ? 'completed-today'
      : !program
        ? 'no-program'
        : emptyToday
          ? 'empty-workout'
          : homeState(home, home.today);
  return {
    state,
    todayDayId: emptyToday?.day.id ?? today?.day.id ?? null,
    nextDayId: next?.day.id ?? null,
    nextDate: home.calendar.next?.date ?? null,
    completedToday,
  };
}
