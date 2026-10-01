import type { RepdbRawExercise } from './schema';
import { repdbRawDatasetSchema, repdbRawExerciseSchema } from './schema';

export interface ImportIssue {
  sourceId: string | null;
  message: string;
}

export interface RepdbValidationSummary {
  imported: number;
  skipped: number;
  warnings: ImportIssue[];
  errors: ImportIssue[];
}

export interface ValidatedRepdbDataset {
  name: string;
  schemaVersion: string;
  reportedCount: number;
  exercises: RepdbRawExercise[];
  summary: RepdbValidationSummary;
}

export function validateRepdbDataset(input: unknown): ValidatedRepdbDataset {
  const topLevel = repdbRawDatasetSchema.safeParse(input);
  if (!topLevel.success) {
    throw new Error(`Fatal RepDB schema error: ${topLevel.error.message}`);
  }

  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const exercises: RepdbRawExercise[] = [];
  const ids = new Set<string>();

  for (const [index, candidate] of topLevel.data.exercises.entries()) {
    const parsed = repdbRawExerciseSchema.safeParse(candidate);
    if (!parsed.success) {
      const sourceId =
        typeof candidate === 'object' && candidate !== null && 'id' in candidate
          ? String(candidate.id)
          : null;
      errors.push({
        sourceId,
        message: `Record ${index}: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`,
      });
      continue;
    }

    if (ids.has(parsed.data.id)) {
      errors.push({ sourceId: parsed.data.id, message: 'Duplicate RepDB source ID.' });
      continue;
    }
    ids.add(parsed.data.id);

    if (!parsed.data.description_en) {
      warnings.push({ sourceId: parsed.data.id, message: 'English description is missing.' });
    }
    if (!parsed.data.tips_en?.length) {
      warnings.push({ sourceId: parsed.data.id, message: 'English tips are missing.' });
    }
    if (!parsed.data.equipment && !parsed.data.is_bodyweight) {
      warnings.push({ sourceId: parsed.data.id, message: 'Equipment is missing.' });
    }

    exercises.push(parsed.data);
  }

  if (topLevel.data.count !== topLevel.data.exercises.length) {
    errors.push({
      sourceId: null,
      message: `Reported count ${topLevel.data.count} does not match array length ${topLevel.data.exercises.length}.`,
    });
  }

  return {
    name: topLevel.data.name,
    schemaVersion: String(topLevel.data.schema_version),
    reportedCount: topLevel.data.count,
    exercises,
    summary: {
      imported: exercises.length,
      skipped: topLevel.data.exercises.length - exercises.length,
      warnings,
      errors,
    },
  };
}
