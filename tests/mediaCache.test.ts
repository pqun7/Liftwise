import { afterEach, describe, expect, it, vi } from 'vitest';

import { downloadExerciseMedia } from '../src/data/providers/repdb/mediaCache';

function createCacheStorage() {
  const entries = new Map<string, Response>();
  const cache = {
    keys: vi.fn(() => Promise.resolve([...entries.keys()].map((url) => new Request(url)))),
    match: vi.fn((request: Request) => Promise.resolve(entries.get(request.url))),
    put: vi.fn((request: Request, response: Response) => {
      entries.set(request.url, response);
      return Promise.resolve();
    }),
  };
  return {
    entries,
    storage: {
      open: vi.fn(() => Promise.resolve(cache)),
      keys: vi.fn(() => Promise.resolve([])),
      delete: vi.fn(() => Promise.resolve(true)),
    },
  };
}

describe('offline exercise media', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('caches image responses and reports successful progress', async () => {
    const { entries, storage } = createCacheStorage();
    vi.stubGlobal('caches', storage);
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response('webp', { headers: { 'content-type': 'image/webp' } })),
      ),
    );
    const updates: number[] = [];

    const result = await downloadExerciseMedia(
      ['/repdb-media/flat/one.webp', '/repdb-media/flat/two.webp'],
      ({ completed }) => updates.push(completed),
    );

    expect(result).toEqual({ completed: 2, total: 2, failed: 0 });
    expect(entries.size).toBe(2);
    expect(updates.at(-1)).toBe(2);
  });

  it('rejects a fallback HTML page instead of caching it as an image', async () => {
    const { entries, storage } = createCacheStorage();
    vi.stubGlobal('caches', storage);
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response('<html>not found</html>', { headers: { 'content-type': 'text/html' } }),
        ),
      ),
    );

    await expect(
      downloadExerciseMedia(['/repdb-media/flat/missing.webp'], () => undefined),
    ).rejects.toThrow('1 of 1 exercise image could not be downloaded');
    expect(entries.size).toBe(0);
  });
});
