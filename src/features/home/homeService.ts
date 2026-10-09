import { scheduledTrainingWeekdays } from '../../domain/streak';
import { database, type LiftwiseDatabase } from '../../lib/storage/database';
import {
  ProgramRepository,
  type ProgramGraph,
} from '../../lib/storage/repositories/programRepository';
import { WorkoutRepository } from '../../lib/storage/repositories/workoutRepository';
import { ProgressRepository } from '../progress/progressService';
import { deriveHomeData, weekStart } from './homeData';
import { catalogMetadataSchema, workoutSessionSchema } from '../../domain/validation';

export async function getHomeData(db: LiftwiseDatabase = database, now = new Date()) {
  const programs = new ProgramRepository(db);
  const workouts = new WorkoutRepository(db);
  await workouts.recoverInterrupted(now);
  const previousMonday = weekStart(now);
  previousMonday.setDate(previousMonday.getDate() - 7);
  return db.transaction(
    'r',
    [
      db.programs,
      db.programDays,
      db.programExercises,
      db.appSettings,
      db.workoutSessions,
      db.workoutExercises,
      db.workoutSets,
      db.catalogMetadata,
    ],
    async () => {
      const [items, activeProgramId, active, history, completed, catalog] = await Promise.all([
        programs.list(),
        programs.getActiveId(),
        workouts.getUnfinished(),
        new ProgressRepository(db).history(previousMonday.toISOString(), now.toISOString()),
        db.workoutSessions
          .where('[status+startedAt]')
          .between(['completed', ''], ['completed', now.toISOString()], true, true)
          .reverse()
          .toArray(),
        db.catalogMetadata.get('repdb'),
      ]);
      const latest = completed
        .filter((session) => Date.parse(session.endedAt ?? session.startedAt) <= now.getTime())
        .sort((a, b) => (b.endedAt ?? b.startedAt).localeCompare(a.endedAt ?? a.startedAt));
      const lastPlanned = latest.find((session) => session.programId === activeProgramId);
      const [graphs, recent] = await Promise.all([
        Promise.all(items.filter(({ archived }) => !archived).map(({ id }) => programs.get(id))),
        Promise.all(latest.slice(0, 3).map(({ id }) => workouts.get(id))),
      ]);
      const activeGraph = graphs.find((graph) => graph?.program.id === activeProgramId);
      const streak = await new ProgressRepository(db).streak(
        now,
        scheduledTrainingWeekdays(activeGraph),
      );
      return {
        ...deriveHomeData(
          {
            programs: graphs.filter((graph): graph is ProgramGraph => graph !== undefined),
            activeProgramId,
            lastProgramDayId: lastPlanned
              ? workoutSessionSchema.parse(lastPlanned).programDayId
              : null,
            active: active ?? null,
            history,
            recent: recent.filter((graph) => graph !== undefined),
            catalogCount: catalog ? catalogMetadataSchema.parse(catalog).exerciseCount : null,
          },
          now,
        ),
        streak,
      };
    },
  );
}

export const homeLoader = () => getHomeData();
