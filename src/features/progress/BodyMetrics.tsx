import { number } from './format';
import { useState } from 'react';
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Info,
  PlusCircle,
  Ruler,
  Scale,
  UserRound,
  X,
} from 'lucide-react';
import { useLoaderData, useRevalidator } from 'react-router-dom';
import { MobilePage } from '../../components/layout/MobilePage';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/FormControl';
import type { BodyMetric } from '../../domain/entities';
import { rangeStart } from '../../domain/analytics';
import { bodyMetricRepository } from '../../lib/storage/repositories/bodyMetricRepository';
import type { bodyMeasurementsLoader } from './loaders';
import { focus, ProgressHeader, progressLayout, surface } from './ProgressUI';
const fields = [
  { key: 'weight', label: 'Weight (kg)', unit: 'kg', icon: Scale },
  { key: 'bodyFatPercentage', label: 'Body Fat (%)', unit: '%', icon: Activity },
  { key: 'waistCm', label: 'Waist (cm)', unit: 'cm', icon: Ruler },
  { key: 'chestCm', label: 'Chest (cm)', unit: 'cm', icon: UserRound },
  { key: 'armsCm', label: 'Arms (cm)', unit: 'cm', icon: Ruler },
  { key: 'legsCm', label: 'Legs (cm)', unit: 'cm', icon: Ruler },
] as const;
function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function formText(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2)
    return <span className="type-caption text-muted">More entries needed</span>;
  const min = Math.min(...values),
    spread = Math.max(...values) - min || 1;
  const points = values
    .map((value, i) => `${(i / (values.length - 1)) * 80},${26 - ((value - min) / spread) * 23}`)
    .join(' ');
  return (
    <svg className="h-6 w-[72px] shrink-0" viewBox="0 0 80 30" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="var(--mint)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function BodyMeasurementsPage() {
  const { bodyMetrics } = useLoaderData<Awaited<ReturnType<typeof bodyMeasurementsLoader>>>();
  const revalidator = useRevalidator();
  return (
    <MobilePage className={progressLayout}>
      <ProgressHeader
        title="Body Measurements"
        description="Track your body metrics over time. All data stays on your device."
      />
      <BodyMetrics
        entries={bodyMetrics}
        refresh={async () => {
          await revalidator.revalidate();
        }}
      />
    </MobilePage>
  );
}
export function BodyMetrics({
  entries,
  refresh,
}: Readonly<{ entries: BodyMetric[]; refresh: () => Promise<void> }>) {
  const [selected, setSelected] = useState<string | null>(null),
    [editing, setEditing] = useState<BodyMetric | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [message, setMessage] = useState<string | null>(null),
    [info, setInfo] = useState(true),
    [deleting, setDeleting] = useState<string | null>(null);
  const index = Math.max(
      0,
      entries.findIndex((entry) => entry.id === selected),
    ),
    current = entries[index];
  const date = current ? new Date(current.measuredAt) : new Date();
  const start = rangeStart('3M', date);
  const history = entries
    .filter(
      (entry) =>
        entry.measuredAt >= start &&
        entry.measuredAt <= (current?.measuredAt ?? date.toISOString()),
    )
    .reverse();
  async function save(form: HTMLFormElement) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = new FormData(form);
      const values = Object.fromEntries(
        fields.map(({ key }) => {
          const text = formText(data, key);
          return [key, text === '' ? null : Number(text)];
        }),
      );
      const input = {
        ...values,
        measuredAt: new Date(`${formText(data, 'date')}T12:00:00`).toISOString(),
        notes: formText(data, 'notes') || null,
      };
      const entry = editing
        ? await bodyMetricRepository.update(editing.id, input)
        : await bodyMetricRepository.create(input);
      form.reset();
      setEditing(null);
      setSelected(entry.id);
      await refresh();
      setMessage('Measurement saved on this device.');
    } catch {
      setError(
        'Could not save. Enter at least one valid measurement. Weight and circumferences must be positive; body fat must be 0–100%. Your saved data is unchanged.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      await bodyMetricRepository.delete(id);
      if (editing?.id === id) setEditing(null);
      setSelected(null);
      setDeleting(null);
      await refresh();
      setMessage('Measurement deleted.');
    } catch {
      setError('Measurement could not be deleted. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="grid gap-3" aria-label="Body measurements">
      <div className={`${surface} flex items-center justify-between px-1`}>
        <button
          type="button"
          aria-label="Previous measurement"
          disabled={!current || index >= entries.length - 1}
          onClick={() => setSelected(entries[index + 1]!.id)}
          className={`${focus} flex size-11 items-center justify-center rounded-xl disabled:opacity-30`}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays size={17} />
          {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <button
          type="button"
          aria-label="Next measurement"
          disabled={index === 0}
          onClick={() => setSelected(entries[index - 1]!.id)}
          className={`${focus} flex size-11 items-center justify-center rounded-xl disabled:opacity-30`}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold">Trends</h2>
          <span className="text-xs text-secondary">Last 3 months</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {fields.slice(0, 4).map(({ key, label, unit, icon: Icon }) => {
            const values = history.flatMap((entry) => (entry[key] == null ? [] : [entry[key]]));
            const delta =
              current?.[key] != null && values.length > 1 ? current[key] - values[0]! : null;
            return (
              <div key={key} className={`${surface} p-2`}>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-mint/10 p-1 text-mint">
                    <Icon size={16} />
                  </span>
                  <h3 className="type-caption font-medium">{label}</h3>
                </div>
                <p className="mt-1! type-metric-md">
                  {number(current?.[key])}
                  {current?.[key] != null ? ` ${unit}` : ''}
                </p>
                <div className="mt-1 flex min-h-6 items-center justify-between gap-1">
                  <span className="type-caption font-semibold text-secondary">
                    {delta === null
                      ? 'No comparison'
                      : `${delta > 0 ? '+' : ''}${number(delta)} ${unit}`}
                  </span>
                  <Sparkline values={values} />
                </div>
              </div>
            );
          })}
        </div>
        {!current && <p className="mt-2! text-xs text-secondary">No measurements recorded yet.</p>}
      </div>
      {info && (
        <div className={`${surface} flex items-start gap-2 p-3`}>
          <Info className="shrink-0 text-mint" size={22} />
          <div>
            <h2 className="text-xs font-semibold">Measurement units and method</h2>
            <p className="mt-1! type-caption text-secondary">
              Weight is in kilograms (kg); circumferences are in centimeters (cm). Use the same
              method each time for useful comparisons.
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss measurement guidance"
            onClick={() => setInfo(false)}
            className={`${focus} -m-2 flex size-11 shrink-0 items-center justify-center text-secondary`}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <form
        key={editing?.id ?? 'new'}
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void save(event.currentTarget);
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold">
            {editing ? 'Edit Measurement' : 'Add New Measurement'}
          </h2>
          <label className="w-[145px] shrink-0 text-secondary">
            <span className="sr-only">Date</span>
            <Input
              name="date"
              type="date"
              required
              defaultValue={localDate(editing ? new Date(editing.measuredAt) : new Date())}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {fields.map(({ key, label, icon: Icon }) => (
            <label
              key={key}
              className={`${surface} flex min-h-[50px] items-center gap-2 px-2.5 py-1`}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-secondary">
                <Icon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block type-caption text-secondary">{label}</span>
                <input
                  name={key}
                  aria-label={label}
                  type="number"
                  step="any"
                  min={key === 'bodyFatPercentage' ? 0 : 0.01}
                  max={key === 'bodyFatPercentage' ? 100 : undefined}
                  inputMode="decimal"
                  defaultValue={editing?.[key] ?? ''}
                  className={`${focus} min-h-6 w-full min-w-0 rounded-sm border-0 bg-transparent p-0 text-base font-semibold text-primary`}
                />
              </span>
            </label>
          ))}
        </div>
        <label className="grid gap-1 text-xs text-secondary">
          Notes (optional)
          <Input
            name="notes"
            defaultValue={editing?.notes ?? ''}
            placeholder="e.g. morning, fasted, same conditions..."
          />
        </label>
        {error && (
          <p role="alert" className="text-xs text-red-300">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-xs text-mint">
            {message}
          </p>
        )}
        <Button variant="primary" type="submit" disabled={busy} className="w-full">
          <PlusCircle size={17} />
          {busy ? 'Saving…' : editing ? 'Save Measurement' : 'Add Measurement'}
        </Button>
        {editing && (
          <Button onClick={() => setEditing(null)} disabled={busy}>
            Cancel edit
          </Button>
        )}
      </form>
      {!!entries.length && (
        <details className={`${surface} p-3`}>
          <summary
            className={`${focus} flex min-h-11 cursor-pointer items-center text-sm font-semibold`}
          >
            Saved measurements ({entries.length})
          </summary>
          <ul className="grid list-none gap-3 p-0">
            {entries.map((entry) => (
              <li key={entry.id} className="border-t border-border pt-2">
                <p className="text-sm font-semibold">
                  {new Date(entry.measuredAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-secondary">
                  {fields
                    .filter(({ key }) => entry[key] != null)
                    .map(({ key, label }) => `${label}: ${number(entry[key])}`)
                    .join(' · ')}
                </p>
                {entry.notes && <p className="text-xs text-secondary">{entry.notes}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    disabled={busy}
                    onClick={() => {
                      setEditing(entry);
                      setMessage(null);
                    }}
                  >
                    Edit measurement
                  </Button>
                  <Button disabled={busy} onClick={() => setDeleting(entry.id)}>
                    Delete measurement
                  </Button>
                </div>
                {deleting === entry.id && (
                  <div className="mt-2 grid gap-2">
                    <p className="text-xs">Delete this measurement?</p>
                    <div className="flex gap-2">
                      <Button disabled={busy} onClick={() => void remove(entry.id)}>
                        Confirm delete
                      </Button>
                      <Button disabled={busy} onClick={() => setDeleting(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
