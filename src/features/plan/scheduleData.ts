import { trainingCalendar } from '../../domain/trainingCalendar';
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
  rest: 'Rest day',
  missed: 'Missed workout',
  empty: 'No exercises yet',
  unscheduled: 'Program ready',
  'no-program': 'No program yet',
};
