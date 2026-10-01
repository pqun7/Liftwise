export type StoragePersistence = 'granted' | 'not-granted' | 'unsupported';

export interface StorageStatus {
  usage: number | null;
  quota: number | null;
  persistence: StoragePersistence;
}

type ProgressiveStorageManager = Pick<StorageManager, 'estimate'> &
  Partial<Pick<StorageManager, 'persist' | 'persisted'>>;

export async function getStorageStatus(
  storage: ProgressiveStorageManager | undefined = globalThis.navigator?.storage,
): Promise<StorageStatus> {
  if (!storage) return { usage: null, quota: null, persistence: 'unsupported' };

  let estimate: StorageEstimate = {};
  try {
    estimate = await storage.estimate();
  } catch {
    // Storage estimates are optional and must not block the safety screen.
  }
  if (!storage.persisted) {
    return {
      usage: estimate.usage ?? null,
      quota: estimate.quota ?? null,
      persistence: 'unsupported',
    };
  }
  const persisted = await storage.persisted().catch(() => false);
  return {
    usage: estimate.usage ?? null,
    quota: estimate.quota ?? null,
    persistence: persisted ? 'granted' : 'not-granted',
  };
}

export async function requestStoragePersistence(
  storage: ProgressiveStorageManager | undefined = globalThis.navigator?.storage,
): Promise<StoragePersistence> {
  if (!storage?.persist) return 'unsupported';
  return (await storage.persist().catch(() => false)) ? 'granted' : 'not-granted';
}
