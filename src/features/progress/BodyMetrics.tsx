import { useState } from 'react';
import type { BodyMetric } from '../../domain/entities';
import { bodyMetricRepository } from '../../lib/storage/repositories/bodyMetricRepository';

const fields = [
  { key: 'weight', label: 'Weight (kg)' },
  { key: 'bodyFatPercentage', label: 'Body fat (%)' },
  { key: 'waistCm', label: 'Waist (cm)' },
  { key: 'chestCm', label: 'Chest (cm)' },
  { key: 'armsCm', label: 'Arms (cm)' },
  { key: 'legsCm', label: 'Legs (cm)' },
] as const;
function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function formText(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
}
export function BodyMetrics({
  entries,
  refresh,
}: Readonly<{ entries: BodyMetric[]; refresh: () => Promise<void> }>) {
  const [editing, setEditing] = useState<BodyMetric | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (form: HTMLFormElement) => {
    setBusy(true);
    setError(null);
    try {
      const data = new FormData(form);
      const values = Object.fromEntries(
        fields.map(({ key }) => [
          key,
          formText(data, key) === '' ? null : Number(formText(data, key)),
        ]),
      );
      const input = {
        ...values,
        measuredAt: new Date(`${formText(data, 'date')}T12:00:00`).toISOString(),
        notes: formText(data, 'notes') || null,
      };
      if (editing) await bodyMetricRepository.update(editing.id, input);
      else await bodyMetricRepository.create(input);
      form.reset();
      setEditing(null);
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Measurement could not be saved.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-labelledby="body-title">
      <h2 id="body-title">Body measurements</h2>
      <p>
        Optional. Weight is kg; circumferences are cm. Use the same measurement method each time.
      </p>
      <form
        key={editing?.id ?? 'new'}
        className="exercise-form"
        onSubmit={(event) => {
          event.preventDefault();
          void save(event.currentTarget);
        }}
      >
        <label>
          Date
          <input
            name="date"
            type="date"
            required
            defaultValue={localDate(editing ? new Date(editing.measuredAt) : new Date())}
          />
        </label>
        <div className="filter-grid">
          {fields.map(({ key, label }) => (
            <label key={key}>
              {label}
              <input name={key} inputMode="decimal" defaultValue={editing?.[key] ?? ''} />
            </label>
          ))}
        </div>
        <label>
          Measurement notes
          <textarea name="notes" defaultValue={editing?.notes ?? ''} />
        </label>
        {error ? (
          <p role="alert" className="form-error">
            {error}
          </p>
        ) : null}
        <button disabled={busy} className="primary-action" type="submit">
          {editing ? 'Save measurement' : 'Add measurement'}
        </button>
        {editing ? (
          <button type="button" onClick={() => setEditing(null)}>
            Cancel edit
          </button>
        ) : null}
      </form>
      <ul className="progress-history">
        {entries.map((entry) => (
          <li key={entry.id}>
            <p>
              {new Date(entry.measuredAt).toLocaleDateString()} —{' '}
              {fields
                .filter(({ key }) => entry[key] !== null && entry[key] !== undefined)
                .map(({ key, label }) => `${label}: ${entry[key]}`)
                .join(' · ')}
            </p>
            <div className="row-actions">
              <button type="button" disabled={busy} onClick={() => setEditing(entry)}>
                Edit measurement
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm('Delete this body measurement?')) return;
                  setBusy(true);
                  setError(null);
                  void bodyMetricRepository
                    .delete(entry.id)
                    .then(async () => {
                      if (editing?.id === entry.id) setEditing(null);
                      await refresh();
                    })
                    .catch(() => setError('Measurement could not be deleted.'))
                    .finally(() => setBusy(false));
                }}
              >
                Delete measurement
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
