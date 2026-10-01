import 'fake-indexeddb/auto';

import { readFile, stat } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

import { repdbCatalogArtifactSchema } from '../../src/data/providers/repdb/schema';
import { seedRepdbCatalog } from '../../src/data/providers/repdb/seeder';
import { searchExercises } from '../../src/domain/exerciseSearch';
import { LiftwiseDatabase } from '../../src/lib/storage/database';

const artifactPath = new URL('../../public/repdb/catalog.json', import.meta.url);
const artifact = repdbCatalogArtifactSchema.parse(JSON.parse(await readFile(artifactPath, 'utf8')));
const databaseName = `liftwise-repdb-benchmark-${crypto.randomUUID()}`;
const database = new LiftwiseDatabase(databaseName);

const initializationStart = performance.now();
await seedRepdbCatalog(artifact, database);
const initializationMs = performance.now() - initializationStart;

const reloadStart = performance.now();
database.close();
const reloadedDatabase = new LiftwiseDatabase(databaseName);
const exercises = await reloadedDatabase.exercises.toArray();
const reloadMs = performance.now() - reloadStart;

const queries = ['bench', 'squat', 'row', 'press', 'curl'];
const searchStart = performance.now();
for (let iteration = 0; iteration < 1_000; iteration += 1) {
  searchExercises(exercises, queries[iteration % queries.length] ?? 'bench', {
    difficulty: iteration % 2 === 0 ? 'intermediate' : undefined,
  });
}
const searchTotalMs = performance.now() - searchStart;
const catalogBytes = (await stat(artifactPath)).size;

console.log(
  JSON.stringify(
    {
      environment: `${process.platform} ${process.arch}, Node ${process.version}`,
      exerciseCount: exercises.length,
      catalogBytes,
      initializationMs: Number(initializationMs.toFixed(2)),
      reloadMs: Number(reloadMs.toFixed(2)),
      searches: 1_000,
      searchTotalMs: Number(searchTotalMs.toFixed(2)),
      averageSearchMs: Number((searchTotalMs / 1_000).toFixed(3)),
      initialRenderedRows: 40,
    },
    null,
    2,
  ),
);

reloadedDatabase.close();
await reloadedDatabase.delete();
