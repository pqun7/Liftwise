import { useEffect, useState } from 'react';

import {
  clearExerciseMedia,
  downloadExerciseMedia,
  getCachedExerciseMediaCount,
  getExerciseMediaPaths,
  type MediaDownloadProgress,
} from '../../data/providers/repdb/mediaCache';
import { listCatalogExercises } from '../exercises/exerciseService';

type OfflineState =
  | { kind: 'loading' }
  | { kind: 'ready'; cached: number; total: number }
  | { kind: 'downloading'; progress: MediaDownloadProgress }
  | { kind: 'error'; message: string; cached: number; total: number };

export function OfflineExerciseData() {
  const [state, setState] = useState<OfflineState>({ kind: 'loading' });
  const [paths, setPaths] = useState<string[]>([]);

  const refresh = async () => {
    const exercises = await listCatalogExercises();
    const mediaPaths = getExerciseMediaPaths(exercises.filter((exercise) => exercise.isActive));
    const cached = await getCachedExerciseMediaCount();
    setPaths(mediaPaths);
    setState({ kind: 'ready', cached, total: mediaPaths.length });
  };

  useEffect(() => {
    void refresh().catch(() => {
      setState({
        kind: 'error',
        message: 'Offline exercise-image status is unavailable.',
        cached: 0,
        total: 0,
      });
    });
  }, []);

  const download = async () => {
    setState({ kind: 'downloading', progress: { completed: 0, total: paths.length, failed: 0 } });
    try {
      const progress = await downloadExerciseMedia(paths, (next) => {
        setState({ kind: 'downloading', progress: next });
      });
      setState({ kind: 'ready', cached: progress.completed, total: progress.total });
    } catch (error) {
      setState({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'Exercise images could not be downloaded.',
        cached: await getCachedExerciseMediaCount().catch(() => 0),
        total: paths.length,
      });
    }
  };

  const clear = async () => {
    try {
      await clearExerciseMedia();
      setState({ kind: 'ready', cached: 0, total: paths.length });
    } catch {
      setState({
        kind: 'error',
        message: 'Cached exercise images could not be cleared.',
        cached: await getCachedExerciseMediaCount(),
        total: paths.length,
      });
    }
  };

  const progress = state.kind === 'downloading' ? state.progress : null;
  const cached = state.kind === 'ready' || state.kind === 'error' ? state.cached : 0;
  const total = state.kind === 'ready' || state.kind === 'error' ? state.total : paths.length;
  const complete = total > 0 && cached >= total;

  return (
    <section id="offline-data" className="settings-card" aria-labelledby="offline-data-title">
      <div>
        <p className="section-kicker">Offline data</p>
        <h2 id="offline-data-title">Exercise images</h2>
        <p>Catalog text is always offline. Download illustrations for fully offline browsing.</p>
      </div>
      {state.kind === 'loading' ? <p role="status">Checking storage…</p> : null}
      {progress ? (
        <div className="download-progress" role="status" aria-live="polite">
          <progress value={progress.completed + progress.failed} max={progress.total} />
          <span>
            {progress.completed + progress.failed} of {progress.total} checked
          </span>
        </div>
      ) : null}
      {state.kind === 'ready' ? (
        <p className="download-status">
          {complete
            ? 'All exercise images are available offline.'
            : `${cached} of ${total} cached.`}
        </p>
      ) : null}
      {state.kind === 'error' ? (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="settings-actions">
        <button
          className="primary-action"
          type="button"
          disabled={state.kind === 'loading' || state.kind === 'downloading' || complete}
          onClick={() => void download()}
        >
          {state.kind === 'downloading'
            ? 'Downloading…'
            : complete
              ? 'Downloaded'
              : 'Download exercise images'}
        </button>
        <button
          className="button-secondary"
          type="button"
          disabled={state.kind === 'downloading' || cached === 0}
          onClick={() => void clear()}
        >
          Clear offline exercise images
        </button>
      </div>
      <p className="storage-note">
        Clearing images never removes custom exercises, programs, workouts, or body metrics.
      </p>
    </section>
  );
}
