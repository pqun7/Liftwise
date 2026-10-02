import type { HomeData } from '../home/homeData';
import { localDateKey, homeState } from '../home/homeData';
import { nextProgramWorkout } from '../plan/programDisplay';

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
  const days = home.nextDays;
  const dated = days.some(({ day }) => day.weekday != null);
  const today = dated ? days.find(({ day }) => day.weekday === (now.getDay() + 6) % 7) : days[0];
  const program = home.programs.find(
    ({ program }) => program.id === home.activeProgramId && !program.draft && !program.archived,
  );
  const next =
    dated && program
      ? nextProgramWorkout(
          program,
          [...home.recent, ...home.weekHistory].map(({ session }) => session),
          now,
        )
      : days[0];
  const state: WorkoutLandingState = home.active
    ? 'in-progress'
    : !program
      ? 'no-program'
      : completedToday
        ? 'completed-today'
        : homeState(home, home.today);
  return {
    state,
    todayDayId: today?.day.id ?? null,
    nextDayId: next?.day.id ?? null,
    completedToday,
  };
}
