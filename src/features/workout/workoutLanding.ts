import type { HomeData } from '../home/homeData';
import { localDateKey, homeState } from '../home/homeData';

export type WorkoutLandingState =
  'scheduled' | 'in-progress' | 'rest-day' | 'no-program' | 'completed-today';

/** Weekdays are Monday-first (Monday = 0). Legacy undated plans use Home's next-in-plan rotation. */
export function deriveWorkoutLanding(home: HomeData, now: Date) {
  const completedToday = [...home.recent, ...home.weekHistory].find(
    ({ session }) =>
      session.status === 'completed' &&
      session.endedAt &&
      localDateKey(new Date(session.endedAt)) === localDateKey(now),
  );
  const today = home.calendar.dated ? home.calendar.scheduledToday : home.calendar.startableToday;
  const program = home.programs.find(
    ({ program }) => program.id === home.activeProgramId && !program.draft && !program.archived,
  );
  const next = home.calendar.next?.entry;
  const state: WorkoutLandingState = home.active
    ? 'in-progress'
    : !program
      ? 'no-program'
      : completedToday && !home.suggestion
        ? 'completed-today'
        : homeState(home, home.today);
  return {
    state,
    todayDayId: today?.day.id ?? null,
    nextDayId: next?.day.id ?? null,
    completedToday,
  };
}
