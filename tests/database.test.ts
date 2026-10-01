import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';

import { LiftwiseDatabase } from '../src/lib/storage/database';
import { AppSettingsRepository } from '../src/lib/storage/repositories/appSettingsRepository';
import { VERSION_1_STORES, VERSION_2_STORES, VERSION_3_STORES } from '../src/lib/storage/schema';
import { cleanupTestDatabases, trackDatabaseName } from './helpers/database';

afterEach(cleanupTestDatabases);

async function createLegacySetting(name: string, updatedAt: string): Promise<void> {
  trackDatabaseName(name);
  const legacyDatabase = new Dexie(name);
  legacyDatabase.version(1).stores(VERSION_1_STORES);
  await legacyDatabase.table('appSettings').put({ key: 'units', value: 'metric', updatedAt });
  legacyDatabase.close();
}

async function createVersion2Exercise(name: string): Promise<string> {
  trackDatabaseName(name);
  const id = crypto.randomUUID();
  const timestamp = '2026-09-30T12:00:00.000Z';
  const legacyDatabase = new Dexie(name);
  legacyDatabase.version(2).stores(VERSION_2_STORES);
  await legacyDatabase.table('exercises').put({
    id,
    name: 'Legacy Squat',
    notes: 'Preserve me',
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  legacyDatabase.close();
  return id;
}

async function createVersion3Program(name: string) {
  trackDatabaseName(name);
  const ids = {
    program: crypto.randomUUID(),
    day: crypto.randomUUID(),
    exercise: crypto.randomUUID(),
  };
  const timestamp = '2026-10-01T12:00:00.000Z';
  const legacyDatabase = new Dexie(name);
  legacyDatabase.version(3).stores(VERSION_3_STORES);
  await legacyDatabase.table('programs').put({
    id: ids.program,
    name: 'Legacy PPL',
    description: null,
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  await legacyDatabase.table('programDays').put({
    id: ids.day,
    programId: ids.program,
    name: 'Push',
    dayNumber: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  await legacyDatabase.table('programExercises').put({
    id: ids.exercise,
    programDayId: ids.day,
    exerciseId: 'repdb:barbell-bench-press',
    order: 1,
    targetSets: 3,
    targetRepsMin: 6,
    targetRepsMax: 8,
    notes: 'Pause',
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  legacyDatabase.close();
  return ids;
}

describe('LiftwiseDatabase migrations', () => {
  it('upgrades v1 settings without losing their data', async () => {
    const name = `liftwise-migration-${crypto.randomUUID()}`;
    await createLegacySetting(name, '2026-09-30T12:00:00.000Z');
    const migratedDatabase = new LiftwiseDatabase(name);
    await migratedDatabase.open();

    const setting = await new AppSettingsRepository(migratedDatabase).get('units');
    expect(migratedDatabase.verno).toBe(4);
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
    expect(migratedDatabase.verno).toBe(4);
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

    expect(migratedDatabase.verno).toBe(4);
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
});
