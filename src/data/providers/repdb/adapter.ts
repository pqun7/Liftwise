import type { Exercise, ExerciseImage } from '../../../domain/entities';
import { createExerciseSearchText } from '../../../domain/exerciseSearch';
import { exerciseSchema } from '../../../domain/validation';
import { REPDB_MEDIA_ROOT, REPDB_PROVIDER } from './config';
import type { RepdbRawExercise } from './schema';

export function createRepdbExerciseId(sourceId: string): string {
  return `${REPDB_PROVIDER}:${sourceId}`;
}

function createImage(path: string | undefined, name: string, pose: string): ExerciseImage | null {
  if (!path) return null;
  const relativePath = path.replace(/^images\//, '');
  return {
    path: `${REPDB_MEDIA_ROOT}/${relativePath}`,
    width: 512,
    height: 512,
    alt: `${name} — ${pose} position`,
  };
}

export function transformRepdbExercise(raw: RepdbRawExercise, importedAt: string): Exercise {
  const flat = raw.images.flat;
  const startPath = 'start' in flat ? flat.start : undefined;
  const peakPath = 'peak' in flat ? flat.peak : undefined;
  const mainPath = 'main' in flat ? flat.main : undefined;
  const primaryMuscles = [...raw.primary_muscles];
  const secondaryMuscles = [...(raw.secondary_muscles ?? [])];
  const goals = [...raw.goals];
  const tags = [...(raw.tags ?? [])];
  const equipment = raw.equipment ?? null;

  const exercise = {
    id: createRepdbExerciseId(raw.id),
    sourceProvider: REPDB_PROVIDER,
    sourceId: raw.id,
    name: raw.name_en,
    description: raw.description_en ?? null,
    instructions: [...raw.instructions_en],
    tips: [...(raw.tips_en ?? [])],
    category: raw.category,
    forceType: raw.force_type,
    mechanic: raw.mechanic,
    difficulty: raw.difficulty,
    equipment,
    bodyPart: raw.body_part,
    primaryMuscles,
    secondaryMuscles,
    goals,
    tags,
    met: raw.met,
    isUnilateral: raw.is_unilateral,
    isBodyweight: raw.is_bodyweight,
    images: {
      start: createImage(startPath, raw.name_en, 'start'),
      peak: createImage(peakPath, raw.name_en, 'peak'),
      main: createImage(mainPath, raw.name_en, 'main'),
    },
    localizations: {
      en: {
        name: raw.name_en,
        description: raw.description_en ?? null,
        instructions: [...raw.instructions_en],
        tips: [...(raw.tips_en ?? [])],
      },
      de: {
        name: raw.name_de,
        description: raw.description_de ?? null,
        instructions: [...(raw.instructions_de ?? [])],
        tips: [...(raw.tips_de ?? [])],
      },
      es: {
        name: raw.name_es,
        description: raw.description_es ?? null,
        instructions: [...(raw.instructions_es ?? [])],
        tips: [...(raw.tips_es ?? [])],
      },
    },
    importedAt,
    isActive: true,
    searchText: createExerciseSearchText({
      name: raw.name_en,
      bodyPart: raw.body_part,
      equipment,
      primaryMuscles,
      secondaryMuscles,
      goals,
      tags,
    }),
    notes: null,
    createdAt: importedAt,
    updatedAt: importedAt,
  } satisfies Exercise;

  return exerciseSchema.parse(exercise);
}
