import { z } from 'zod';

import { catalogMetadataSchema, exerciseSchema } from '../../../domain/validation';

const safeImagePathSchema = z
  .string()
  .regex(/^images\/flat\/[a-z0-9][a-z0-9-]*(?:-(?:start|peak))?\.webp$/)
  .refine((path) => !path.includes('..') && !path.includes('\\'), {
    message: 'Image paths must be safe repository-relative WebP paths.',
  });

const pairedImagesSchema = z
  .object({ start: safeImagePathSchema, peak: safeImagePathSchema })
  .strict();
const mainImageSchema = z.object({ main: safeImagePathSchema }).strict();

export const repdbRawExerciseSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name_en: z.string().trim().min(1),
    name_de: z.string().trim().min(1),
    name_es: z.string().trim().min(1),
    description_en: z.string().trim().optional(),
    description_de: z.string().trim().optional(),
    description_es: z.string().trim().optional(),
    instructions_en: z.array(z.string().trim().min(1)).min(1),
    instructions_de: z.array(z.string().trim().min(1)).optional(),
    instructions_es: z.array(z.string().trim().min(1)).optional(),
    tips_en: z.array(z.string().trim().min(1)).optional(),
    tips_de: z.array(z.string().trim().min(1)).optional(),
    tips_es: z.array(z.string().trim().min(1)).optional(),
    category: z.string().trim().min(1),
    force_type: z.string().trim().min(1),
    mechanic: z.string().trim().min(1),
    difficulty: z.string().trim().min(1),
    equipment: z.string().trim().min(1).optional(),
    body_part: z.string().trim().min(1),
    primary_muscles: z.array(z.string().trim().min(1)).min(1),
    secondary_muscles: z.array(z.string().trim().min(1)).optional(),
    goals: z.array(z.string().trim().min(1)),
    tags: z.array(z.string().trim().min(1)).optional(),
    met: z.number().finite().positive(),
    is_unilateral: z.boolean(),
    is_bodyweight: z.boolean(),
    images: z.object({ flat: z.union([pairedImagesSchema, mainImageSchema]) }).strict(),
  })
  .passthrough();

export const repdbRawDatasetSchema = z
  .object({
    name: z.string().min(1),
    homepage: z.string().url(),
    license: z.string().min(1),
    schema_version: z.union([z.string(), z.number()]),
    count: z.number().int().nonnegative(),
    note: z.string().optional(),
    exercises: z.array(z.unknown()),
  })
  .passthrough();

export const repdbCatalogArtifactSchema = z
  .object({
    metadata: catalogMetadataSchema,
    exercises: z.array(exerciseSchema),
  })
  .strict()
  .refine(({ metadata, exercises }) => metadata.exerciseCount === exercises.length, {
    message: 'Catalog metadata count must match transformed exercises.',
  });

export type RepdbRawExercise = z.infer<typeof repdbRawExerciseSchema>;
export type RepdbCatalogArtifact = z.infer<typeof repdbCatalogArtifactSchema>;
