import { z } from 'zod';

import type {
  AppSetting,
  BodyMetric,
  Exercise,
  Program,
  ProgramDay,
  ProgramExercise,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
} from '../../domain/entities';
import {
  appSettingSchema,
  bodyMetricSchema,
  exerciseSchema,
  isoTimestampSchema,
  programDaySchema,
  programExerciseSchema,
  programSchema,
  workoutExerciseSchema,
  workoutSessionSchema,
  workoutSetSchema,
} from '../../domain/validation';

export const BACKUP_VERSION = 2 as const;

export interface LiftwiseBackupData {
  customExercises: Exercise[];
  programs: Program[];
  programDays: ProgramDay[];
  programExercises: ProgramExercise[];
  workoutSessions: WorkoutSession[];
  workoutExercises: WorkoutExercise[];
  workoutSets: WorkoutSet[];
  bodyMetrics: BodyMetric[];
  portableSettings: AppSetting[];
}

export interface LiftwiseBackupEnvelope {
  application: 'liftwise';
  backupVersion: 2;
  schemaVersion: number;
  appVersion: string;
  createdAt: string;
  data: LiftwiseBackupData;
  checksum: string;
}

const backupDataFields = {
  customExercises: z.array(exerciseSchema),
  programs: z.array(programSchema),
  programDays: z.array(programDaySchema),
  programExercises: z.array(programExerciseSchema),
  workoutSessions: z.array(workoutSessionSchema),
  workoutExercises: z.array(workoutExerciseSchema),
  workoutSets: z.array(workoutSetSchema),
  bodyMetrics: z.array(bodyMetricSchema),
};

export const backupDataSchema: z.ZodType<LiftwiseBackupData> = z
  .object({ ...backupDataFields, portableSettings: z.array(appSettingSchema) })
  .strict()
  .superRefine(({ customExercises }, context) => {
    customExercises.forEach((exercise, index) => {
      if (exercise.sourceProvider !== 'custom') {
        context.addIssue({
          code: 'custom',
          path: ['customExercises', index, 'sourceProvider'],
          message: 'Backups may contain only user-created exercises.',
        });
      }
    });
  });

const envelopeFields = {
  application: z.literal('liftwise'),
  schemaVersion: z.number().int().positive(),
  appVersion: z.string().trim().min(1).max(40),
  createdAt: isoTimestampSchema,
  checksum: z.string().regex(/^[0-9a-f]{64}$/),
};

export const backupEnvelopeSchema: z.ZodType<LiftwiseBackupEnvelope> = z
  .object({
    ...envelopeFields,
    backupVersion: z.literal(BACKUP_VERSION),
    data: backupDataSchema,
  })
  .strict();

const legacyWorkoutSessionSchema = z
  .object({
    id: z.string().uuid(),
    programId: z.string().uuid().nullable(),
    programDayId: z.string().uuid().nullable(),
    name: z.string().trim().min(1).max(120).nullable(),
    status: z.enum(['active', 'completed', 'discarded']),
    startedAt: isoTimestampSchema,
    endedAt: isoTimestampSchema.nullable(),
    notes: z.string().trim().max(2_000).nullable(),
    createdAt: isoTimestampSchema,
    updatedAt: isoTimestampSchema,
  })
  .strict();

const legacyWorkoutExerciseSchema = z
  .object({
    id: z.string().uuid(),
    workoutSessionId: z.string().uuid(),
    exerciseId: z.union([z.string().uuid(), z.string().regex(/^repdb:[a-z0-9]+(?:-[a-z0-9]+)*$/)]),
    programExerciseId: z.string().uuid().nullable(),
    order: z.number().int().positive(),
    notes: z.string().trim().max(2_000).nullable(),
    createdAt: isoTimestampSchema,
    updatedAt: isoTimestampSchema,
  })
  .strict();

const legacyBackupDataFields = {
  ...backupDataFields,
  workoutSessions: z.array(legacyWorkoutSessionSchema),
  workoutExercises: z.array(legacyWorkoutExerciseSchema),
};

export const version1BackupEnvelopeSchema = z
  .object({
    ...envelopeFields,
    backupVersion: z.literal(1),
    data: z
      .object({ ...legacyBackupDataFields, portableSettings: z.array(appSettingSchema) })
      .strict(),
  })
  .strict();

export const version0BackupEnvelopeSchema = z
  .object({
    ...envelopeFields,
    backupVersion: z.literal(0),
    data: z.object({ ...legacyBackupDataFields, appSettings: z.array(appSettingSchema) }).strict(),
  })
  .strict();

export type LegacyBackupData = z.infer<typeof version1BackupEnvelopeSchema>['data'];

export const backupHeaderSchema = z
  .object({
    application: z.literal('liftwise'),
    backupVersion: z.number().int().nonnegative(),
    schemaVersion: z.number().int().positive(),
    checksum: z.string(),
  })
  .passthrough();
