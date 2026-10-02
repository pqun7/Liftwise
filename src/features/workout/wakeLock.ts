export interface ScreenLock {
  release: () => Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}
export type WakeState = 'held' | 'inactive' | 'unsupported' | 'denied';
export function manageScreenLock(
  request: (() => Promise<ScreenLock>) | undefined,
  visibility: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>,
  report: (state: WakeState) => void,
): () => void {
  let stopped = false;
  let pending = false;
  let lock: ScreenLock | null = null;
  const release = () => {
    const previous = lock;
    lock = null;
    if (previous) void previous.release().catch(() => undefined);
  };
  const acquire = async () => {
    if (stopped || visibility.visibilityState !== 'visible' || pending || lock) return;
    if (!request) {
      report('unsupported');
      return;
    }
    pending = true;
    try {
      const next = await request();
      if (stopped || visibility.visibilityState !== 'visible') {
        await next.release();
        return;
      }
      lock = next;
      next.addEventListener('release', () => {
        if (lock !== next) return;
        lock = null;
        if (!stopped) report('inactive');
      });
      report('held');
    } catch {
      if (!stopped) report('denied');
    } finally {
      pending = false;
    }
  };
  const changed = () => {
    if (visibility.visibilityState === 'visible') void acquire();
    else {
      release();
      report('inactive');
    }
  };
  visibility.addEventListener('visibilitychange', changed);
  void acquire();
  return () => {
    stopped = true;
    visibility.removeEventListener('visibilitychange', changed);
    release();
  };
}
