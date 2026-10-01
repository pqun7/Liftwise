import type { CatalogMetadata } from '../../src/domain/entities';
import { transformRepdbExercise } from '../../src/data/providers/repdb/adapter';
import type { RepdbCatalogArtifact, RepdbRawExercise } from '../../src/data/providers/repdb/schema';

export function createRawRepdbExercise(
  overrides: Partial<RepdbRawExercise> = {},
): RepdbRawExercise {
  return {
    id: 'bench-press',
    name_en: 'Bench Press',
    name_de: 'Bankdrücken',
    name_es: 'Press de banca',
    description_en: 'A horizontal barbell press.',
    description_de: 'Eine horizontale Langhantelpresse.',
    description_es: 'Un press horizontal con barra.',
    instructions_en: ['Lie on the bench.', 'Press the bar upward.'],
    instructions_de: ['Lege dich auf die Bank.', 'Drücke die Hantel nach oben.'],
    instructions_es: ['Túmbate en el banco.', 'Empuja la barra hacia arriba.'],
    tips_en: ['Keep your feet planted.'],
    tips_de: ['Halte die Füße am Boden.'],
    tips_es: ['Mantén los pies apoyados.'],
    category: 'strength',
    force_type: 'push',
    mechanic: 'compound',
    difficulty: 'intermediate',
    equipment: 'barbell',
    body_part: 'chest',
    primary_muscles: ['pectoralis_major'],
    secondary_muscles: ['triceps', 'anterior_deltoid'],
    goals: ['strength', 'hypertrophy'],
    tags: ['compound'],
    met: 5,
    is_unilateral: false,
    is_bodyweight: false,
    images: {
      flat: {
        start: 'images/flat/bench-press-start.webp',
        peak: 'images/flat/bench-press-peak.webp',
      },
    },
    ...overrides,
  };
}

export function createRepdbMetadata(overrides: Partial<CatalogMetadata> = {}): CatalogMetadata {
  return {
    provider: 'repdb',
    sourceRepository: 'https://github.com/RepDB/exercise-dataset',
    sourceCommit: '9ed9357f09c7566ea0256c57ebd6374ebb8b575e',
    schemaVersion: '3',
    importedAt: '2026-09-16T10:25:27.000Z',
    exerciseCount: 1,
    sourceJsonBytes: 100,
    mediaFileCount: 2,
    mediaBytes: 200,
    ...overrides,
  };
}

export function createRepdbArtifact(
  rawExercises: RepdbRawExercise[] = [createRawRepdbExercise()],
): RepdbCatalogArtifact {
  const metadata = createRepdbMetadata({ exerciseCount: rawExercises.length });
  return {
    metadata,
    exercises: rawExercises.map((exercise) =>
      transformRepdbExercise(exercise, metadata.importedAt),
    ),
  };
}
