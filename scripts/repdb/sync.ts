import { execFile } from 'node:child_process';
import { cp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  REPDB_EXPECTED_SCHEMA_VERSION,
  REPDB_PROVIDER,
  REPDB_SOURCE_COMMIT,
  REPDB_SOURCE_COMMIT_DATE,
  REPDB_SOURCE_REPOSITORY,
} from '../../src/data/providers/repdb/config';
import { validateRepdbFile } from './validate';
import { transformRepdbDataset } from './transform';

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const upstreamDirectory = join(root, 'work', 'repdb-upstream');
const sourceJsonPath = join(upstreamDirectory, 'exercises.json');
const artifactPath = join(root, 'public', 'repdb', 'catalog.json');
const mediaOutput = join(root, 'public', 'repdb-media', 'flat');

async function runGit(args: string[]): Promise<string> {
  const result = await execFileAsync('git', args, { cwd: root });
  return result.stdout.trim();
}

async function preparePinnedSource(): Promise<void> {
  try {
    await stat(join(upstreamDirectory, '.git'));
    await runGit(['-C', upstreamDirectory, 'fetch', '--depth', '1', 'origin', REPDB_SOURCE_COMMIT]);
  } catch {
    await mkdir(dirname(upstreamDirectory), { recursive: true });
    await runGit(['clone', '--no-checkout', REPDB_SOURCE_REPOSITORY, upstreamDirectory]);
    await runGit(['-C', upstreamDirectory, 'fetch', '--depth', '1', 'origin', REPDB_SOURCE_COMMIT]);
  }
  await runGit(['-C', upstreamDirectory, 'checkout', '--detach', '--force', REPDB_SOURCE_COMMIT]);
  const actualCommit = await runGit(['-C', upstreamDirectory, 'rev-parse', 'HEAD']);
  if (actualCommit !== REPDB_SOURCE_COMMIT) {
    throw new Error(`Expected RepDB ${REPDB_SOURCE_COMMIT}, received ${actualCommit}.`);
  }
}

function referencedMediaPaths(dataset: Awaited<ReturnType<typeof validateRepdbFile>>): string[] {
  const paths = new Set<string>();
  for (const exercise of dataset.exercises) {
    const images = exercise.images.flat;
    if ('main' in images) paths.add(images.main);
    else {
      paths.add(images.start);
      paths.add(images.peak);
    }
  }
  return [...paths].sort();
}

async function verifyMedia(paths: readonly string[]): Promise<{ count: number; bytes: number }> {
  const sizes = await Promise.all(
    paths.map(async (path) => {
      try {
        return await stat(join(upstreamDirectory, path));
      } catch {
        throw new Error(`RepDB image is missing: ${path}`);
      }
    }),
  );
  return { count: paths.length, bytes: sizes.reduce((total, file) => total + file.size, 0) };
}

async function syncMedia(paths: readonly string[]): Promise<void> {
  const allowedRoot = join(root, 'public', 'repdb-media');
  if (!mediaOutput.startsWith(allowedRoot)) throw new Error('Unsafe RepDB media output path.');
  await rm(allowedRoot, { recursive: true, force: true });
  await mkdir(mediaOutput, { recursive: true });
  await Promise.all(
    paths.map((path) => cp(join(upstreamDirectory, path), join(mediaOutput, basename(path)))),
  );
}

async function main(): Promise<void> {
  await preparePinnedSource();

  const [dataset, sourceStats] = await Promise.all([
    validateRepdbFile(sourceJsonPath),
    stat(sourceJsonPath),
  ]);
  if (dataset.schemaVersion !== REPDB_EXPECTED_SCHEMA_VERSION) {
    throw new Error(
      `Expected RepDB schema ${REPDB_EXPECTED_SCHEMA_VERSION}, received ${dataset.schemaVersion}.`,
    );
  }
  if (dataset.summary.errors.length > 0) {
    throw new Error(dataset.summary.errors.map((issue) => issue.message).join('\n'));
  }
  const mediaPaths = referencedMediaPaths(dataset);
  const media = await verifyMedia(mediaPaths);

  await mkdir(dirname(artifactPath), { recursive: true });
  const artifact = await transformRepdbDataset(dataset, {
    outputPath: artifactPath,
    metadata: {
      provider: REPDB_PROVIDER,
      sourceRepository: REPDB_SOURCE_REPOSITORY,
      sourceCommit: REPDB_SOURCE_COMMIT,
      schemaVersion: dataset.schemaVersion,
      importedAt: REPDB_SOURCE_COMMIT_DATE,
      exerciseCount: dataset.exercises.length,
      sourceJsonBytes: sourceStats.size,
      mediaFileCount: media.count,
      mediaBytes: media.bytes,
    },
  });

  if (process.argv.includes('--with-media')) await syncMedia(mediaPaths);

  const artifactBytes = (await readFile(artifactPath)).byteLength;
  process.stdout.write(
    `${JSON.stringify(
      {
        provider: artifact.metadata.provider,
        sourceCommit: artifact.metadata.sourceCommit,
        imported: dataset.summary.imported,
        skipped: dataset.summary.skipped,
        warnings: dataset.summary.warnings.length,
        errors: dataset.summary.errors.length,
        sourceJsonBytes: sourceStats.size,
        artifactBytes,
        mediaFiles: media.count,
        mediaBytes: media.bytes,
        mediaCopied: process.argv.includes('--with-media'),
      },
      null,
      2,
    )}\n`,
  );
}

await main();
