import type { Transaction } from 'dexie';

import { isoTimestampSchema } from '../../domain/validation';

interface LegacyAppSetting {
  key: string;
  value: unknown;
  createdAt?: string;
  updatedAt: string;
}

export async function migrateVersion1ToVersion2(transaction: Transaction): Promise<void> {
  const migrationTimestamp = new Date().toISOString();

  await transaction
    .table<LegacyAppSetting, string>('appSettings')
    .toCollection()
    .modify((setting) => {
      const validUpdatedAt = isoTimestampSchema.safeParse(setting.updatedAt);
      const updatedAt = validUpdatedAt.success ? validUpdatedAt.data : migrationTimestamp;
      const validCreatedAt = isoTimestampSchema.safeParse(setting.createdAt);

      setting.updatedAt = updatedAt;
      setting.createdAt = validCreatedAt.success ? validCreatedAt.data : updatedAt;
    });
}
