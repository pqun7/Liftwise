import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';

import { LiftwiseDatabase } from '../src/lib/storage/database';
import { AppSettingsRepository } from '../src/lib/storage/repositories/appSettingsRepository';
import {
  VERSION_1_STORES,
  VERSION_2_STORES,
  VERSION_3_STORES,
  VERSION_4_STORES,
} from '../src/lib/storage/schema';
import {
  version1SettingFixture,
  version2ExerciseFixture,
  version3DayFixture,
  version3ProgramExerciseFixture,
  version3ProgramFixture,
  version4ExerciseFixture,
  version4WorkoutExerciseFixture,
  version4WorkoutSessionFixture,
} from './fixtures/migrations';
import { cleanupTestDatabases, trackDatabaseName } from './helpers/database';

afterEach(cleanupTestDatabases);

async function createLegacySetting(name: string, updatedAt: string): Promise<void> {
  trackDatabaseName(name);
  const legacyDatabase = new Dexie(name);
  legacyDatabase.version(1).stores(VERSION_1_STORES);
  await legacyDatabase.table('appSettings').put({ ...version1SettingFixture, updatedAt });
  legacyDatabase.close();
}

async function createVersion4Workout(name: string) {
  trackDatabaseName(name);
  const legacyDatabase = new Dexie(name);
  legacyDatabase.version(4).stores(VERSION_4_STORES);
  await legacyDatabase.table('exercises').put(version4ExerciseFixture);
  await legacyDatabase.table('workoutSessions').put(version4WorkoutSessionFixture);
  await legacyDatabase.table('workoutExercises').put(version4WorkoutExerciseFixture);
  legacyDatabase.close();
}

async function createVersion2Exercise(name: string): Promise<string> {
  trackDatabaseName(name);
  const legacyDatabase = new Dexie(name);
  legacyDatabase.version(2).stores(VERSION_2_STORES);
  await legacyDatabase.table('exercises').put(version2ExerciseFixture);
  legacyDatabase.close();
  return version2ExerciseFixture.id;
}

async function createVersion3Program(name: string) {
  trackDatabaseName(name);
  const legacyDatabase = new Dexie(name);
  legacyDatabase.version(3).stores(VERSION_3_STORES);
  await legacyDatabase.table('programs').put(version3ProgramFixture);
  await legacyDatabase.table('programDays').put(version3DayFixture);
  await legacyDatabase.table('programExercises').put(version3ProgramExerciseFixture);
  legacyDatabase.close();
  return {
    program: version3ProgramFixture.id,
    day: version3DayFixture.id,
    exercise: version3ProgramExerciseFixture.id,
  };
}

describe('LiftwiseDatabase migrations', () => {
  it('upgrades v1 settings without losing their data', async () => {
    const name = `liftwise-migration-${crypto.randomUUID()}`;
    await createLegacySetting(name, '2026-09-30T12:00:00.000Z');
    const migratedDatabase = new LiftwiseDatabase(name);
    await migratedDatabase.open();

    const setting = await new AppSettingsRepository(migratedDatabase).get('units');
    expect(migratedDatabase.verno).toBe(6);
    expect(setting).toEqual({
      key: 'units',
      value: 'metric',
      createdAt: '2026-09-30T12:00:00.000Z',
      updatedAt: '2026-09-30T12:00:00.000Z',
    });
    migratedDatabase.close();
  });

  it('upgrades v2 exercises into valid custom exercises without changing their IDs', async () => {
    const name = `liftwise-v2-migration-${crypto.randomUUID()}`;
    const id = await createVersion2Exercise(name);
    const migratedDatabase = new LiftwiseDatabase(name);
    await migratedDatabase.open();

    const exercise = await migratedDatabase.exercises.get(id);
    expect(migratedDatabase.verno).toBe(6);
    expect(exercise).toMatchObject({
      id,
      sourceProvider: 'custom',
      sourceId: id,
      name: 'Legacy Squat',
      notes: 'Preserve me',
      primaryMuscles: ['unspecified'],
      isActive: true,
    });
    migratedDatabase.close();
  });

  it('repairs an invalid legacy timestamp during migration', async () => {
    const name = `liftwise-migration-${crypto.randomUUID()}`;
    await createLegacySetting(name, 'invalid');
    const migratedDatabase = new LiftwiseDatabase(name);
    const setting = await new AppSettingsRepository(migratedDatabase).get('units');

    expect(setting?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(setting?.updatedAt).toBe(setting?.createdAt);
    migratedDatabase.close();
  });

  it('upgrades v3 program prescriptions without changing IDs or references', async () => {
    const name = `liftwise-v3-migration-${crypto.randomUUID()}`;
    const ids = await createVersion3Program(name);
    const migratedDatabase = new LiftwiseDatabase(name);
    await migratedDatabase.open();

    expect(migratedDatabase.verno).toBe(6);
    expect(await migratedDatabase.programDays.get(ids.day)).toMatchObject({
      id: ids.day,
      programId: ids.program,
      order: 1,
      notes: null,
    });
    expect(await migratedDatabase.programExercises.get(ids.exercise)).toMatchObject({
      id: ids.exercise,
      programDayId: ids.day,
      exerciseId: 'repdb:barbell-bench-press',
      targetSets: 3,
      minReps: 6,
      maxReps: 8,
      targetRirMin: null,
      targetRirMax: null,
      restSeconds: null,
      notes: 'Pause',
    });
    migratedDatabase.close();
  });

  it('upgrades v4 workout records with recoverable session state and display snapshots', async () => {
    const name = `liftwise-v4-migration-${crypto.randomUUID()}`;
    await createVersion4Workout(name);
    const migratedDatabase = new LiftwiseDatabase(name);
    await migratedDatabase.open();

    expect(migratedDatabase.verno).toBe(6);
    expect(
      await migratedDatabase.workoutSessions.get(version4WorkoutSessionFixture.id),
    ).toMatchObject({
      ...version4WorkoutSessionFixture,
      pausedAt: null,
      pausedDurationSeconds: 0,
      currentExerciseId: null,
      restStartedAt: null,
      restEndsAt: null,
    });
    expect(
      await migratedDatabase.workoutExercises.get(version4WorkoutExerciseFixture.id),
    ).toMatchObject({
      ...version4WorkoutExerciseFixture,
      exerciseName: 'Legacy Row',
      plannedTargetSets: null,
      plannedMinReps: null,
      plannedMaxReps: null,
      plannedRirMin: null,
      plannedRirMax: null,
      plannedRestSeconds: null,
      plannedNotes: null,
    });
    migratedDatabase.close();
  });
});
