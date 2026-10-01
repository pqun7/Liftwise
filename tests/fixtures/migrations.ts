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

export const version4ExerciseFixture = Object.freeze({
  id: '55555555-5555-4555-8555-555555555555',
  sourceProvider: 'custom',
  sourceId: '55555555-5555-4555-8555-555555555555',
  name: 'Legacy Row',
  description: null,
  instructions: [],
  tips: [],
  category: null,
  forceType: null,
  mechanic: null,
  difficulty: null,
  equipment: null,
  bodyPart: null,
  primaryMuscles: ['back'],
  secondaryMuscles: [],
  goals: [],
  tags: [],
  met: null,
  isUnilateral: false,
  isBodyweight: false,
  images: { start: null, peak: null, main: null },
  localizations: {
    en: { name: 'Legacy Row', description: null, instructions: [], tips: [] },
  },
  importedAt: null,
  isActive: true,
  searchText: 'legacy row',
  notes: null,
  createdAt: MIGRATION_TIMESTAMP,
  updatedAt: MIGRATION_TIMESTAMP,
});

export const version4WorkoutSessionFixture = Object.freeze({
  id: '66666666-6666-4666-8666-666666666666',
  programId: null,
  programDayId: null,
  name: 'Legacy Workout',
  status: 'active',
  startedAt: MIGRATION_TIMESTAMP,
  endedAt: null,
  notes: 'Keep workout',
  createdAt: MIGRATION_TIMESTAMP,
  updatedAt: MIGRATION_TIMESTAMP,
});

export const version4WorkoutExerciseFixture = Object.freeze({
  id: '77777777-7777-4777-8777-777777777777',
  workoutSessionId: version4WorkoutSessionFixture.id,
  exerciseId: version4ExerciseFixture.id,
  programExerciseId: null,
  order: 1,
  notes: 'Keep exercise',
  createdAt: MIGRATION_TIMESTAMP,
  updatedAt: MIGRATION_TIMESTAMP,
});
