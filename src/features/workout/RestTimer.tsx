import { useState } from 'react';
import { ArrowRight, Check, Clock, Pencil, PlusCircle, SkipForward } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { formatDuration } from '../../domain/workoutTime';
import { SetLogger } from './SetLogger';
import { useWorkoutSetDrafts } from './useWorkoutSetDrafts';
import type { HydratedWorkoutExercise } from './workoutService';
import type { SetCompletionUndo } from '../../lib/storage/repositories/workoutRepository';

const LABELS = { weight: 'Weight', reps: 'Reps', rir: 'RIR' } as const;

export function RestTimer({
  remaining,
  onEnd,
  onAdd,
  duration = remaining,
  nextSet,
  disabled = false,
  entry,
  refresh,
  onCompleted,
}: {
  remaining: number;
  onEnd: () => void;
  onAdd?: () => void;
  duration?: number;
  nextSet?: number | undefined;
  disabled?: boolean;
  entry?: HydratedWorkoutExercise | undefined;
  refresh?: () => Promise<void>;
  onCompleted?: (undo: SetCompletionUndo) => void;
}) {
  const [editing, setEditing] = useState(false);
  const editor = useWorkoutSetDrafts(entry?.sets ?? []);
  const current = entry?.sets.find((set) => !set.completed);
  const completed = entry?.sets
    .filter((set) => set.completed)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const values = current ? editor.read(current) : null;

  const total = Math.max(1, duration);
  const progress = Math.min(1, remaining / total);
  const isDone = remaining === 0;
  const ending = !isDone && remaining <= 10;
  const setLabel = nextSet != null ? `Set ${nextSet}` : 'next set';

  return (
    <section className="grid gap-4" aria-label="Rest timer">
      {/* Completion receipt: slim chip, not a hero */}
      {completed && entry ? (
        <p className="mx-auto flex max-w-full items-center gap-2 rounded-full bg-mint/10 px-3 py-1.5 text-sm text-secondary">
          <Check size={16} className="shrink-0 text-mint" aria-hidden="true" />
          <span className="truncate">
            <span className="font-semibold text-primary">Set {completed.setNumber} done</span>
            {' · '}
            {completed.weight ?? '—'} kg × {completed.reps ?? '—'}
            {completed.rir == null ? '' : ` · RIR ${completed.rir}`}
          </span>
        </p>
      ) : null}

      {/* Timer ring is the hero */}
      <div className="workout-rest-large-ring relative">
        <svg
          viewBox="0 0 100 100"
          className="size-full -rotate-90"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={remaining}
          aria-label="Rest remaining"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="text-surface-3"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={Math.PI * 90}
            strokeDashoffset={Math.PI * 90 * (1 - progress)}
            className={`transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none ${ending ? 'text-amber' : 'text-mint'
              }`}
          />
        </svg>

        <div className="absolute inset-0 grid content-center justify-items-center gap-1 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-secondary">
            {isDone ? 'Rest complete' : 'Rest'}
          </span>
          <strong
            role="timer"
            aria-live="off"
            className="workout-rest-countdown tabular-nums"
          >
            {formatDuration(remaining)}
          </strong>
          {/* Context lives under the number instead of its own block */}
          <span className="max-w-[12rem] truncate text-sm text-secondary">
            {entry?.exercise.exerciseName ?? 'Next'} · {setLabel}
            {entry ? ` of ${entry.sets.length}` : ''}
          </span>
          {onAdd ? (
            <span className="flex items-center gap-1.5 text-xs text-secondary">
              <Clock size={14} aria-hidden="true" /> of {formatDuration(duration)}
            </span>
          ) : null}
        </div>
      </div>

      {/* Single polite announcement at the milestone */}
      <p className="sr-only" role="status">
        {isDone ? `Rest complete. Ready for ${setLabel}.` : ''}
      </p>

      {/* Next-set preview: compact, and it's the only place "next" info appears */}
      {current && entry ? (
        <section
          className="overflow-hidden rounded-2xl border border-border bg-surface/60"
          aria-label="Next set"
        >
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-secondary">Up next</p>
              <h3 className="truncate text-base font-semibold">
                Set {current.setNumber} of {entry.sets.length}
              </h3>
            </div>
            <Button
              variant="ghost"
              disabled={disabled}
              aria-expanded={editing}
              onClick={() => setEditing((v) => !v)}
            >
              <Pencil size={16} aria-hidden="true" />
              {editing ? 'Done' : 'Edit'}
            </Button>
          </div>

          {editing && refresh && onCompleted ? (
            <div className="border-t border-border p-2">
              <SetLogger
                sets={entry.sets}
                previous={entry.previous?.sets ?? []}
                refresh={refresh}
                onCompleted={onCompleted}
                disabled={disabled}
                editingOnly
              />
            </div>
          ) : (
            <dl className="grid grid-cols-3 gap-2 border-t border-border px-4 py-3">
              {(['weight', 'reps', 'rir'] as const).map((field) => (
                <div key={field} className="flex flex-col-reverse items-center gap-0.5">
                  <dt className="text-xs uppercase tracking-wide text-secondary">
                    {LABELS[field]}
                  </dt>
                  <dd className="text-lg font-bold tabular-nums">
                    {values?.[field] ?? '—'}
                    {field === 'weight' && values?.weight != null ? ' kg' : ''}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      ) : (
        <p className="text-sm text-secondary">Up next: {setLabel}</p>
      )}

      {/* Actions: one primary, one secondary, one escape hatch */}
      <div className="grid gap-2">
        <Button
          variant="primary"
          size="large"
          className="workout-primary"
          disabled={disabled}
          onClick={onEnd}
        >
          <ArrowRight size={22} aria-hidden="true" />
          {isDone ? `Start ${setLabel}` : `Start ${setLabel} now`}
        </Button>
        <div className={onAdd ? 'grid grid-cols-2 gap-2' : ''}>
          {onAdd ? (
            <Button size="large" disabled={disabled} onClick={onAdd}>
              <PlusCircle size={20} aria-hidden="true" /> +30 sec
            </Button>
          ) : null}
          <Button variant="ghost" size="large" disabled={disabled} onClick={onEnd}>
            <SkipForward size={20} aria-hidden="true" /> Skip rest
          </Button>
        </div>
      </div>
    </section>
  );
}