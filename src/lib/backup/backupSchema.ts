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

export const BACKUP_VERSION = 1 as const;

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
  backupVersion: 1;
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

export const legacyBackupEnvelopeSchema = z
  .object({
    ...envelopeFields,
    backupVersion: z.literal(0),
    data: z.object({ ...backupDataFields, appSettings: z.array(appSettingSchema) }).strict(),
  })
  .strict();

export const backupHeaderSchema = z
  .object({
    application: z.literal('liftwise'),
    backupVersion: z.number().int().nonnegative(),
    schemaVersion: z.number().int().positive(),
    checksum: z.string(),
  })
  .passthrough();
