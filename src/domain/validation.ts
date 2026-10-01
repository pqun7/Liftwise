import { z } from 'zod';

import {
  workoutSessionStatuses,
  workoutSetTypes,
  type AppSetting,
  type BodyMetric,
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
export const isoTimestampSchema = z.string().datetime();

const nullableNotesSchema = z.string().trim().max(2_000).nullable();
const timestampFields = {
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
};

export const exerciseSchema: z.ZodType<Exercise> = z
  .object({
    id: entityIdSchema,
    name: z.string().trim().min(1).max(120),
    notes: nullableNotesSchema,
    ...timestampFields,
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
    dayNumber: z.number().int().positive(),
    ...timestampFields,
  })
  .strict();

export const programExerciseSchema: z.ZodType<ProgramExercise> = z
  .object({
    id: entityIdSchema,
    programDayId: entityIdSchema,
    exerciseId: entityIdSchema,
    order: z.number().int().positive(),
    targetSets: z.number().int().positive().nullable(),
    targetRepsMin: z.number().int().nonnegative().nullable(),
    targetRepsMax: z.number().int().nonnegative().nullable(),
    notes: nullableNotesSchema,
    ...timestampFields,
  })
  .strict()
  .refine(
    ({ targetRepsMin, targetRepsMax }) =>
      targetRepsMin === null || targetRepsMax === null || targetRepsMin <= targetRepsMax,
    { message: 'Minimum target reps cannot exceed maximum target reps.' },
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
    notes: nullableNotesSchema,
    ...timestampFields,
  })
  .strict()
  .refine(({ startedAt, endedAt }) => endedAt === null || endedAt >= startedAt, {
    message: 'A workout cannot end before it starts.',
  });

export const workoutExerciseSchema: z.ZodType<WorkoutExercise> = z
  .object({
    id: entityIdSchema,
    workoutSessionId: entityIdSchema,
    exerciseId: entityIdSchema,
    programExerciseId: entityIdSchema.nullable(),
    order: z.number().int().positive(),
    notes: nullableNotesSchema,
    ...timestampFields,
  })
  .strict();

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
    id: entityIdSchema,
    measuredAt: isoTimestampSchema,
    weight: z.number().finite().positive().nullable(),
    bodyFatPercentage: z.number().finite().min(0).max(100).nullable(),
    notes: nullableNotesSchema,
    ...timestampFields,
  })
  .strict()
  .refine(({ weight, bodyFatPercentage }) => weight !== null || bodyFatPercentage !== null, {
    message: 'A body metric requires weight or body-fat percentage.',
  });

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
