export const REPDB_PROVIDER = 'repdb' as const;
export const REPDB_SOURCE_REPOSITORY = 'https://github.com/RepDB/exercise-dataset';
export const REPDB_SOURCE_COMMIT = '9ed9357f09c7566ea0256c57ebd6374ebb8b575e';
export const REPDB_SOURCE_COMMIT_DATE = '2026-09-16T10:25:27.000Z';
export const REPDB_EXPECTED_SCHEMA_VERSION = '3';
export const REPDB_CATALOG_PATH = '/repdb/catalog.json';
export const REPDB_MEDIA_ROOT = '/repdb-media';
export const REPDB_MEDIA_CACHE_PREFIX = 'liftwise-repdb-media';

export function getRepdbMediaCacheName(sourceCommit = REPDB_SOURCE_COMMIT): string {
  return `${REPDB_MEDIA_CACHE_PREFIX}-${sourceCommit.slice(0, 12)}`;
}
