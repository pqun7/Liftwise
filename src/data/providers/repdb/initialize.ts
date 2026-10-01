import { database, type LiftwiseDatabase } from '../../../lib/storage/database';
import { loadRepdbCatalog } from './catalog';
import { seedRepdbCatalog, type CatalogSeedResult } from './seeder';

let initializationPromise: Promise<CatalogSeedResult> | undefined;

export function initializeRepdbCatalog(
  db: LiftwiseDatabase = database,
): Promise<CatalogSeedResult> {
  initializationPromise ??= loadRepdbCatalog().then((catalog) => seedRepdbCatalog(catalog, db));
  return initializationPromise;
}

export function resetRepdbInitializationForTests(): void {
  initializationPromise = undefined;
}
