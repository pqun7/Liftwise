import { describe, expect, it } from 'vitest';

import { searchExercises } from '../src/domain/exerciseSearch';
import { createRepdbExerciseId, transformRepdbExercise } from '../src/data/providers/repdb/adapter';
import { validateRepdbDataset } from '../src/data/providers/repdb/validation';
import { createRawRepdbExercise } from './fixtures/repdb';

const importedAt = '2026-09-16T10:25:27.000Z';

function dataset(exercises: unknown[], count = exercises.length) {
  return {
    name: 'RepDB',
    homepage: 'https://repdb.co',
    license: 'other',
    schema_version: 3,
    count,
    exercises,
  };
}

describe('RepDB provider validation and mapping', () => {
  it('maps provider data without leaking the raw schema', () => {
    const exercise = transformRepdbExercise(createRawRepdbExercise(), importedAt);

    expect(exercise).toMatchObject({
      id: 'repdb:bench-press',
      sourceProvider: 'repdb',
      sourceId: 'bench-press',
      equipment: 'barbell',
      difficulty: 'intermediate',
      primaryMuscles: ['pectoralis_major'],
      secondaryMuscles: ['triceps', 'anterior_deltoid'],
      goals: ['strength', 'hypertrophy'],
    });
    expect(exercise.localizations.de?.name).toBe('Bankdrücken');
    expect(createRepdbExerciseId('bench-press')).toBe('repdb:bench-press');
  });

  it('supports start and peak image records', () => {
    const exercise = transformRepdbExercise(createRawRepdbExercise(), importedAt);
    expect(exercise.images.start?.path).toBe('/repdb-media/flat/bench-press-start.webp');
    expect(exercise.images.peak?.path).toBe('/repdb-media/flat/bench-press-peak.webp');
    expect(exercise.images.main).toBeNull();
  });

  it('supports a single main image record', () => {
    const raw = createRawRepdbExercise({
      id: 'chest-stretch',
      name_en: 'Chest Stretch',
      images: { flat: { main: 'images/flat/chest-stretch.webp' } },
    });
    const exercise = transformRepdbExercise(raw, importedAt);
    expect(exercise.images.main?.path).toBe('/repdb-media/flat/chest-stretch.webp');
    expect(exercise.images.start).toBeNull();
    expect(exercise.images.peak).toBeNull();
  });

  it('reports duplicate IDs and count mismatches instead of silently importing them', () => {
    const raw = createRawRepdbExercise();
    const result = validateRepdbDataset(dataset([raw, raw], 3));
    expect(result.summary.imported).toBe(1);
    expect(result.summary.skipped).toBe(1);
    expect(result.summary.errors.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Duplicate RepDB source ID.',
        'Reported count 3 does not match array length 2.',
      ]),
    );
  });

  it('rejects unsafe image paths with a useful record error', () => {
    const raw = createRawRepdbExercise({
      images: { flat: { main: '../premium-samples/not-allowed.webp' } },
    });
    const result = validateRepdbDataset(dataset([raw]));
    expect(result.summary.imported).toBe(0);
    expect(result.summary.errors[0]?.sourceId).toBe('bench-press');
  });

  it('searches partially and case-insensitively and applies catalog filters', () => {
    const bench = transformRepdbExercise(createRawRepdbExercise(), importedAt);
    const stretch = transformRepdbExercise(
      createRawRepdbExercise({
        id: 'hamstring-stretch',
        name_en: 'Hamstring Stretch',
        body_part: 'upper_legs',
        primary_muscles: ['hamstrings'],
        category: 'stretching',
        difficulty: 'beginner',
        equipment: undefined,
        is_bodyweight: true,
        images: { flat: { main: 'images/flat/hamstring-stretch.webp' } },
      }),
      importedAt,
    );

    expect(searchExercises([bench, stretch], 'BENch')).toEqual([bench]);
    expect(
      searchExercises([bench, stretch], '', {
        bodyPart: 'chest',
        primaryMuscle: 'pectoralis_major',
        equipment: 'barbell',
        difficulty: 'intermediate',
        category: 'strength',
        goal: 'strength',
      }),
    ).toEqual([bench]);
  });
});
