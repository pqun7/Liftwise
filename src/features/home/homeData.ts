import { weeklySummary } from '../../domain/analytics';
import type { WorkoutGraph } from '../../lib/storage/repositories/workoutRepository';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';

export type HomeState = 'scheduled' | 'in-progress' | 'rest-day';

export function countLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function weekStart(now: Date): Date {
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

export interface HomeDay {
  key: string;
  label: string;
  date: number;
  accessibleDate: string;
  isToday: boolean;
  completed: number;
}

export interface HomeData {
  today: string;
  greeting: string;
  week: HomeDay[];
  programs: ProgramGraph[];
  activeProgramId: string | null;
  lastProgramDayId: string | null;
  suggestion: ProgramGraph['days'][number] | null;
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
      session.status === 'completed' && Date.parse(session.startedAt) >= monday.getTime(),
  );
  const activeProgram = records.programs.find(
    ({ program }) => program.id === records.activeProgramId && !program.archived && !program.draft,
  );
  const days = activeProgram?.days.filter(({ exercises }) => exercises.length > 0) ?? [];
  const lastIndex = days.findIndex(({ day }) => day.id === records.lastProgramDayId);
  const nextIndex = days.length ? (lastIndex + 1) % days.length : 0;
  const nextDays = [...days.slice(nextIndex), ...days.slice(0, nextIndex)];
  const trainedToday = weekHistory.some(
    ({ session }) => localDateKey(new Date(session.startedAt)) === today,
  );
  const week = Array.from({ length: 7 }, (_, index): HomeDay => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = localDateKey(date);
    return {
      key,
      label: date.toLocaleDateString('en', { weekday: 'short' }),
      date: date.getDate(),
      accessibleDate: date.toLocaleDateString('en', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
      isToday: key === today,
      completed: weekHistory.filter(
        ({ session }) => localDateKey(new Date(session.startedAt)) === key,
      ).length,
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
    suggestion: !trainedToday ? (nextDays[0] ?? null) : null,
    nextDays,
    summary: weeklySummary(records.history, now),
    previousSummary: weeklySummary(records.history, previousSunday),
  };
}

export function homeState(data: HomeData, selectedDate: string): HomeState {
  if (data.active) return 'in-progress';
  return selectedDate === data.today && data.suggestion ? 'scheduled' : 'rest-day';
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
  return `${countLabel(entry.exercises.length, 'exercise')} · ${sets}${unknown ? '+' : ''} planned ${sets === 1 && !unknown ? 'set' : 'sets'}`;
}

export function trainingTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`;
}
