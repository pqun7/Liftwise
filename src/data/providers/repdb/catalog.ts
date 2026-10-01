import { REPDB_CATALOG_PATH } from './config';
import { repdbCatalogArtifactSchema, type RepdbCatalogArtifact } from './schema';

let catalogPromise: Promise<RepdbCatalogArtifact> | undefined;

export function loadRepdbCatalog(): Promise<RepdbCatalogArtifact> {
  catalogPromise ??= fetch(REPDB_CATALOG_PATH).then(async (response) => {
    if (!response.ok) {
      throw new Error(`The local RepDB catalog could not be loaded (${response.status}).`);
    }
    return repdbCatalogArtifactSchema.parse(await response.json());
  });

  return catalogPromise;
}

export function resetRepdbCatalogLoaderForTests(): void {
  catalogPromise = undefined;
}
