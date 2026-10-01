import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';

import { LiftwiseDatabase } from '../src/lib/storage/database';
import { AppSettingsRepository } from '../src/lib/storage/repositories/appSettingsRepository';
import { VERSION_1_STORES } from '../src/lib/storage/schema';
import { cleanupTestDatabases, trackDatabaseName } from './helpers/database';

afterEach(cleanupTestDatabases);

async function createLegacySetting(name: string, updatedAt: string): Promise<void> {
  trackDatabaseName(name);
  const legacyDatabase = new Dexie(name);
  legacyDatabase.version(1).stores(VERSION_1_STORES);
  await legacyDatabase.table('appSettings').put({ key: 'units', value: 'metric', updatedAt });
  legacyDatabase.close();
}

describe('LiftwiseDatabase migrations', () => {
  it('upgrades v1 settings without losing their data', async () => {
    const name = `liftwise-migration-${crypto.randomUUID()}`;
    await createLegacySetting(name, '2026-09-30T12:00:00.000Z');
    const migratedDatabase = new LiftwiseDatabase(name);
    await migratedDatabase.open();

    const setting = await new AppSettingsRepository(migratedDatabase).get('units');
    expect(migratedDatabase.verno).toBe(2);
    expect(setting).toEqual({
      key: 'units',
      value: 'metric',
      createdAt: '2026-09-30T12:00:00.000Z',
      updatedAt: '2026-09-30T12:00:00.000Z',
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
