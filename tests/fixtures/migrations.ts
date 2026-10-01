export const MIGRATION_TIMESTAMP = '2026-09-30T12:00:00.000Z';

export const version1SettingFixture = Object.freeze({
  key: 'units',
  value: 'metric',
  updatedAt: MIGRATION_TIMESTAMP,
});

export const version2ExerciseFixture = Object.freeze({
  id: '44444444-4444-4444-8444-444444444444',
  name: 'Legacy Squat',
  notes: 'Preserve me',
  createdAt: MIGRATION_TIMESTAMP,
  updatedAt: MIGRATION_TIMESTAMP,
});

export const version3ProgramFixture = Object.freeze({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Legacy PPL',
  description: null,
  archived: false,
  createdAt: MIGRATION_TIMESTAMP,
  updatedAt: MIGRATION_TIMESTAMP,
});

export const version3DayFixture = Object.freeze({
  id: '22222222-2222-4222-8222-222222222222',
  programId: version3ProgramFixture.id,
  name: 'Push',
  dayNumber: 1,
  createdAt: MIGRATION_TIMESTAMP,
  updatedAt: MIGRATION_TIMESTAMP,
});

export const version3ProgramExerciseFixture = Object.freeze({
  id: '33333333-3333-4333-8333-333333333333',
  programDayId: version3DayFixture.id,
  exerciseId: 'repdb:barbell-bench-press',
  order: 1,
  targetSets: 3,
  targetRepsMin: 6,
  targetRepsMax: 8,
  notes: 'Pause',
  createdAt: MIGRATION_TIMESTAMP,
  updatedAt: MIGRATION_TIMESTAMP,
});
