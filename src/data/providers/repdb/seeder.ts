import type { Exercise } from '../../../domain/entities';
import { exerciseSchema } from '../../../domain/validation';
import { database, type LiftwiseDatabase } from '../../../lib/storage/database';
import { repdbCatalogArtifactSchema, type RepdbCatalogArtifact } from './schema';

export interface CatalogSeedResult {
  inserted: number;
  updated: number;
  deactivated: number;
  unchanged: number;
}

export async function seedRepdbCatalog(
  artifactInput: RepdbCatalogArtifact,
  db: LiftwiseDatabase = database,
): Promise<CatalogSeedResult> {
  const artifact = repdbCatalogArtifactSchema.parse(artifactInput);

  return db.transaction('rw', [db.exercises, db.catalogMetadata], async () => {
    const existingMetadata = await db.catalogMetadata.get('repdb');
    const existingProviderExercises = await db.exercises
      .where('sourceProvider')
      .equals('repdb')
      .toArray();

    if (
      existingMetadata?.sourceCommit === artifact.metadata.sourceCommit &&
      existingMetadata.exerciseCount === artifact.exercises.length &&
      existingProviderExercises.length === artifact.exercises.length
    ) {
      return { inserted: 0, updated: 0, deactivated: 0, unchanged: artifact.exercises.length };
    }

    const existingById = new Map(
      existingProviderExercises.map((exercise) => [exercise.id, exercise]),
    );
    const incomingIds = new Set(artifact.exercises.map((exercise) => exercise.id));
    const records: Exercise[] = [];
    let inserted = 0;
    let updated = 0;

    for (const incoming of artifact.exercises) {
      const existing = existingById.get(incoming.id);
      if (existing === undefined) inserted += 1;
      else updated += 1;

      records.push(
        exerciseSchema.parse({
          ...incoming,
          createdAt: existing?.createdAt ?? incoming.createdAt,
          updatedAt: artifact.metadata.importedAt,
          importedAt: artifact.metadata.importedAt,
          isActive: true,
        }),
      );
    }

    let deactivated = 0;
    for (const existing of existingProviderExercises) {
      if (!incomingIds.has(existing.id) && existing.isActive) {
        records.push(
          exerciseSchema.parse({
            ...existing,
            isActive: false,
            updatedAt: artifact.metadata.importedAt,
          }),
        );
        deactivated += 1;
      }
    }

    await db.exercises.bulkPut(records);
    await db.catalogMetadata.put(artifact.metadata);
    return { inserted, updated, deactivated, unchanged: 0 };
  });
}
