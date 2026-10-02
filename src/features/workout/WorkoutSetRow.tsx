import { Button } from '../../components/ui/Button';
import { NumericInput, Select } from '../../components/ui/FormControl';
import { useRef, useState } from 'react';
import type { WorkoutSet, WorkoutSetType } from '../../domain/entities';
import {
  copiedSetValues,
  DEFAULT_WEIGHT_STEP,
  lastUsedSet,
  previousSetFor,
} from '../../domain/workoutPrefill';
import type { SetCompletionUndo } from '../../lib/storage/repositories/workoutRepository';
import {
  completeWorkoutSet,
  deleteWorkoutSet,
  duplicateWorkoutSet,
  updateWorkoutSet,
} from './workoutService';

const numberOrNull = (value: string) => (value.trim() === '' ? null : Number(value));

export function WorkoutSetRow({
  set,
  today,
  previous,
  mutable,
  refresh,
  completed,
}: Readonly<{
  set: WorkoutSet;
  today: WorkoutSet[];
  previous: WorkoutSet[];
  mutable: boolean;
  refresh: () => Promise<void>;
  completed: (undo: SetCompletionUndo) => void;
}>) {
  const [weight, setWeight] = useState(set.weight?.toString() ?? '');
  const [reps, setReps] = useState(set.reps?.toString() ?? '');
  const [rir, setRir] = useState(set.rir?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const queue = useRef(Promise.resolve());
  const nextField = useRef<HTMLInputElement>(null);
  const rirField = useRef<HTMLInputElement>(null);
  const previousSet = previousSetFor(set, previous);
  const recent = lastUsedSet(set, today, previous);
  const perform = (action: () => Promise<unknown>) => {
    setBusy(true);
    queue.current = queue.current.then(async () => {
      setError(null);
      try {
        await action();
        await refresh();
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : 'Set could not be saved.');
      } finally {
        setBusy(false);
      }
    });
  };
  const copy = (source: WorkoutSet) =>
    perform(async () => {
      const values = copiedSetValues(source);
      await updateWorkoutSet(set.id, values);
      setWeight(values.weight?.toString() ?? '');
      setReps(values.reps?.toString() ?? '');
      setRir(values.rir?.toString() ?? '');
    });
  const adjust = (field: 'weight' | 'reps', delta: number) =>
    perform(async () => {
      const current = numberOrNull(field === 'weight' ? weight : reps);
      const value = Math.max(
        0,
        Math.round(((current ?? recent?.[field] ?? 0) + delta) * 100) / 100,
      );
      await updateWorkoutSet(set.id, { [field]: value });
      if (field === 'weight') setWeight(String(value));
      else setReps(String(value));
    });
  const editable = mutable && !set.completed;
  return (
    <div
      className={'workout-set-row' + (set.completed ? ' set-complete' : '')}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest('button')) event.preventDefault();
      }}
    >
      <span className="set-number">{set.setNumber}</span>
      <label>
        <span>kg</span>
        <NumericInput
          inputMode="decimal"
          enterKeyHint="next"
          disabled={!mutable}
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
          onBlur={() => perform(() => updateWorkoutSet(set.id, { weight: numberOrNull(weight) }))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              nextField.current?.focus();
            }
          }}
          aria-label={'Set ' + set.setNumber + ' weight'}
        />
      </label>
      <label>
        <span>Reps</span>
        <NumericInput
          ref={nextField}
          inputMode="numeric"
          enterKeyHint="next"
          disabled={!mutable}
          value={reps}
          onChange={(event) => setReps(event.target.value)}
          onBlur={() => perform(() => updateWorkoutSet(set.id, { reps: numberOrNull(reps) }))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              rirField.current?.focus();
            }
          }}
          aria-label={'Set ' + set.setNumber + ' reps'}
        />
      </label>
      <label>
        <span>RIR</span>
        <NumericInput
          ref={rirField}
          inputMode="decimal"
          enterKeyHint="done"
          disabled={!mutable}
          value={rir}
          onChange={(event) => setRir(event.target.value)}
          onBlur={() => perform(() => updateWorkoutSet(set.id, { rir: numberOrNull(rir) }))}
          aria-label={'Set ' + set.setNumber + ' RIR'}
        />
      </label>
      {editable ? (
        <div className="set-speed-actions">
          <Button
            type="button"
            disabled={busy || !previousSet}
            onClick={() => previousSet && copy(previousSet)}
          >
            Copy Previous Set
          </Button>
          <Button type="button" disabled={busy || !recent} onClick={() => recent && copy(recent)}>
            Use last values
          </Button>
          <Button
            type="button"
            disabled={busy}
            aria-label={'Set ' + set.setNumber + ' weight minus ' + DEFAULT_WEIGHT_STEP + ' kg'}
            onClick={() => adjust('weight', -DEFAULT_WEIGHT_STEP)}
          >
            −{DEFAULT_WEIGHT_STEP} kg
          </Button>
          <Button
            type="button"
            disabled={busy}
            aria-label={'Set ' + set.setNumber + ' weight plus ' + DEFAULT_WEIGHT_STEP + ' kg'}
            onClick={() => adjust('weight', DEFAULT_WEIGHT_STEP)}
          >
            +{DEFAULT_WEIGHT_STEP} kg
          </Button>
          <Button
            type="button"
            disabled={busy}
            aria-label={'Set ' + set.setNumber + ' reps minus one'}
            onClick={() => adjust('reps', -1)}
          >
            −1 rep
          </Button>
          <Button
            type="button"
            disabled={busy}
            aria-label={'Set ' + set.setNumber + ' reps plus one'}
            onClick={() => adjust('reps', 1)}
          >
            +1 rep
          </Button>
        </div>
      ) : null}
      <label className="set-type-field">
        <span>Type</span>
        <Select
          disabled={!mutable || busy}
          value={set.setType}
          aria-label={'Set ' + set.setNumber + ' type'}
          onChange={(event) => {
            const setType = event.target.value as WorkoutSetType;
            perform(() => updateWorkoutSet(set.id, { setType }));
          }}
        >
          <option value="warmup">Warmup</option>
          <option value="working">Working</option>
          <option value="drop">Drop</option>
          <option value="failure">Failure</option>
        </Select>
      </label>
      <Button
        variant={set.completed ? 'secondary' : 'primary'}
        className="set-complete-action col-span-full w-full"
        type="button"
        disabled={!mutable || busy}
        aria-pressed={set.completed}
        onClick={() =>
          perform(async () => {
            if (set.completed) await updateWorkoutSet(set.id, { completed: false });
            else
              completed(
                await completeWorkoutSet(set.id, {
                  weight: numberOrNull(weight),
                  reps: numberOrNull(reps),
                  rir: numberOrNull(rir),
                }),
              );
          })
        }
      >
        {set.completed ? 'Completed' : 'Complete set'}
      </Button>
      {mutable ? (
        <div className="set-speed-actions">
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              perform(async () => {
                await updateWorkoutSet(set.id, {
                  weight: numberOrNull(weight),
                  reps: numberOrNull(reps),
                  rir: numberOrNull(rir),
                });
                await duplicateWorkoutSet(set.id);
              })
            }
          >
            Duplicate Set
          </Button>
          <Button
            type="button"
            disabled={busy}
            aria-label={'Delete set ' + set.setNumber}
            onClick={() => {
              if (window.confirm('Delete set ' + set.setNumber + '?'))
                perform(() => deleteWorkoutSet(set.id));
            }}
          >
            Delete
          </Button>
        </div>
      ) : null}
      {error ? (
        <p className="form-error set-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
