import { effectiveProgramStartDate, trainingCalendar } from '../../domain/trainingCalendar';
import { addLocalCalendarDays, isLocalDateKey } from '../../domain/localCalendar';
import type { ProgramListData } from './programService';

export function planCalendar(data: ProgramListData) {
  const graph = data.graphs.find(
    ({ program }) => program.id === data.activeProgramId && !program.draft && !program.archived,
  );
  return {
    graph,
    calendar: trainingCalendar(
      graph,
      [...data.completed, ...(data.unfinished ? [data.unfinished] : [])],
      new Date(data.now),
    ),
  };
}

export const scheduleLabels: Record<string, string> = {
  active: 'Workout in progress',
  completed: 'Completed',
  scheduled: 'Workout day',
  future: 'Future workout',
  rest: 'Rest day',
  missed: 'Missed workout',
  empty: 'No exercises yet',
  unscheduled: 'Untracked or unscheduled',
  'no-program': 'No program yet',
  untracked: 'Outside schedule tracking',
};

export function monthlyCompletion(
  month: string,
  calendar: ReturnType<typeof trainingCalendar>,
  graph: ProgramListData['graphs'][number] | undefined,
) {
  if (!graph || !/^\d{4}-\d{2}$/.test(month)) return { percentage: 0, completed: 0, eligible: 0 };
  const trackingStart = effectiveProgramStartDate(graph) ?? calendar.today;
  const first = `${month}-01`;
  if (!isLocalDateKey(first)) return { percentage: 0, completed: 0, eligible: 0 };
  const monthEnd = addLocalCalendarDays(
    `${month}-${String(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()).padStart(2, '0')}`,
    0,
  );
  let eligible = 0;
  let completed = 0;
  for (let date = first; date <= monthEnd && date <= calendar.today; date = addLocalCalendarDays(date, 1)) {
    if (date < trackingStart) continue;
    const status = calendar.getDayState(date).status;
    const entry = calendar.getScheduledEntry(date);
    const eligibleTraining =
      !!entry && entry.day.kind !== 'recovery' && entry.exercises.length > 0;
    if (eligibleTraining && status === 'completed') {
      eligible++;
      completed++;
    } else if (
      eligibleTraining &&
      date < calendar.today &&
      (status === 'scheduled' || status === 'missed')
    ) {
      eligible++;
    }
  }
  return {
    percentage: eligible ? Math.round(Math.min(100, (completed / eligible) * 100)) : 0,
    completed,
    eligible,
  };
}
