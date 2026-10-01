import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { repdbCatalogArtifactSchema } from '../../src/data/providers/repdb/schema';
import { validateRepdbDataset } from '../../src/data/providers/repdb/validation';

export async function validateRepdbFile(path: string) {
  const raw = JSON.parse(await readFile(path, 'utf8')) as unknown;
  return validateRepdbDataset(raw);
}

async function run(): Promise<void> {
  const artifactMode = process.argv.includes('--artifact');
  const path = artifactMode
    ? resolve('public/repdb/catalog.json')
    : resolve(process.argv.at(-1) ?? 'work/repdb-upstream/exercises.json');
  const raw = JSON.parse(await readFile(path, 'utf8')) as unknown;

  if (artifactMode) {
    const artifact = repdbCatalogArtifactSchema.parse(raw);
    const ids = new Set(artifact.exercises.map((exercise) => exercise.id));
    if (ids.size !== artifact.exercises.length)
      throw new Error('Duplicate transformed exercise IDs.');
    process.stdout.write(
      `Verified RepDB artifact: ${artifact.exercises.length} exercises at ${artifact.metadata.sourceCommit}.\n`,
    );
    return;
  }

  const result = validateRepdbDataset(raw);
  process.stdout.write(
    `${JSON.stringify(
      {
        imported: result.summary.imported,
        skipped: result.summary.skipped,
        warnings: result.summary.warnings.length,
        errors: result.summary.errors.length,
      },
      null,
      2,
    )}\n`,
  );
  if (result.summary.errors.length > 0) {
    throw new Error(result.summary.errors.map((issue) => issue.message).join('\n'));
  }
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}`) {
  await run();
}
