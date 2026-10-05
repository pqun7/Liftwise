import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { SaveQueue } from '../../lib/storage/SaveQueue';

/** Writes begin on input and remain ordered even if the editor unmounts. */
export function useProgramAutosave(onSaved: () => void) {
  const [queue] = useState(() => new SaveQueue());
  const revision = useSyncExternalStore(queue.subscribe, queue.snapshot, queue.snapshot);
  const saved = useRef(onSaved);
  saved.current = onSaved;
  useEffect(() => {
    if (revision && !queue.unsettled) saved.current();
  }, [queue, revision]);
  return {
    pending: queue.pending > 0,
    error: queue.error,
    unsettled: queue.unsettled,
    save: (key: string, action: () => Promise<unknown>) => {
      void queue.save(key, action).catch(() => {});
    },
    retry: () => {
      void queue.retry().catch(() => {});
    },
    flush: () => queue.flush(),
  };
}
