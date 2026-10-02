import type { HomeData } from '../home/homeData';
import { localDateKey } from '../home/homeData';

export type WorkoutLandingState =
  | 'scheduled'
  | 'in-progress'
  | 'rest-day'
  | 'no-program'
  | 'completed-today';

/** Weekdays are local (Sunday = 0). Legacy undated plans use Home's next-in-plan rotation. */
export function deriveWorkoutLanding(home: HomeData, now: Date) {
  const completedToday = home.weekHistory.find(
    ({ session }) => localDateKey(new Date(session.startedAt)) === localDateKey(now),
  );
  const program = home.programs.find(({ program }) => program.id === home.activeProgramId);
  const days = home.nextDays;
  const dated = days.some(({ day }) => day.weekday != null);
  const today = dated ? days.find(({ day }) => day.weekday === now.getDay()) : days[0];
  const next = dated
    ? [...days].sort((a, b) => {
        const distance = (weekday: number | null | undefined) =>
          weekday == null ? 8 : ((weekday - now.getDay() + 6) % 7) + 1;
        return distance(a.day.weekday) - distance(b.day.weekday);
      })[0]
    : days[0];
  const state: WorkoutLandingState = home.active
    ? 'in-progress'
    : completedToday
      ? 'completed-today'
      : !program || !days.length
        ? 'no-program'
        : today
          ? 'scheduled'
          : 'rest-day';
  return { state, todayDayId: today?.day.id ?? null, nextDayId: next?.day.id ?? null, completedToday };
}
