import { database, type LiftwiseDatabase } from '../../../lib/storage/database';
import { loadRepdbCatalog } from './catalog';
import { seedRepdbCatalog, type CatalogSeedResult } from './seeder';
import { REPDB_SOURCE_COMMIT, REPDB_EXPECTED_SCHEMA_VERSION } from './config';

let initializationPromises = new WeakMap<LiftwiseDatabase, Promise<CatalogSeedResult>>();

export function initializeRepdbCatalog(
  db: LiftwiseDatabase = database,
): Promise<CatalogSeedResult> {
  let promise = initializationPromises.get(db);
  if (!promise) {
    promise = (async () => {
      const metadata = await db.catalogMetadata.get('repdb');
      if (
        metadata?.sourceCommit === REPDB_SOURCE_COMMIT &&
        metadata.schemaVersion === REPDB_EXPECTED_SCHEMA_VERSION
      ) {
        // Indexed count avoids deserializing the entire catalog a second time.
        // Extra retained/deprecated rows fall through to the existing safe seeder.
        const count = await db.exercises.where('sourceProvider').equals('repdb').count();
        if (count === metadata.exerciseCount && count > 0) {
          return { inserted: 0, updated: 0, deactivated: 0, unchanged: count };
        }
      }
      return seedRepdbCatalog(await loadRepdbCatalog(), db);
    })().catch((error: unknown) => {
      initializationPromises.delete(db);
      throw error;
    });
    initializationPromises.set(db, promise);
  }
  return promise;
}

export function resetRepdbInitializationForTests(): void {
  initializationPromises = new WeakMap();
}
