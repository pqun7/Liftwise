import { writeFile } from 'node:fs/promises';

import type { CatalogMetadata } from '../../src/domain/entities';
import { transformRepdbExercise } from '../../src/data/providers/repdb/adapter';
import type { RepdbCatalogArtifact } from '../../src/data/providers/repdb/schema';
import type { ValidatedRepdbDataset } from '../../src/data/providers/repdb/validation';

interface TransformOptions {
  metadata: CatalogMetadata;
  outputPath: string;
}

export async function transformRepdbDataset(
  dataset: ValidatedRepdbDataset,
  options: TransformOptions,
): Promise<RepdbCatalogArtifact> {
  const artifact: RepdbCatalogArtifact = {
    metadata: options.metadata,
    exercises: dataset.exercises.map((exercise) =>
      transformRepdbExercise(exercise, options.metadata.importedAt),
    ),
  };

  await writeFile(options.outputPath, `${JSON.stringify(artifact)}\n`, 'utf8');
  return artifact;
}
