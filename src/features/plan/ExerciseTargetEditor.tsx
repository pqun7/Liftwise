import { useEffect, useRef, useState } from 'react';
import { programExerciseSchema } from '../../domain/validation';
import type { ProgramExercise } from '../../domain/entities';
import type { ProgramExercisePrescriptionInput } from '../../lib/storage/repositories/programRepository';
import { Button } from '../../components/ui/Button';
import { NumericInput, Textarea } from '../../components/ui/FormControl';

const fields = [
  ['targetSets', 'Target sets'],
  ['minReps', 'Minimum reps'],
  ['maxReps', 'Maximum reps'],
  ['targetRirMin', 'Minimum RIR'],
  ['targetRirMax', 'Maximum RIR'],
  ['restSeconds', 'Rest duration in seconds'],
] as const;
export function ExerciseTargetEditor({
  prescription,
  save,
  close,
  dirtyChange,
}: {
  prescription: ProgramExercise;
  save: (input: ProgramExercisePrescriptionInput) => Promise<boolean>;
  close: () => void;
  dirtyChange?: (dirty: boolean) => void;
}) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map(([key]) => [key, prescription[key]?.toString() ?? ''])),
  );
  const [notes, setNotes] = useState(prescription.notes ?? '');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const dirty =
    notes !== (prescription.notes ?? '') ||
    fields.some(([key]) => values[key] !== (prescription[key]?.toString() ?? ''));
  useEffect(() => {
    dirtyChange?.(dirty);
  }, [dirty, dirtyChange]);
  return (
    <form
      className="grid gap-3 rounded-xl border border-mint/40 bg-surface-2 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending.current) return;
        const input = {
          ...Object.fromEntries(
            fields.map(([key]) => [key, values[key]?.trim() ? Number(values[key]) : null]),
          ),
          notes: notes.trim() || null,
        };
        const parsed = programExerciseSchema.safeParse({ ...prescription, ...input });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? 'Check the target values.');
          return;
        }
        pending.current = true;
        setError(null);
        setBusy(true);
        void save(input)
          .then((success) => {
            if (success) {
              dirtyChange?.(false);
              close();
            } else setError('Could not save targets. Your edits are preserved. Try again.');
          })
          .catch(() => setError('Could not save targets. Try again.'))
          .finally(() => {
            pending.current = false;
            setBusy(false);
          });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        {fields.map(([key, label]) => (
          <label key={key} className="grid min-w-0 gap-1 text-xs text-secondary">
            <span>{label}</span>
            <NumericInput
              type="number"
              inputMode="numeric"
              min={key === 'targetSets' ? 1 : 0}
              step="1"
              max={key === 'restSeconds' ? 3600 : key.startsWith('targetRir') ? 10 : undefined}
              required={key === 'targetSets'}
              value={values[key]}
              onChange={(event) =>
                setValues((current) => ({ ...current, [key]: event.target.value }))
              }
            />
          </label>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-secondary">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2" aria-label="Rest presets">
        {[90, 120, 150, 180].map((seconds) => (
          <Button
            key={seconds}
            aria-pressed={values.restSeconds === String(seconds)}
            onClick={() => setValues((current) => ({ ...current, restSeconds: String(seconds) }))}
          >
            {seconds}s
          </Button>
        ))}
      </div>
      <label className="grid gap-1 text-xs text-secondary">
        Exercise notes
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
      </label>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={busy} className="flex-1">
          {busy ? 'Saving…' : 'Done'}
        </Button>
        <Button
          disabled={busy}
          onClick={() => {
            if (!dirty || window.confirm('Discard target changes?')) {
              dirtyChange?.(false);
              close();
            }
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
