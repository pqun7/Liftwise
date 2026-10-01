import Dexie, { type EntityTable } from 'dexie';

import type {
  AppSetting,
  BodyMetric,
  CatalogMetadata,
  Exercise,
  Program,
  ProgramDay,
  ProgramExercise,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
} from '../../domain/entities';
import {
  migrateVersion1ToVersion2,
  migrateVersion2ToVersion3,
  migrateVersion3ToVersion4,
} from './migrations';
import {
  DATABASE_NAME,
  VERSION_1_STORES,
  VERSION_2_STORES,
  VERSION_3_STORES,
  VERSION_4_STORES,
} from './schema';

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
  catalogMetadata!: EntityTable<CatalogMetadata, 'provider'>;

  constructor(name = DATABASE_NAME) {
    super(name);

    this.version(1).stores(VERSION_1_STORES);
    this.version(2).stores(VERSION_2_STORES).upgrade(migrateVersion1ToVersion2);
    this.version(3).stores(VERSION_3_STORES).upgrade(migrateVersion2ToVersion3);
    this.version(4).stores(VERSION_4_STORES).upgrade(migrateVersion3ToVersion4);
  }
}

export const database = new LiftwiseDatabase();
