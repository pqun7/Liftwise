import type { Transaction } from 'dexie';

import { isoTimestampSchema } from '../../domain/validation';

interface LegacyAppSetting {
  key: string;
  value: unknown;
  createdAt?: string;
  updatedAt: string;
}

interface Version2Exercise {
  id: string;
  name: string;
  notes: string | null;
  createdAt: string;
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

export async function migrateVersion2ToVersion3(transaction: Transaction): Promise<void> {
  await transaction
    .table<Version2Exercise, string>('exercises')
    .toCollection()
    .modify((exercise) => {
      Object.assign(exercise, {
        sourceProvider: 'custom',
        sourceId: exercise.id,
        description: null,
        instructions: [],
        tips: [],
        category: null,
        forceType: null,
        mechanic: null,
        difficulty: null,
        equipment: null,
        bodyPart: null,
        primaryMuscles: ['unspecified'],
        secondaryMuscles: [],
        goals: [],
        tags: [],
        met: null,
        isUnilateral: false,
        isBodyweight: false,
        images: { start: null, peak: null, main: null },
        localizations: {
          en: {
            name: exercise.name,
            description: null,
            instructions: [],
            tips: [],
          },
        },
        importedAt: null,
        isActive: true,
        searchText: exercise.name.toLocaleLowerCase('en'),
      });
    });
}
