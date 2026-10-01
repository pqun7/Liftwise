import { afterEach, describe, expect, it } from 'vitest';

import { AppSettingsRepository } from '../src/lib/storage/repositories/appSettingsRepository';
import { BodyMetricRepository } from '../src/lib/storage/repositories/bodyMetricRepository';
import { cleanupTestDatabases, createTestDatabase } from './helpers/database';

afterEach(cleanupTestDatabases);

describe('supporting repositories', () => {
  it('creates, updates, lists, and deletes body metrics', async () => {
    const database = createTestDatabase('body-metrics');
    const repository = new BodyMetricRepository(database);
    const metric = await repository.create({ weight: 82.4 });

    const updated = await repository.update(metric.id, { bodyFatPercentage: 17.5 });
    expect(updated).toMatchObject({ weight: 82.4, bodyFatPercentage: 17.5 });
    await expect(repository.list()).resolves.toEqual([updated]);

    await repository.delete(metric.id);
    await expect(repository.list()).resolves.toEqual([]);
  });

  it('rejects empty body metrics', async () => {
    const repository = new BodyMetricRepository(createTestDatabase('invalid-body-metric'));
    await expect(repository.create({})).rejects.toThrow(/requires weight or body-fat/);
  });

  it('upserts JSON-safe app settings with stable creation timestamps', async () => {
    const repository = new AppSettingsRepository(createTestDatabase('settings'));
    const created = await repository.set('units', 'metric');
    const updated = await repository.set('units', { weight: 'kg', distance: 'km' });

    expect(updated.key).toBe('units');
    expect(updated.createdAt).toBe(created.createdAt);
    expect(await repository.get('units')).toEqual(updated);
  });

  it('rejects setting values that IndexedDB cannot safely preserve as JSON', async () => {
    const repository = new AppSettingsRepository(createTestDatabase('invalid-settings'));

    await expect(repository.set('callback', (() => undefined) as never)).rejects.toThrow();
  });
});
