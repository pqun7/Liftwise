export const DATABASE_NAME = 'liftwise';
export const DATABASE_VERSION = 3;

export const VERSION_1_STORES = {
  appSettings: '&key, updatedAt',
} as const;

export const VERSION_2_STORES = {
  exercises: '&id, name, updatedAt',
  programs: '&id, name, archived, updatedAt',
  programDays: '&id, programId, &[programId+dayNumber], updatedAt',
  programExercises: '&id, programDayId, exerciseId, &[programDayId+order], updatedAt',
  workoutSessions: '&id, status, startedAt, programId, programDayId, updatedAt',
  workoutExercises:
    '&id, workoutSessionId, exerciseId, programExerciseId, &[workoutSessionId+order], updatedAt',
  workoutSets: '&id, workoutExerciseId, &[workoutExerciseId+setNumber], completed, updatedAt',
  bodyMetrics: '&id, measuredAt, updatedAt',
  appSettings: '&key, createdAt, updatedAt',
} as const;

export const VERSION_3_STORES = {
  ...VERSION_2_STORES,
  exercises:
    '&id, &[sourceProvider+sourceId], sourceProvider, name, bodyPart, equipment, difficulty, category, isActive, updatedAt',
  catalogMetadata: '&provider, sourceCommit, importedAt',
} as const;
