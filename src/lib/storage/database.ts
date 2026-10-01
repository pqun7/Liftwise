import Dexie, { type EntityTable } from 'dexie';

import type {
  AppSetting,
  BodyMetric,
  Exercise,
  Program,
  ProgramDay,
  ProgramExercise,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
} from '../../domain/entities';
import { migrateVersion1ToVersion2 } from './migrations';
import { DATABASE_NAME, VERSION_1_STORES, VERSION_2_STORES } from './schema';

export class LiftwiseDatabase extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>;
  programs!: EntityTable<Program, 'id'>;
  programDays!: EntityTable<ProgramDay, 'id'>;
  programExercises!: EntityTable<ProgramExercise, 'id'>;
  workoutSessions!: EntityTable<WorkoutSession, 'id'>;
  workoutExercises!: EntityTable<WorkoutExercise, 'id'>;
  workoutSets!: EntityTable<WorkoutSet, 'id'>;
  bodyMetrics!: EntityTable<BodyMetric, 'id'>;
  appSettings!: EntityTable<AppSetting, 'key'>;

  constructor(name = DATABASE_NAME) {
    super(name);

    this.version(1).stores(VERSION_1_STORES);
    this.version(2).stores(VERSION_2_STORES).upgrade(migrateVersion1ToVersion2);
  }
}

export const database = new LiftwiseDatabase();
