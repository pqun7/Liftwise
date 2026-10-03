import { useRef, useState, type ReactNode } from 'react';
import { Check, Circle } from 'lucide-react';
import { NumericInput } from '../../components/ui/FormControl';
import { Button } from '../../components/ui/Button';
import { DEFAULT_WEIGHT_STEP, copiedSetValues, previousSetFor } from '../../domain/workoutPrefill';
import type { WorkoutSet } from '../../domain/entities';
import type { SetCompletionUndo } from '../../lib/storage/repositories/workoutRepository';
import { completeWorkoutSet } from './workoutService';
import { useWorkoutSetDrafts, draftFor, numeric, type SetField } from './useWorkoutSetDrafts';

const fields: SetField[] = ['weight', 'reps', 'rir'];
export function SetLogger({
  sets,
  previous,
  refresh,
  onCompleted,
  footer,
  disabled = false,
  editingOnly = false,
  finalSet = false,
}: {
  sets: WorkoutSet[];
  previous: WorkoutSet[];
  refresh: () => Promise<void>;
  onCompleted: (undo: SetCompletionUndo) => void;
  footer?: ReactNode;
  disabled?: boolean;
  editingOnly?: boolean;
  finalSet?: boolean;
}) {
  const editor = useWorkoutSetDrafts(sets);
  const completing = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = sets.find((set) => !set.completed);
  const reference = current && previousSetFor(current, previous);
  const showCopy =
    current &&
    reference &&
    fields.some((field) => numeric(editor.read(current)[field]) !== reference[field]);
  const complete = () => {
    if (!current || completing.current || disabled) return;
    try {
      editor.values(current, true);
    } catch (failure) {
      setError((failure as Error).message);
      return;
    }
    completing.current = true;
    if (document.activeElement instanceof HTMLInputElement) document.activeElement.blur();
    setBusy(true);
    setError(null);
    void editor.queue
      .perform(async () => {
        onCompleted(await completeWorkoutSet(current.id, editor.values(current, true)));
        await refresh();
      })
      .catch((failure: Error) => setError(failure.message))
      .finally(() => {
        completing.current = false;
        setBusy(false);
      });
  };
  const retry = () => {
    setError(null);
    void editor.queue
      .retry()
      .then(refresh)
      .catch((failure: Error) => setError(failure.message));
  };
  const row = (set: WorkoutSet) => (
    <div
      key={set.id}
      className={`workout-set-grid ${set.completed ? 'is-completed' : ''}`}
      aria-label={`Set ${set.setNumber}`}
    >
      <span className="flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface-2 font-semibold">
        {set.setNumber}
      </span>
      {fields.map((field) => (
        <NumericInput
          key={field}
          value={editor.read(set)[field]}
          disabled={disabled || busy || set.completed}
          inputMode={field === 'reps' ? 'numeric' : 'decimal'}
          aria-label={`Set ${set.setNumber} ${field === 'rir' ? 'RIR' : field}`}
          className="px-1 text-center tabular-nums"
          onChange={(event) => editor.change(set, field, event.target.value)}
        />
      ))}
      <button
        type="button"
        disabled
        aria-label={set.completed ? 'Completed' : `Set ${set.setNumber} incomplete`}
        aria-pressed={set.completed}
        className="flex size-11 items-center justify-center text-mint"
      >
        {set.completed ? (
          <Check size={22} aria-hidden="true" />
        ) : (
          <Circle size={22} aria-hidden="true" />
        )}
      </button>
    </div>
  );
  return (
    <section
      aria-label="Set logger"
      className={`workout-set-logger ${editingOnly ? '' : 'workout-set-logger-focused'}`}
    >
      {current ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold" aria-live="polite">
              Set {current.setNumber} of {sets.length}
            </h3>
            <span className="text-sm text-secondary">
              {current.setType === 'working' ? 'Today' : current.setType}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {fields.map((field, index) => {
              const step = field === 'weight' ? DEFAULT_WEIGHT_STEP : 1;
              return (
                <div key={field} className="min-w-0 rounded-2xl border border-border bg-surface-2">
                  <label className="grid gap-1 text-center">
                    <span className="py-1 text-sm text-secondary">
                      {field === 'weight' ? 'Weight · kg' : field === 'reps' ? 'Reps' : 'RIR'}
                    </span>
                    <NumericInput
                      value={editor.read(current)[field]}
                      disabled={disabled || busy}
                      inputMode={field === 'reps' ? 'numeric' : 'decimal'}
                      enterKeyHint={field === 'rir' ? 'done' : 'next'}
                      placeholder="—"
                      aria-label={`Set ${current.setNumber} ${field === 'rir' ? 'RIR' : field}`}
                      className="workout-metric-input border-0 bg-transparent px-1 text-center text-2xl font-bold tabular-nums"
                      onChange={(event) => {
                        setError(null);
                        editor.change(current, field, event.target.value);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          const inputs = event.currentTarget
                            .closest('section')
                            ?.querySelectorAll('input');
                          if (index < 2) inputs?.[index + 1]?.focus();
                          else {
                            event.currentTarget.blur();
                            if (!editingOnly) complete();
                          }
                        }
                      }}
                    />
                  </label>
                  <div className="workout-adjustment flex justify-between gap-0">
                    {([-1, 1] as const).map((direction) => (
                      <button
                        key={direction}
                        type="button"
                        disabled={disabled || busy}
                        aria-label={`Set ${current.setNumber} ${field} ${direction > 0 ? 'plus' : 'minus'} ${step}`}
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-sm disabled:opacity-40"
                        onClick={() => {
                          const value = numeric(editor.read(current)[field]);
                          setError(null);
                          editor.change(
                            current,
                            field,
                            String(
                              Math.min(
                                field === 'rir' ? 10 : Infinity,
                                Math.max(
                                  0,
                                  Math.round(
                                    ((Number.isFinite(value) ? (value ?? 0) : 0) +
                                      direction * step) *
                                      100,
                                  ) / 100,
                                ),
                              ),
                            ),
                          );
                        }}
                      >
                        {direction > 0 ? '+' : '−'}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {footer}
          {finalSet ? <p className="text-sm text-mint">Final set · finish strong</p> : null}
          {!editingOnly ? (
            <Button
              variant="primary"
              size="large"
              className="workout-primary workout-active-action"
              disabled={busy || disabled}
              aria-pressed={false}
              onPointerDown={(event) => event.preventDefault()}
              onClick={complete}
            >
              <Check size={22} aria-hidden="true" />
              {busy ? 'Saving set…' : 'Complete set'}
            </Button>
          ) : null}
          {showCopy && reference ? (
            <Button
              variant="ghost"
              disabled={busy || disabled}
              onClick={() => editor.save(current, draftFor(copiedSetValues(reference)))}
            >
              Copy Previous Set
            </Button>
          ) : null}
        </>
      ) : (
        <>
          {footer}
          <p role="status" className="text-sm text-mint">
            {sets.length ? 'All sets completed' : 'No sets yet. Add a set in Workout Overview.'}
          </p>
        </>
      )}
      {!editingOnly && sets.some((set) => set.id !== current?.id) ? (
        <details className="rounded-xl border border-border p-2" open={!current}>
          <summary className="flex min-h-11 cursor-pointer items-center text-sm text-secondary">
            All sets · {sets.filter((set) => set.completed).length}/{sets.length} completed
          </summary>
          <div className="grid gap-2">
            <div className="workout-set-grid workout-set-labels" aria-hidden="true">
              <span>Set</span>
              <span>Kg</span>
              <span>Reps</span>
              <span>RIR</span>
              <span />
            </div>
            {sets.filter((set) => set.id !== current?.id).map(row)}
          </div>
        </details>
      ) : null}
      {error || editor.saveError ? (
        <p role="alert" className="text-sm text-red-300">
          {error ?? editor.saveError}{' '}
          {editor.saveError ? (
            <Button variant="ghost" disabled={busy || disabled} onClick={retry}>
              Retry save
            </Button>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
