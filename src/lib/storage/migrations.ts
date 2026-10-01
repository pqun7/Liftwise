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

interface Version3ProgramDay {
  dayNumber?: number;
  order?: number;
  notes?: string | null;
}

interface Version3ProgramExercise {
  targetRepsMin?: number | null;
  targetRepsMax?: number | null;
  minReps?: number | null;
  maxReps?: number | null;
  targetRirMin?: number | null;
  targetRirMax?: number | null;
  restSeconds?: number | null;
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

export async function migrateVersion3ToVersion4(transaction: Transaction): Promise<void> {
  await transaction
    .table<Version3ProgramDay, string>('programDays')
    .toCollection()
    .modify((day) => {
      day.order = day.dayNumber ?? 1;
      day.notes = day.notes ?? null;
      delete day.dayNumber;
    });

  await transaction
    .table<Version3ProgramExercise, string>('programExercises')
    .toCollection()
    .modify((exercise) => {
      exercise.minReps = exercise.targetRepsMin ?? null;
      exercise.maxReps = exercise.targetRepsMax ?? null;
      exercise.targetRirMin = exercise.targetRirMin ?? null;
      exercise.targetRirMax = exercise.targetRirMax ?? null;
      exercise.restSeconds = exercise.restSeconds ?? null;
      delete exercise.targetRepsMin;
      delete exercise.targetRepsMax;
    });
}
