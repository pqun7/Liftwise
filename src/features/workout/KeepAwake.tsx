import { useEffect, useState } from 'react';
import { appSettingsRepository } from '../../lib/storage/repositories/appSettingsRepository';
import { manageScreenLock, type WakeState } from './wakeLock';

export function KeepAwake({ active }: Readonly<{ active: boolean }>) {
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<WakeState>('inactive');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    void appSettingsRepository
      .get('keepScreenAwake')
      .then((setting) => {
        if (mounted) setEnabled(setting?.value === true);
      })
      .catch(() => {
        if (mounted) setError('Screen preference unavailable. Training can continue.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (!enabled || !active) return;
    const request = navigator.wakeLock ? () => navigator.wakeLock.request('screen') : undefined;
    return manageScreenLock(request, document, setState);
  }, [active, enabled]);
  return (
    <div className="keep-awake">
      <label>
        <input
          type="checkbox"
          checked={enabled}
          disabled={busy || loading}
          onChange={(event) => {
            const next = event.target.checked;
            const previous = enabled;
            setEnabled(next);
            setBusy(true);
            setError(null);
            void appSettingsRepository
              .set('keepScreenAwake', next)
              .catch(() => {
                setEnabled(previous);
                setError('Preference could not be saved. Training can continue.');
              })
              .finally(() => setBusy(false));
          }}
        />{' '}
        Keep screen awake while training
      </label>
      <small role="status">
        {error ??
          (!enabled || !active
            ? 'Optional; only while this active workout is visible.'
            : state === 'held'
              ? 'Screen awake requested. The device may still release it.'
              : state === 'unsupported'
                ? 'Not supported here. Training is unaffected.'
                : state === 'denied'
                  ? 'Screen awake unavailable or denied. Training is unaffected.'
                  : 'Screen awake not currently held.')}
      </small>
    </div>
  );
}
