import { localDateKey, weekStart } from '../../domain/localCalendar';
import { sessionCalendarDate, trainingCalendar } from '../../domain/trainingCalendar';
export { localDateKey, weekStart } from '../../domain/localCalendar';
import { estimatedProgramMinutes } from '../plan/programDisplay';
import { weeklySummary } from '../../domain/analytics';
import type { WorkoutGraph } from '../../lib/storage/repositories/workoutRepository';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';

export type HomeState = 'scheduled' | 'in-progress' | 'rest-day';

export function countLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export interface HomeDay {
  key: string;
  label: string;
  date: number;
  accessibleDate: string;
  isToday: boolean;
  completed: number;
  kind: 'training' | 'rest' | 'future';
  performance: number;
}

export interface HomeData {
  today: string;
  greeting: string;
  week: HomeDay[];
  programs: ProgramGraph[];
  activeProgramId: string | null;
  lastProgramDayId: string | null;
  suggestion: ProgramGraph['days'][number] | null;
  calendar: ReturnType<typeof trainingCalendar>;
  nextDays: ProgramGraph['days'];
  active: WorkoutGraph | null;
  recent: WorkoutGraph[];
  weekHistory: WorkoutGraph[];
  summary: ReturnType<typeof weeklySummary>;
  previousSummary: ReturnType<typeof weeklySummary>;
  catalogCount: number | null;
}

export function deriveHomeData(
  records: Pick<
    HomeData,
    'programs' | 'activeProgramId' | 'lastProgramDayId' | 'active' | 'recent' | 'catalogCount'
  > & {
    history: WorkoutGraph[];
  },
  now: Date,
): HomeData {
  const today = localDateKey(now);
  const monday = weekStart(now);
  const previousSunday = new Date(monday.getTime() - 1);
  const weekHistory = records.history.filter(
    ({ session }) =>
      session.status === 'completed' &&
      Date.parse(session.endedAt ?? session.startedAt) >= monday.getTime() &&
      Date.parse(session.endedAt ?? session.startedAt) <= now.getTime(),
  );
  const activeProgram = records.programs.find(
    ({ program }) => program.id === records.activeProgramId && !program.archived && !program.draft,
  );
  const days = activeProgram?.days.filter(({ exercises }) => exercises.length > 0) ?? [];
  const calendar = trainingCalendar(
    activeProgram,
    [...records.history, ...records.recent, ...(records.active ? [records.active] : [])].map(
      ({ session }) => session,
    ),
    now,
    records.lastProgramDayId,
  );
  const nextDays = calendar.upcoming.map(({ entry }) => entry);
  const trainedToday = weekHistory.some(
    ({ session }) => localDateKey(new Date(session.endedAt ?? session.startedAt)) === today,
  );
  const scheduledWeekdays = new Set(
    days.flatMap(({ day }) => (day.weekday == null ? [] : [day.weekday])),
  );
  const workoutsByDay = new Map<string, WorkoutGraph[]>();
  for (const workout of weekHistory) {
    const key = localDateKey(new Date(workout.session.endedAt ?? workout.session.startedAt));
    workoutsByDay.set(key, [...(workoutsByDay.get(key) ?? []), workout]);
  }
  if (records.active) {
    const key = sessionCalendarDate(records.active.session);
    workoutsByDay.set(key, [...(workoutsByDay.get(key) ?? []), records.active]);
  }
  const dayEffort = (workouts: WorkoutGraph[]) =>
    workouts.reduce((total, workout) => {
      const completion = workoutCompletion(workout);
      return total + completion.completedSets + completion.completedExercises * 0.75;
    }, 0);
  const maxEffort = Math.max(1, ...[...workoutsByDay.values()].map(dayEffort));
  const week = Array.from({ length: 7 }, (_, index): HomeDay => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = localDateKey(date);
    const workouts = workoutsByDay.get(key) ?? [];
    const isToday = key === today;
    const isFuture = key > today;
    const isTrainingDay =
      workouts.length > 0 ||
      scheduledWeekdays.has(index) ||
      (isToday && days.length > 0 && !scheduledWeekdays.size);
    return {
      key,
      label: date.toLocaleDateString('en', { weekday: 'short' }),
      date: date.getDate(),
      accessibleDate: date.toLocaleDateString('en', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
      isToday,
      completed: workouts.filter(({ session }) => session.status === 'completed').length,
      kind: isFuture ? 'future' : isTrainingDay ? 'training' : 'rest',
      performance: workouts.length
        ? Math.max(0.18, Math.min(1, dayEffort(workouts) / maxEffort))
        : 0,
    };
  });
  return {
    ...records,
    today,
    greeting:
      now.getHours() < 12
        ? 'Good morning,'
        : now.getHours() < 18
          ? 'Good afternoon,'
          : 'Good evening,',
    week,
    weekHistory,
    calendar,
    suggestion: calendar.dated || !trainedToday ? calendar.startableToday : null,
    nextDays,
    summary: weeklySummary(records.history, now),
    previousSummary: weeklySummary(records.history, previousSunday),
  };
}

export function homeState(data: HomeData, selectedDate: string): HomeState {
  if (data.active) return 'in-progress';
  return (
    selectedDate === data.today ? data.suggestion : data.calendar.getScheduledWorkout(selectedDate)
  )
    ? 'scheduled'
    : 'rest-day';
}

export function workoutCompletion(workout: WorkoutGraph) {
  const entries =
    workout.session.status === 'completed'
      ? workout.exercises
      : workout.exercises.filter(({ exercise }) => !exercise.skipped);
  const sets = entries.flatMap(({ sets }) => sets);
  const completedSets = sets.filter(({ completed }) => completed).length;
  const completedExercises = entries.filter(
    ({ sets }) => sets.length > 0 && sets.every(({ completed }) => completed),
  ).length;
  return {
    completedExercises,
    exercises: entries.length,
    completedSets,
    totalSets: sets.length,
    remainingSets: sets.length - completedSets,
    percent: sets.length ? Math.round((completedSets / sets.length) * 100) : 0,
  };
}

export function programDayMetadata(entry: ProgramGraph['days'][number]): string {
  const sets = entry.exercises.reduce((sum, exercise) => sum + (exercise.targetSets ?? 0), 0);
  const unknown = entry.exercises.some(({ targetSets }) => targetSets === null);
  const minutes = estimatedProgramMinutes(entry.exercises);
  return `${countLabel(entry.exercises.length, 'exercise')} · ${sets}${unknown ? '+' : ''} planned ${sets === 1 && !unknown ? 'set' : 'sets'}${minutes == null ? '' : ` · ~${minutes} min estimate`}`;
}

export function trainingTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`;
}
