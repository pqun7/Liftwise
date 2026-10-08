import { ContextBackLink } from '../../components/ContextBackLink';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { PageIntro } from '../../components/PageIntro';
import { Input } from '../../components/ui/FormControl';
import { backupService, type BackupPreview, type PreparedRestore } from './backupService';
import { createCsv } from './csv';
import { backupFilename, downloadTextFile } from './downloads';
import { getStorageStatus, requestStoragePersistence, type StorageStatus } from './storageStatus';

interface SafetySummary {
  health: Awaited<ReturnType<typeof backupService.audit>>;
  lastBackupAt: string | null;
  storage: StorageStatus;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return 'Unavailable';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function formatDate(value: string | null): string {
  if (value === null) return 'Never';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

function PreviewCounts({ preview }: Readonly<{ preview: BackupPreview }>) {
  const labels: [string, number][] = [
    ['Custom exercises', preview.counts.customExercises],
    ['Programs', preview.counts.programs],
    ['Program days', preview.counts.programDays],
    ['Prescriptions', preview.counts.programExercises],
    ['Workouts', preview.counts.workouts],
    ['Sets', preview.counts.sets],
    ['Body measurements', preview.counts.bodyMetrics],
  ];
  return (
    <dl className="safety-counts">
      {labels.map(([label, count]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{count}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DataSafetyPage() {
  const [summary, setSummary] = useState<SafetySummary | null>(null);
  const [prepared, setPrepared] = useState<PreparedRestore | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    const [health, lastBackupAt, storage] = await Promise.all([
      backupService.audit(),
      backupService.getLastBackupAt(),
      getStorageStatus(),
    ]);
    setSummary({ health, lastBackupAt, storage });
  }, []);

  useEffect(() => {
    void refresh().catch(() => setError('Data-safety status could not be loaded.'));
  }, [refresh]);

  const createBackup = async () => {
    setBusy(true);
    setError(null);
    try {
      const backup = await backupService.createBackup();
      downloadTextFile(
        backupService.serialize(backup),
        backupFilename(backup.createdAt),
        'application/json',
      );
      await backupService.recordBackup(backup.createdAt);
      setMessage('Backup created. Keep the downloaded file somewhere safe.');
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Backup creation failed.');
    } finally {
      setBusy(false);
    }
  };

  const exportCustomExercises = async () => {
    setBusy(true);
    setError(null);
    try {
      const backup = await backupService.createBackup();
      const csv = createCsv(
        [
          { header: 'Name', value: (exercise) => exercise.name },
          { header: 'Primary muscle', value: (exercise) => exercise.primaryMuscles[0] ?? '' },
          {
            header: 'Secondary muscles',
            value: (exercise) => exercise.secondaryMuscles.join('; '),
          },
          { header: 'Equipment', value: (exercise) => exercise.equipment },
          { header: 'Notes', value: (exercise) => exercise.notes },
        ],
        backup.data.customExercises,
      );
      downloadTextFile(
        csv,
        `liftwise-custom-exercises-${backup.createdAt.slice(0, 10)}.csv`,
        'text/csv',
      );
      setMessage('Custom exercise CSV created.');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'CSV export failed.');
    } finally {
      setBusy(false);
    }
  };

  const selectRestoreFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setPrepared(null);
    setConfirmed(false);
    try {
      setPrepared(await backupService.prepareRestore(await file.text()));
      setMessage('Backup validated. Review the preview before replacing current data.');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Backup validation failed.');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
      setBusy(false);
    }
  };

  const restore = async () => {
    if (!prepared || !confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await backupService.restore(prepared);
      setPrepared(null);
      setConfirmed(false);
      setMessage('Backup restored and verified.');
      await refresh();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? `${nextError.message} Existing data was left unchanged.`
          : 'Restore failed. Existing data was left unchanged.',
      );
    } finally {
      setBusy(false);
    }
  };

  const requestPersistence = async () => {
    setBusy(true);
    const persistence = await requestStoragePersistence();
    setSummary((current) =>
      current ? { ...current, storage: { ...current.storage, persistence } } : current,
    );
    setMessage(
      persistence === 'granted'
        ? 'Persistent storage was granted by this browser.'
        : persistence === 'unavailable'
          ? 'Storage persistence could not be checked. Backups remain important.'
          : 'Persistent storage was not granted. Backups remain important.',
    );
    setBusy(false);
  };

  const deleteData = async () => {
    if (deletePhrase !== 'DELETE') return;
    setBusy(true);
    setError(null);
    try {
      await backupService.deleteAllUserData();
      setDeletePhrase('');
      setPrepared(null);
      setMessage(
        'Your Liftwise user data was deleted. Downloaded exercise images were not changed.',
      );
      await refresh();
      await navigate('/settings/data-safety', { replace: true });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'User data could not be deleted.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="page-stack" aria-labelledby="data-safety-title">
      <ContextBackLink fallback="/settings" label="Settings" />
      <PageIntro
        titleId="data-safety-title"
        eyebrow="Data safety"
        title="Keep your training data recoverable"
        description="Backups stay on files you control. Liftwise never uploads them."
      />

      {message ? (
        <p className="success-message" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="settings-card ui-card" aria-labelledby="health-title">
        <p className="section-kicker">Local database</p>
        <h2 id="health-title">Status</h2>
        {summary ? (
          <dl className="safety-status-list">
            <div>
              <dt>Database health</dt>
              <dd>{summary.health.status === 'healthy' ? 'Healthy' : 'Attention required'}</dd>
            </div>
            <div>
              <dt>Last backup</dt>
              <dd>{formatDate(summary.lastBackupAt)}</dd>
            </div>
            <div>
              <dt>Local storage</dt>
              <dd>
                {formatBytes(summary.storage.usage)} used
                {summary.storage.quota === null
                  ? ''
                  : ` of approximately ${formatBytes(summary.storage.quota)}`}
              </dd>
            </div>
            <div>
              <dt>Storage persistence</dt>
              <dd>
                {summary.storage.persistence === 'granted'
                  ? 'Granted'
                  : summary.storage.persistence === 'unavailable'
                    ? 'Unavailable'
                    : summary.storage.persistence === 'not-granted'
                      ? 'Not granted'
                      : 'Unsupported'}
              </dd>
            </div>
          </dl>
        ) : (
          <p role="status">Checking local data…</p>
        )}
        {summary?.health.issues.map((issue) => (
          <p className="form-error" key={issue}>
            {issue}
          </p>
        ))}
        {summary?.storage.persistence === 'not-granted' ? (
          <button
            className="button-secondary ui-button ui-button-secondary"
            type="button"
            disabled={busy}
            onClick={() => void requestPersistence()}
          >
            Request persistent storage
          </button>
        ) : null}
        <p className="storage-note">
          Browser storage is managed by the device. Persistence reduces eviction risk but cannot
          guarantee permanent iPhone storage.
        </p>
      </section>

      <section className="settings-card ui-card" aria-labelledby="backup-title">
        <p className="section-kicker">Backup</p>
        <h2 id="backup-title">Create a portable backup</h2>
        <p>
          Includes user-created exercises, programs, settings, measurements, and existing workout
          records. RepDB catalog data and images are excluded.
        </p>
        <div className="settings-actions">
          <button
            className="primary-action ui-button ui-button-primary ui-button-large"
            type="button"
            disabled={busy}
            onClick={() => void createBackup()}
          >
            Create Backup
          </button>
          <button
            className="button-secondary ui-button ui-button-secondary"
            type="button"
            disabled={busy}
            onClick={() => void exportCustomExercises()}
          >
            Export custom exercises CSV
          </button>
        </div>
      </section>

      <section className="settings-card ui-card" aria-labelledby="restore-title">
        <p className="section-kicker">Restore</p>
        <h2 id="restore-title">Validate before replacing</h2>
        <p>
          Liftwise checks the file, checksum, compatibility, records, and relationships before
          current data can be changed.
        </p>
        <label className="file-action ui-button ui-button-primary">
          <span>Restore Backup</span>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            disabled={busy}
            onChange={(event) => void selectRestoreFile(event.target.files?.[0])}
          />
        </label>
        {prepared ? (
          <div className="restore-preview" aria-labelledby="preview-title">
            <h3 id="preview-title">Liftwise Backup</h3>
            <p>Created: {formatDate(prepared.preview.createdAt)}</p>
            <PreviewCounts preview={prepared.preview} />
            {prepared.preview.unresolvedExerciseIds.length > 0 ? (
              <div className="warning-message" role="status">
                <strong>
                  {prepared.preview.unresolvedExerciseIds.length} unresolved RepDB reference(s)
                </strong>
                <p>
                  The program/workout structure will be preserved. Exercise details will become
                  available if that provider record returns.
                </p>
              </div>
            ) : null}
            <p className="storage-note">
              No existing data will be changed until you confirm Restore.
            </p>
            <button
              className="button-secondary ui-button ui-button-secondary"
              type="button"
              disabled={busy}
              onClick={() => void createBackup()}
            >
              Download current data first
            </button>
            <label className="confirmation-row">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span>Replace my current Liftwise user data with this validated backup.</span>
            </label>
            <button
              className="danger-action ui-button ui-button-danger"
              type="button"
              disabled={busy || !confirmed}
              onClick={() => void restore()}
            >
              Restore and Replace Current User Data
            </button>
          </div>
        ) : null}
      </section>

      <section className="settings-card ui-card" aria-labelledby="media-title">
        <p className="section-kicker">Downloaded media</p>
        <h2 id="media-title">Exercise images are separate</h2>
        <p>
          Clearing downloaded illustrations never removes programs, custom exercises, workouts,
          settings, or measurements.
        </p>
        <Link className="compact-link ui-button ui-button-primary" to="/settings#offline-data">
          Manage Offline Exercise Images
        </Link>
      </section>

      <section className="settings-card ui-card danger-zone" aria-labelledby="delete-title">
        <p className="section-kicker">Danger zone</p>
        <h2 id="delete-title">Delete My Liftwise Data</h2>
        <p>
          This permanently deletes user-owned records on this device. RepDB catalog data and
          downloaded exercise images remain separate.
        </p>
        <label className="delete-confirmation">
          <span>Type DELETE to confirm</span>
          <Input
            value={deletePhrase}
            onChange={(event) => setDeletePhrase(event.target.value)}
            autoComplete="off"
          />
        </label>
        <button
          className="danger-action ui-button ui-button-danger"
          type="button"
          disabled={busy || deletePhrase !== 'DELETE'}
          onClick={() => void deleteData()}
        >
          Delete My Liftwise Data
        </button>
      </section>
    </section>
  );
}
