import { ProgramRepository } from '../../lib/storage/repositories/programRepository';
import { calculateStreakStats, scheduledTrainingWeekdays } from '../../domain/streak';
import { localDateKey } from '../../domain/localCalendar';
import { database, type LiftwiseDatabase } from '../../lib/storage/database';
import { WorkoutRepository } from '../../lib/storage/repositories/workoutRepository';
import {
  workoutSessionSchema,
  workoutExerciseSchema,
  workoutSetSchema,
} from '../../domain/validation';
import type { AnalyticsWorkout } from '../../domain/analytics';

export class ProgressRepository {
  constructor(private readonly db: LiftwiseDatabase = database) {}
  async trainingWeekdays(): Promise<number[] | null> {
    const programs = new ProgramRepository(this.db);
    const activeId = await programs.getActiveId();
    return scheduledTrainingWeekdays(activeId ? await programs.get(activeId) : undefined);
  }
  async streak(now = new Date(), trainingWeekdays?: readonly number[] | null) {
    return this.db.transaction(
      'r',
      [
        this.db.workoutSessions,
        this.db.programs,
        this.db.programDays,
        this.db.programExercises,
        this.db.appSettings,
      ],
      async () => {
        const [rawSessions, weekdays] = await Promise.all([
          this.db.workoutSessions.where('status').equals('completed').toArray(),
          trainingWeekdays === undefined ? this.trainingWeekdays() : trainingWeekdays,
        ]);
        const sessions = rawSessions.map((session) => workoutSessionSchema.parse(session));
        return calculateStreakStats(sessions, localDateKey(now), now, weekdays);
      },
    );
  }
  async exerciseOptions() {
    const sessions = await this.db.workoutSessions
      .where('status')
      .equals('completed')
      .primaryKeys();
    const entries = sessions.length
      ? await this.db.workoutExercises.where('workoutSessionId').anyOf(sessions).toArray()
      : [];
    return [
      ...new Map(
        entries.map((entry) => [
          entry.exerciseId,
          { id: entry.exerciseId, name: entry.exerciseName },
        ]),
      ).values(),
    ].sort((a, b) => a.name.localeCompare(b.name));
  }
  async history(from: string, until = new Date().toISOString()): Promise<AnalyticsWorkout[]> {
    return this.db.transaction(
      'r',
      [this.db.workoutSessions, this.db.workoutExercises, this.db.workoutSets],
      async () => {
        const sessions = await this.db.workoutSessions
          .where('[status+startedAt]')
          .between(['completed', from], ['completed', until], true, true)
          .reverse()
          .toArray();
        const repo = new WorkoutRepository(this.db);
        const graphs = await Promise.all(sessions.map((session) => repo.get(session.id)));
        return graphs.filter((graph): graph is AnalyticsWorkout => graph !== undefined);
      },
    );
  }
  async exerciseHistory(exerciseId: string): Promise<AnalyticsWorkout[]> {
    return this.db.transaction(
      'r',
      [this.db.workoutSessions, this.db.workoutExercises, this.db.workoutSets],
      async () => {
        const entries = (
          await this.db.workoutExercises.where('exerciseId').equals(exerciseId).toArray()
        ).map((entry) => workoutExerciseSchema.parse(entry));
        const sessions = (
          await this.db.workoutSessions.bulkGet([
            ...new Set(entries.map((entry) => entry.workoutSessionId)),
          ])
        )
          .filter((session) => session?.status === 'completed')
          .map((session) => workoutSessionSchema.parse(session));
        const ids = new Set(sessions.map((session) => session.id));
        const eligible = entries.filter((entry) => ids.has(entry.workoutSessionId));
        const sets = eligible.length
          ? (
              await this.db.workoutSets
                .where('workoutExerciseId')
                .anyOf(eligible.map((entry) => entry.id))
                .toArray()
            ).map((set) => workoutSetSchema.parse(set))
          : [];
        const byExercise = new Map<string, typeof sets>();
        for (const set of sets) {
          const group = byExercise.get(set.workoutExerciseId) ?? [];
          group.push(set);
          byExercise.set(set.workoutExerciseId, group);
        }
        return sessions.map((session) => ({
          session,
          exercises: eligible
            .filter((entry) => entry.workoutSessionId === session.id)
            .map((exercise) => ({
              exercise,
              sets: [...(byExercise.get(exercise.id) ?? [])].sort(
                (a, b) => a.setNumber - b.setNumber,
              ),
            })),
        }));
      },
    );
  }
}
export const progressRepository = new ProgressRepository();
