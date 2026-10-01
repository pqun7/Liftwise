import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';

import { LiftwiseDatabase } from '../src/lib/storage/database';
import { AppSettingsRepository } from '../src/lib/storage/repositories/appSettingsRepository';
import { VERSION_1_STORES, VERSION_2_STORES } from '../src/lib/storage/schema';
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

describe('LiftwiseDatabase migrations', () => {
  it('upgrades v1 settings without losing their data', async () => {
    const name = `liftwise-migration-${crypto.randomUUID()}`;
    await createLegacySetting(name, '2026-09-30T12:00:00.000Z');
    const migratedDatabase = new LiftwiseDatabase(name);
    await migratedDatabase.open();

    const setting = await new AppSettingsRepository(migratedDatabase).get('units');
    expect(migratedDatabase.verno).toBe(3);
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
    expect(migratedDatabase.verno).toBe(3);
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
});
