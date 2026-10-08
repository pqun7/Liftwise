import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { getRecoverySummary } from '../../features/workout/workoutService';

export function UpdatePrompt() {
  const [deferred, setDeferred] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [controllerUpdated, setControllerUpdated] = useState(false);
  const reloadWhenSafe = async () => {
    setControllerUpdated(true);
    try {
      if (await getRecoverySummary()) {
        setDeferred(true);
        return;
      }
      window.location.reload();
    } catch {
      setError('Update reload postponed: workout safety could not be verified.');
    }
  };
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onNeedReload: () => {
      void reloadWhenSafe();
    },
  });

  if (!needRefresh && !offlineReady && !controllerUpdated) {
    return null;
  }

  const dismiss = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
    setControllerUpdated(false);
  };

  const safelyUpdate = async () => {
    setBusy(true);
    setError(null);
    try {
      if (await getRecoverySummary()) {
        setDeferred(true);
        return;
      }
      if (controllerUpdated) await reloadWhenSafe();
      else await updateServiceWorker(true);
    } catch {
      setError(
        'Update postponed: workout safety could not be verified. Your current app remains open.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="update-prompt" role="status" aria-live="polite">
      <p>
        {deferred
          ? 'Update deferred until the active workout is finished or discarded.'
          : needRefresh || controllerUpdated
            ? 'A new Liftwise version is ready.'
            : 'Liftwise is ready offline.'}
      </p>
      <div>
        {needRefresh || controllerUpdated ? (
          <button
            className="ui-button ui-button-primary"
            type="button"
            disabled={busy}
            onClick={() => void safelyUpdate()}
          >
            Update
          </button>
        ) : null}
        <button
          className="button-secondary ui-button ui-button-secondary"
          type="button"
          onClick={dismiss}
        >
          Dismiss
        </button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
    </aside>
  );
}
