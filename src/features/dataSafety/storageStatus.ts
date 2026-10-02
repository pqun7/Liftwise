export type StoragePersistence = 'granted' | 'not-granted' | 'unsupported' | 'unavailable';

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
      usage: validEstimate(estimate.usage),
      quota: validEstimate(estimate.quota),
      persistence: 'unsupported',
    };
  }
  let persisted: boolean | null = null;
  try {
    persisted = await storage.persisted();
  } catch {
    // Unavailable is not equivalent to an explicit denial.
  }
  return {
    usage: validEstimate(estimate.usage),
    quota: validEstimate(estimate.quota),
    persistence: persisted === null ? 'unavailable' : persisted ? 'granted' : 'not-granted',
  };
}

export async function requestStoragePersistence(
  storage: ProgressiveStorageManager | undefined = globalThis.navigator?.storage,
): Promise<StoragePersistence> {
  if (!storage?.persist) return 'unsupported';
  try {
    return (await storage.persist()) ? 'granted' : 'not-granted';
  } catch {
    return 'unavailable';
  }
}
function validEstimate(value: number | undefined): number | null {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : null;
}
