import { useState } from 'react';
import { ArrowRight, Check, Clock, Pencil, PlusCircle, SkipForward } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { formatDuration } from '../../domain/workoutTime';
import { SetLogger } from './SetLogger';
import { useWorkoutSetDrafts } from './useWorkoutSetDrafts';
import type { HydratedWorkoutExercise } from './workoutService';
import type { SetCompletionUndo } from '../../lib/storage/repositories/workoutRepository';

// Display refreshes are supplied by the session. Persisted timestamps own the clock.
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
  return (
    <section className="grid gap-4" aria-label="Rest timer">
      {completed && entry ? (
        <div className="grid justify-items-center gap-2 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-mint text-app">
            <Check size={28} aria-hidden="true" />
          </span>
          <h2 className="text-xl font-bold">Set {completed.setNumber} complete!</h2>
          <p className="text-sm text-secondary">
            {entry.exercise.exerciseName} · {completed.weight ?? '—'} kg · {completed.reps ?? '—'}{' '}
            reps{completed.rir === null ? '' : ` · RIR ${completed.rir}`}
          </p>
        </div>
      ) : null}
      <div className="workout-rest-large-ring">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
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
            strokeDashoffset={Math.PI * 90 * (1 - Math.min(1, remaining / Math.max(1, duration)))}
            className="text-mint transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
          />
        </svg>
        <div className="absolute inset-0 grid content-center justify-items-center gap-3 text-center">
          <span className="text-sm tracking-wide text-secondary">
            {remaining === 0 ? 'REST COMPLETE' : 'REST'}
          </span>
          <strong className="workout-rest-countdown" aria-label={`${remaining} seconds remaining`}>
            {formatDuration(remaining).padStart(5, '0')}
          </strong>
          <span className="flex items-center gap-2 text-secondary">
            <Clock size={18} aria-hidden="true" /> {formatDuration(duration)}
          </span>
          {remaining === 0 ? (
            <p role="status" className="text-sm text-mint">
              Ready for Set {nextSet}
            </p>
          ) : null}
        </div>
      </div>
      {current && entry ? (
        <section
          className="rounded-2xl border border-border bg-surface/60"
          aria-label="Next set preview"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <div>
              <p className="text-sm text-secondary">Next</p>
              <h3 className="text-lg font-bold">
                Set {current.setNumber} of {entry.sets.length}
              </h3>
            </div>
            <Button
              variant="ghost"
              disabled={disabled}
              aria-expanded={editing}
              onClick={() => setEditing(!editing)}
            >
              <Pencil size={18} aria-hidden="true" />
              {editing ? 'Done editing' : 'Edit'}
            </Button>
          </div>
          {editing && refresh && onCompleted ? (
            <div className="p-2">
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
            <dl className="grid grid-cols-3 py-3 text-center">
              {(['weight', 'reps', 'rir'] as const).map((field) => (
                <div key={field} className="border-r border-border last:border-0">
                  <dd className="text-xl font-bold">
                    {values?.[field] || '—'}
                    {field === 'weight' ? ' kg' : ''}
                  </dd>
                  <dt className="text-sm text-secondary">
                    {field === 'rir' ? 'RIR' : field === 'reps' ? 'Reps' : 'Weight'}
                  </dt>
                </div>
              ))}
            </dl>
          )}
        </section>
      ) : (
        <p className="text-sm text-secondary">Next: Set {nextSet}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {onAdd ? (
          <Button size="large" disabled={disabled} aria-label="Add 30 Seconds" onClick={onAdd}>
            <PlusCircle size={20} aria-hidden="true" />
            +30 sec
          </Button>
        ) : null}
        <Button
          size="large"
          disabled={disabled}
          aria-label={onAdd ? 'Skip Rest Timer' : 'End rest'}
          onClick={onEnd}
        >
          <SkipForward size={20} aria-hidden="true" />
          Skip Rest
        </Button>
      </div>
      <Button
        variant="primary"
        size="large"
        className="workout-primary"
        disabled={disabled}
        onClick={onEnd}
      >
        <ArrowRight size={22} aria-hidden="true" />
        Start Set {nextSet}
      </Button>
    </section>
  );
}
