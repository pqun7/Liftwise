import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
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

  return (
    <aside className="update-prompt" role="status" aria-live="polite">
      <p>{needRefresh ? 'A new Liftwise version is ready.' : 'Liftwise is ready offline.'}</p>
      <div>
        {needRefresh ? (
          <button type="button" onClick={() => void updateServiceWorker(true)}>
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
