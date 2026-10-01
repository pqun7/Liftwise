import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { getRecoverySummary } from '../../features/workout/workoutService';

export function UpdatePrompt() {
  const [deferred, setDeferred] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh && !offlineReady) {
    return null;
  }

  const dismiss = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
  };

  const safelyUpdate = async () => {
    if (await getRecoverySummary()) {
      setDeferred(true);
      return;
    }
    await updateServiceWorker(true);
  };

  return (
    <aside className="update-prompt" role="status" aria-live="polite">
      <p>
        {deferred
          ? 'Update deferred until the active workout is finished or discarded.'
          : needRefresh
            ? 'A new Liftwise version is ready.'
            : 'Liftwise is ready offline.'}
      </p>
      <div>
        {needRefresh && !deferred ? (
          <button type="button" onClick={() => void safelyUpdate()}>
            Update
          </button>
        ) : null}
        <button className="button-secondary" type="button" onClick={dismiss}>
          Dismiss
        </button>
      </div>
    </aside>
  );
}
