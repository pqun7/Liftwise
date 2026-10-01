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

interface Version4WorkoutSession {
  pausedAt?: string | null;
  pausedDurationSeconds?: number;
  currentExerciseId?: string | null;
  restStartedAt?: string | null;
  restEndsAt?: string | null;
}

interface Version4WorkoutExercise {
  exerciseId: string;
  exerciseName?: string;
  plannedTargetSets?: number | null;
  plannedMinReps?: number | null;
  plannedMaxReps?: number | null;
  plannedRirMin?: number | null;
  plannedRirMax?: number | null;
  plannedRestSeconds?: number | null;
  plannedNotes?: string | null;
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

export async function migrateVersion4ToVersion5(transaction: Transaction): Promise<void> {
  await transaction
    .table<Version4WorkoutSession, string>('workoutSessions')
    .toCollection()
    .modify((session) => {
      session.pausedAt = session.pausedAt ?? null;
      session.pausedDurationSeconds = session.pausedDurationSeconds ?? 0;
      session.currentExerciseId = session.currentExerciseId ?? null;
      session.restStartedAt = session.restStartedAt ?? null;
      session.restEndsAt = session.restEndsAt ?? null;
    });

  const exerciseNames = new Map<string, string>(
    (await transaction.table<{ id: string; name: string }, string>('exercises').toArray()).map(
      ({ id, name }) => [id, name],
    ),
  );
  await transaction
    .table<Version4WorkoutExercise, string>('workoutExercises')
    .toCollection()
    .modify((exercise) => {
      const sourceName = exerciseNames.get(exercise.exerciseId);
      exercise.exerciseName =
        exercise.exerciseName ??
        (typeof sourceName === 'string' && sourceName.trim() ? sourceName : 'Unavailable exercise');
      exercise.plannedTargetSets = exercise.plannedTargetSets ?? null;
      exercise.plannedMinReps = exercise.plannedMinReps ?? null;
      exercise.plannedMaxReps = exercise.plannedMaxReps ?? null;
      exercise.plannedRirMin = exercise.plannedRirMin ?? null;
      exercise.plannedRirMax = exercise.plannedRirMax ?? null;
      exercise.plannedRestSeconds = exercise.plannedRestSeconds ?? null;
      exercise.plannedNotes = exercise.plannedNotes ?? null;
    });
}
