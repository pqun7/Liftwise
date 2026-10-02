import { useRef, useState, type ReactNode } from 'react';
import { Check, Circle, Info } from 'lucide-react';
import { NumericInput } from '../../components/ui/FormControl';
import { Button } from '../../components/ui/Button';
import { DEFAULT_WEIGHT_STEP, copiedSetValues, previousSetFor } from '../../domain/workoutPrefill';
import type { WorkoutSet } from '../../domain/entities';
import type { SetCompletionUndo } from '../../lib/storage/repositories/workoutRepository';
import { completeWorkoutSet, updateWorkoutSet } from './workoutService';

type Field = 'weight' | 'reps' | 'rir';
type Draft = Record<Field, string>;
const draftFor = (set: WorkoutSet): Draft => ({
  weight: set.weight?.toString() ?? '',
  reps: set.reps?.toString() ?? '',
  rir: set.rir?.toString() ?? '',
});
const numeric = (value: string) => (value.trim() === '' ? null : Number(value));

// Controlled input drafts are transient text only; every valid edit uses the canonical repository.
export function SetLogger({
  sets,
  previous,
  refresh,
  onCompleted,
  footer,
  disabled = false,
}: {
  sets: WorkoutSet[];
  previous: WorkoutSet[];
  refresh: () => Promise<void>;
  onCompleted: (undo: SetCompletionUndo) => void;
  footer?: ReactNode;
  disabled?: boolean;
}) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(sets.map((set) => [set.id, draftFor(set)])),
  );
  const draftRef = useRef(drafts);
  const queue = useRef(Promise.resolve());
  const completing = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = sets.find((set) => !set.completed);
  const read = (set: WorkoutSet) => drafts[set.id] ?? draftFor(set);
  const enqueue = (action: () => Promise<unknown>) => {
    queue.current = queue.current.then(async () => {
      try {
        await action();
        setError(null);
      } catch (failure) {
        setError(
          failure instanceof Error
            ? failure.message
            : 'Could not save this set. Retry before leaving.',
        );
      }
    });
    return queue.current;
  };
  const change = (set: WorkoutSet, field: Field, value: string) => {
    const next = { ...(draftRef.current[set.id] ?? draftFor(set)), [field]: value };
    draftRef.current = { ...draftRef.current, [set.id]: next };
    setDrafts(draftRef.current);
    void enqueue(() => updateWorkoutSet(set.id, { [field]: numeric(value) }));
  };
  const complete = () => {
    if (!current || completing.current || disabled) return;
    completing.current = true;
    setBusy(true);
    void enqueue(async () => {
      const values = draftRef.current[current.id] ?? draftFor(current);
      onCompleted(
        await completeWorkoutSet(current.id, {
          weight: numeric(values.weight),
          reps: numeric(values.reps),
          rir: numeric(values.rir),
        }),
      );
      await refresh();
    }).finally(() => {
      completing.current = false;
      setBusy(false);
    });
  };
  const copy = () => {
    if (!current) return;
    const source = previousSetFor(current, previous);
    if (!source) return;
    const values = copiedSetValues(source);
    const draft = draftFor({ ...current, ...values });
    draftRef.current = { ...draftRef.current, [current.id]: draft };
    setDrafts(draftRef.current);
    void enqueue(() => updateWorkoutSet(current.id, values));
  };
  return (
    <section aria-label="Set logger" className="workout-set-logger">
      <div className="workout-set-grid workout-set-labels" aria-hidden="true">
        <span>Set</span>
        <span>Kg</span>
        <span>Reps</span>
        <span>RIR</span>
        <span className="sr-only">Status</span>
      </div>
      {sets.map((set) => {
        const active = current?.id === set.id;
        return (
          <div
            key={set.id}
            className={`workout-set-grid ${active ? 'is-current' : ''} ${set.completed ? 'is-completed' : ''}`}
            aria-label={`Set ${set.setNumber}${active ? ', current' : ''}`}
          >
            <span
              className={`flex min-h-11 items-center justify-center rounded-xl border font-semibold ${active ? 'border-mint bg-mint/5' : 'border-border bg-surface-2'}`}
            >
              {set.setNumber}
            </span>
            {(['weight', 'reps', 'rir'] as const).map((field, index) => (
              <NumericInput
                key={field}
                value={read(set)[field]}
                disabled={disabled || busy || set.completed}
                inputMode={field === 'reps' ? 'numeric' : 'decimal'}
                enterKeyHint={field === 'rir' ? 'done' : 'next'}
                aria-label={`Set ${set.setNumber} ${field === 'rir' ? 'RIR' : field}`}
                className={`px-1 text-center font-semibold tabular-nums ${active ? 'border-mint bg-mint/5' : ''}`}
                onChange={(event) => change(set, field, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    const row = event.currentTarget.parentElement;
                    if (index < 2) row?.querySelectorAll('input')[index + 1]?.focus();
                    else if (active) complete();
                  }
                }}
              />
            ))}
            <button
              type="button"
              aria-label={set.completed ? 'Completed' : `Set ${set.setNumber} incomplete`}
              aria-pressed={set.completed}
              disabled
              className={`flex size-11 items-center justify-center rounded-xl ${set.completed ? 'bg-mint/5 text-mint' : 'text-muted'}`}
            >
              {set.completed ? (
                <span className="rounded-full bg-mint p-1 text-app">
                  <Check size={18} aria-hidden="true" />
                </span>
              ) : (
                <Circle size={22} aria-hidden="true" />
              )}
            </button>
          </div>
        );
      })}
      {current ? (
        <>
          <div className="workout-adjustments">
            {(['weight', 'reps', 'rir'] as const).map((field) => {
              const step = field === 'weight' ? DEFAULT_WEIGHT_STEP : 1;
              return (
                <div key={field} className="workout-adjustment">
                  <span className="workout-adjustment-value">
                    {read(current)[field] || '—'}{' '}
                    {field === 'weight' ? 'kg' : field === 'reps' ? 'reps' : 'RIR'}
                  </span>
                  {([-1, 1] as const).map((direction) => (
                    <button
                      type="button"
                      key={direction}
                      disabled={busy || disabled}
                      aria-label={`Set ${current.setNumber} ${field} ${direction > 0 ? 'plus' : 'minus'} ${step}`}
                      className="flex size-11 items-center justify-center rounded-xl border border-border bg-surface-3 text-sm disabled:opacity-40"
                      onClick={() => {
                        const value = numeric(
                          (draftRef.current[current.id] ?? draftFor(current))[field],
                        );
                        change(
                          current,
                          field,
                          String(
                            Math.max(0, Math.round(((value ?? 0) + direction * step) * 100) / 100),
                          ),
                        );
                      }}
                    >
                      {direction > 0 ? '+' : '−'}
                      {field === 'weight' ? step : ''}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
          {footer}
          <Button
            variant="primary"
            size="large"
            className="workout-primary workout-active-action"
            disabled={busy || disabled}
            aria-pressed={false}
            onClick={complete}
          >
            <Check size={22} aria-hidden="true" />
            Complete set
          </Button>
          {previous.some((set) => set.completed) ? (
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-secondary">
              <Info size={14} aria-hidden="true" />
              <span>Prefilled from last workout when available</span>
              <Button variant="ghost" disabled={busy || disabled} onClick={copy}>
                Copy Previous Set
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        footer
      )}
      {error ? (
        <p role="alert" className="text-sm text-red-300">
          {error}{' '}
          <Button
            variant="ghost"
            disabled={busy || disabled}
            onClick={() =>
              void enqueue(async () => {
                for (const set of sets) {
                  const values = draftRef.current[set.id] ?? draftFor(set);
                  await updateWorkoutSet(set.id, {
                    weight: numeric(values.weight),
                    reps: numeric(values.reps),
                    rir: numeric(values.rir),
                  });
                }
                await refresh();
              })
            }
          >
            Retry save
          </Button>
        </p>
      ) : null}
    </section>
  );
}
