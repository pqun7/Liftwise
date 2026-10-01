import type { Exercise } from '../../../domain/entities';
import { getRepdbMediaCacheName, REPDB_MEDIA_CACHE_PREFIX, REPDB_SOURCE_COMMIT } from './config';

export interface MediaDownloadProgress {
  completed: number;
  total: number;
  failed: number;
}

export function getExerciseMediaPaths(exercises: readonly Exercise[]): string[] {
  const paths = new Set<string>();
  for (const exercise of exercises) {
    for (const image of [exercise.images.start, exercise.images.peak, exercise.images.main]) {
      if (image) paths.add(image.path);
    }
  }
  return [...paths].sort();
}

export async function getCachedExerciseMediaCount(
  sourceCommit = REPDB_SOURCE_COMMIT,
): Promise<number> {
  if (!('caches' in globalThis)) return 0;
  const cache = await caches.open(getRepdbMediaCacheName(sourceCommit));
  return (await cache.keys()).length;
}

export async function downloadExerciseMedia(
  paths: readonly string[],
  onProgress: (progress: MediaDownloadProgress) => void,
  sourceCommit = REPDB_SOURCE_COMMIT,
): Promise<MediaDownloadProgress> {
  if (!('caches' in globalThis)) {
    throw new Error('Offline media storage is not available in this browser.');
  }

  const cache = await caches.open(getRepdbMediaCacheName(sourceCommit));
  let completed = 0;
  let failed = 0;
  const total = paths.length;

  for (let index = 0; index < paths.length; index += 4) {
    const batch = paths.slice(index, index + 4);
    await Promise.all(
      batch.map(async (path) => {
        try {
          const request = new Request(path, { credentials: 'same-origin' });
          if (!(await cache.match(request))) {
            const response = await fetch(request);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            await cache.put(request, response.clone());
          }
          completed += 1;
        } catch {
          failed += 1;
        } finally {
          onProgress({ completed, total, failed });
        }
      }),
    );
  }

  const result = { completed, total, failed };
  if (failed > 0) {
    throw new Error(
      `${failed} exercise image${failed === 1 ? '' : 's'} could not be downloaded. Retry when online.`,
    );
  }
  return result;
}

export async function clearExerciseMedia(): Promise<number> {
  if (!('caches' in globalThis)) return 0;
  const cacheNames = await caches.keys();
  const matching = cacheNames.filter((name) => name.startsWith(REPDB_MEDIA_CACHE_PREFIX));
  const results = await Promise.all(matching.map((name) => caches.delete(name)));
  return results.filter(Boolean).length;
}
