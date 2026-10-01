import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';

import { appSettingSchema, LiftwiseDatabase } from '../src/lib/storage/database';

const databaseNames: string[] = [];

afterEach(async () => {
  await Promise.all(databaseNames.splice(0).map((name) => Dexie.delete(name)));
});

describe('LiftwiseDatabase', () => {
  it('persists validated settings in the versioned database', async () => {
    const name = `liftwise-test-${crypto.randomUUID()}`;
    databaseNames.push(name);
    const database = new LiftwiseDatabase(name);
    const setting = appSettingSchema.parse({
      key: 'example',
      value: true,
      updatedAt: new Date().toISOString(),
    });

    await database.appSettings.put(setting);

    await expect(database.appSettings.get('example')).resolves.toEqual(setting);
    database.close();
  });

  it('rejects invalid timestamps before persistence', () => {
    expect(() =>
      appSettingSchema.parse({ key: 'example', value: true, updatedAt: 'not-a-date' }),
    ).toThrow();
  });
});
