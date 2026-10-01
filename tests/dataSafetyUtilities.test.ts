import { describe, expect, it, vi } from 'vitest';

import { createCsv } from '../src/features/dataSafety/csv';
import {
  getStorageStatus,
  requestStoragePersistence,
} from '../src/features/dataSafety/storageStatus';

describe('data safety utilities', () => {
  it('reports unsupported storage APIs honestly', async () => {
    await expect(getStorageStatus(undefined)).resolves.toEqual({
      usage: null,
      quota: null,
      persistence: 'unsupported',
    });
    await expect(requestStoragePersistence(undefined)).resolves.toBe('unsupported');
  });

  it('reports estimates and persistence without promising permanence', async () => {
    const storage = {
      estimate: vi.fn(() => Promise.resolve({ usage: 1024, quota: 4096 })),
      persisted: vi.fn(() => Promise.resolve(false)),
      persist: vi.fn(() => Promise.resolve(true)),
    };
    await expect(getStorageStatus(storage)).resolves.toEqual({
      usage: 1024,
      quota: 4096,
      persistence: 'not-granted',
    });
    await expect(requestStoragePersistence(storage)).resolves.toBe('granted');
  });

  it('creates escaped UTF-8 CSV output with reusable columns', () => {
    const csv = createCsv(
      [
        { header: 'Name', value: (record: { name: string; notes: string }) => record.name },
        { header: 'Notes', value: (record: { name: string; notes: string }) => record.notes },
      ],
      [{ name: 'Press, Cable', notes: 'Say "steady"' }],
    );
    expect(csv).toBe('\uFEFFName,Notes\r\n"Press, Cable","Say ""steady"""\r\n');
  });
});
