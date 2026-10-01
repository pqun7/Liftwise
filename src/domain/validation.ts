import { z } from 'zod';

import {
  exerciseSourceProviders,
  workoutSessionStatuses,
  workoutSetTypes,
  type AppSetting,
  type BodyMetric,
  type CatalogMetadata,
  type Exercise,
  type JsonValue,
  type Program,
  type ProgramDay,
  type ProgramExercise,
  type WorkoutExercise,
  type WorkoutSession,
  type WorkoutSet,
} from './entities';

export const entityIdSchema = z.string().uuid();
export const exerciseIdSchema = z.union([
  entityIdSchema,
  z.string().regex(/^repdb:[a-z0-9]+(?:-[a-z0-9]+)*$/),
]);
export const isoTimestampSchema = z.string().datetime();

const nullableNotesSchema = z.string().trim().max(2_000).nullable();
const timestampFields = {
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
};

export const exerciseSchema: z.ZodType<Exercise> = z
  .object({
    id: exerciseIdSchema,
    sourceProvider: z.enum(exerciseSourceProviders),
    sourceId: z.string().trim().min(1).max(160),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2_000).nullable(),
    instructions: z.array(z.string().trim().min(1).max(1_000)),
    tips: z.array(z.string().trim().min(1).max(1_000)),
    category: z.string().trim().min(1).max(80).nullable(),
    forceType: z.string().trim().min(1).max(80).nullable(),
    mechanic: z.string().trim().min(1).max(80).nullable(),
    difficulty: z.string().trim().min(1).max(80).nullable(),
    equipment: z.string().trim().min(1).max(120).nullable(),
    bodyPart: z.string().trim().min(1).max(120).nullable(),
    primaryMuscles: z.array(z.string().trim().min(1).max(120)).min(1),
    secondaryMuscles: z.array(z.string().trim().min(1).max(120)),
    goals: z.array(z.string().trim().min(1).max(120)),
    tags: z.array(z.string().trim().min(1).max(120)),
    met: z.number().finite().positive().nullable(),
    isUnilateral: z.boolean(),
    isBodyweight: z.boolean(),
    images: z
      .object({
        start: z
          .object({
            path: z.string().min(1),
            width: z.number().int().positive(),
            height: z.number().int().positive(),
            alt: z.string().min(1),
          })
          .strict()
          .nullable(),
        peak: z
          .object({
            path: z.string().min(1),
            width: z.number().int().positive(),
            height: z.number().int().positive(),
            alt: z.string().min(1),
          })
          .strict()
          .nullable(),
        main: z
          .object({
            path: z.string().min(1),
            width: z.number().int().positive(),
            height: z.number().int().positive(),
            alt: z.string().min(1),
          })
          .strict()
          .nullable(),
      })
      .strict(),
    localizations: z
      .object({
        en: z
          .object({
            name: z.string().trim().min(1),
            description: z.string().trim().nullable(),
            instructions: z.array(z.string().trim().min(1)),
            tips: z.array(z.string().trim().min(1)),
          })
          .strict(),
        de: z
          .object({
            name: z.string().trim().min(1),
            description: z.string().trim().nullable(),
            instructions: z.array(z.string().trim().min(1)),
            tips: z.array(z.string().trim().min(1)),
          })
          .strict()
          .optional(),
        es: z
          .object({
            name: z.string().trim().min(1),
            description: z.string().trim().nullable(),
            instructions: z.array(z.string().trim().min(1)),
            tips: z.array(z.string().trim().min(1)),
          })
          .strict()
          .optional(),
      })
      .strict(),
    importedAt: isoTimestampSchema.nullable(),
    isActive: z.boolean(),
    searchText: z.string(),
    notes: nullableNotesSchema,
    ...timestampFields,
  })
  .strict()
  .refine(
    ({ id, sourceProvider, sourceId }) =>
      sourceProvider === 'repdb' ? id === `repdb:${sourceId}` : !id.startsWith('repdb:'),
    { message: 'Exercise identity must match its source provider.' },
  )
  .superRefine(({ images, sourceProvider }, context) => {
    if (
      sourceProvider === 'repdb' &&
      images.main === null &&
      (images.start === null || images.peak === null)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'RepDB exercises require main or start and peak poses.',
        path: ['images'],
      });
    }
  });

export const catalogMetadataSchema: z.ZodType<CatalogMetadata> = z
  .object({
    provider: z.literal('repdb'),
    sourceRepository: z.string().url(),
    sourceCommit: z.string().regex(/^[0-9a-f]{40}$/),
    schemaVersion: z.string().min(1),
    importedAt: isoTimestampSchema,
    exerciseCount: z.number().int().nonnegative(),
    sourceJsonBytes: z.number().int().nonnegative(),
    mediaFileCount: z.number().int().nonnegative(),
    mediaBytes: z.number().int().nonnegative(),
  })
  .strict();

export const programSchema: z.ZodType<Program> = z
  .object({
    id: entityIdSchema,
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2_000).nullable(),
    archived: z.boolean(),
    ...timestampFields,
  })
  .strict();

export const programDaySchema: z.ZodType<ProgramDay> = z
  .object({
    id: entityIdSchema,
    programId: entityIdSchema,
    name: z.string().trim().min(1).max(120),
    order: z.number().int().positive(),
    notes: nullableNotesSchema,
    ...timestampFields,
  })
  .strict();

export const programExerciseSchema: z.ZodType<ProgramExercise> = z
  .object({
    id: entityIdSchema,
    programDayId: entityIdSchema,
    exerciseId: exerciseIdSchema,
    order: z.number().int().positive(),
    targetSets: z.number().int().positive().nullable(),
    minReps: z.number().int().nonnegative().nullable(),
    maxReps: z.number().int().nonnegative().nullable(),
    targetRirMin: z.number().int().min(0).max(10).nullable(),
    targetRirMax: z.number().int().min(0).max(10).nullable(),
    restSeconds: z.number().int().nonnegative().max(3_600).nullable(),
    notes: nullableNotesSchema,
    ...timestampFields,
  })
  .strict()
  .refine(({ minReps, maxReps }) => minReps === null || maxReps === null || minReps <= maxReps, {
    message: 'Minimum target reps cannot exceed maximum target reps.',
  })
  .refine(
    ({ targetRirMin, targetRirMax }) =>
      targetRirMin === null || targetRirMax === null || targetRirMin <= targetRirMax,
    { message: 'Minimum target RIR cannot exceed maximum target RIR.' },
  );

export const workoutSessionSchema: z.ZodType<WorkoutSession> = z
  .object({
    id: entityIdSchema,
    programId: entityIdSchema.nullable(),
    programDayId: entityIdSchema.nullable(),
    name: z.string().trim().min(1).max(120).nullable(),
    status: z.enum(workoutSessionStatuses),
    startedAt: isoTimestampSchema,
    endedAt: isoTimestampSchema.nullable(),
    pausedAt: isoTimestampSchema.nullable(),
    pausedDurationSeconds: z.number().int().nonnegative(),
    currentExerciseId: entityIdSchema.nullable(),
    restStartedAt: isoTimestampSchema.nullable(),
    restEndsAt: isoTimestampSchema.nullable(),
    notes: nullableNotesSchema,
    ...timestampFields,
  })
  .strict()
  .refine(({ startedAt, endedAt }) => endedAt === null || endedAt >= startedAt, {
    message: 'A workout cannot end before it starts.',
  })
  .refine(
    ({ restStartedAt, restEndsAt }) =>
      (restStartedAt === null && restEndsAt === null) ||
      (restStartedAt !== null && restEndsAt !== null && restEndsAt >= restStartedAt),
    { message: 'Rest timer timestamps must be a valid pair.' },
  );

export const workoutExerciseSchema: z.ZodType<WorkoutExercise> = z
  .object({
    skipped: z.boolean().optional(),
    id: entityIdSchema,
    workoutSessionId: entityIdSchema,
    exerciseId: exerciseIdSchema,
    programExerciseId: entityIdSchema.nullable(),
    exerciseName: z.string().trim().min(1).max(120),
    order: z.number().int().positive(),
    plannedTargetSets: z.number().int().positive().nullable(),
    plannedMinReps: z.number().int().nonnegative().nullable(),
    plannedMaxReps: z.number().int().nonnegative().nullable(),
    plannedRirMin: z.number().int().min(0).max(10).nullable(),
    plannedRirMax: z.number().int().min(0).max(10).nullable(),
    plannedRestSeconds: z.number().int().nonnegative().max(3_600).nullable(),
    plannedNotes: nullableNotesSchema,
    notes: nullableNotesSchema,
    ...timestampFields,
  })
  .strict()
  .refine(
    ({ plannedMinReps, plannedMaxReps }) =>
      plannedMinReps === null || plannedMaxReps === null || plannedMinReps <= plannedMaxReps,
    { message: 'Minimum planned reps cannot exceed maximum planned reps.' },
  )
  .refine(
    ({ plannedRirMin, plannedRirMax }) =>
      plannedRirMin === null || plannedRirMax === null || plannedRirMin <= plannedRirMax,
    { message: 'Minimum planned RIR cannot exceed maximum planned RIR.' },
  );

export const workoutSetSchema: z.ZodType<WorkoutSet> = z
  .object({
    id: entityIdSchema,
    workoutExerciseId: entityIdSchema,
    setNumber: z.number().int().positive(),
    setType: z.enum(workoutSetTypes),
    weight: z.number().finite().nonnegative().nullable(),
    reps: z.number().int().nonnegative().nullable(),
    rir: z.number().finite().min(0).max(10).nullable(),
    completed: z.boolean(),
    ...timestampFields,
  })
  .strict()
  .refine(({ completed, weight, reps }) => !completed || (weight !== null && reps !== null), {
    message: 'Completed sets require both weight and reps.',
  });

export const bodyMetricSchema: z.ZodType<BodyMetric> = z
  .object({
    waistCm: z.number().finite().positive().nullable().optional(),
    chestCm: z.number().finite().positive().nullable().optional(),
    armsCm: z.number().finite().positive().nullable().optional(),
    legsCm: z.number().finite().positive().nullable().optional(),
    id: entityIdSchema,
    measuredAt: isoTimestampSchema,
    weight: z.number().finite().positive().nullable(),
    bodyFatPercentage: z.number().finite().min(0).max(100).nullable(),
    notes: nullableNotesSchema,
    ...timestampFields,
  })
  .strict()
  .refine(
    (record) =>
      [
        record.weight,
        record.bodyFatPercentage,
        record.waistCm,
        record.chestCm,
        record.armsCm,
        record.legsCm,
      ].some((value) => value !== null && value !== undefined),
    {
      message: 'Enter at least one body measurement.',
    },
  );

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const appSettingSchema: z.ZodType<AppSetting> = z
  .object({
    key: z.string().trim().min(1).max(120),
    value: jsonValueSchema,
    ...timestampFields,
  })
  .strict();

export const entitySchemas = {
  exercise: exerciseSchema,
  program: programSchema,
  programDay: programDaySchema,
  programExercise: programExerciseSchema,
  workoutSession: workoutSessionSchema,
  workoutExercise: workoutExerciseSchema,
  workoutSet: workoutSetSchema,
  bodyMetric: bodyMetricSchema,
  appSetting: appSettingSchema,
} as const;
