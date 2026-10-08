import { Link, useLocation } from 'react-router-dom';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { buttonClasses } from '../../components/ui/controlStyles';
import type { SetCompletionUndo } from '../../lib/storage/repositories/workoutRepository';
import type { HydratedWorkoutGraph } from './workoutService';
import { formatPreviousSets, formatWorkoutPrescription } from './workoutFormat';
import { WorkoutSetRow } from './WorkoutSetRow';

interface Props {
  entry: HydratedWorkoutGraph['exercises'][number];
  sessionId: string;
  mutable: boolean;
  current: boolean;
  hidden: boolean;
  busy: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onCurrent: () => void;
  onCollapse: () => void;
  onSkip: () => void;
  onAddSet: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onCompleted: (undo: SetCompletionUndo) => void;
  refresh: () => Promise<void>;
}
export function WorkoutExerciseCard({
  entry,
  sessionId,
  mutable,
  current,
  hidden,
  busy,
  canMoveUp,
  canMoveDown,
  onCurrent,
  onCollapse,
  onSkip,
  onAddSet,
  onMove,
  onRemove,
  onCompleted,
  refresh,
}: Props) {
  const location = useLocation();
  const allComplete = entry.sets.length > 0 && entry.sets.every(({ completed }) => completed);
  const completed = entry.sets.filter((set) => set.completed);
  return (
    <Card
      as="article"
      variant={current ? 'active' : 'default'}
      className="session-exercise-card ui-card grid gap-3"
      id={'exercise-' + entry.exercise.id}
      aria-label={entry.exercise.exerciseName}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-mint">
            Exercise {entry.exercise.order}
          </p>
          <h2 className="text-lg font-bold">
            <Link
              to={`/exercises/${encodeURIComponent(entry.exercise.exerciseId)}`}
              state={{
                returnTo: location.pathname + location.search,
                returnKey: location.key,
                returnLabel: 'Workout',
              }}
              className="inline-flex min-h-11 items-center"
            >
              {entry.exercise.exerciseName}
            </Link>
          </h2>
          <p className="text-secondary">{formatWorkoutPrescription(entry.exercise)}</p>
        </div>
        {mutable && !current ? (
          <Button disabled={busy} onClick={onCurrent}>
            Set current
          </Button>
        ) : null}
      </header>
      {entry.exercise.plannedNotes ? (
        <p className="text-secondary">Plan: {entry.exercise.plannedNotes}</p>
      ) : null}
      {entry.exercise.skipped ? <p className="text-mint">Skipped · saved locally</p> : null}
      {allComplete || hidden ? (
        <Button aria-expanded={!hidden} onClick={onCollapse}>
          {hidden ? 'Expand exercise' : 'Collapse completed exercise'}
        </Button>
      ) : null}
      <div hidden={hidden}>
        <div className="previous-today grid grid-cols-2 gap-2">
          <Card aria-label="Previous performance" className="text-xs">
            <h3 className="font-bold">Previous</h3>
            <p className="previous-performance">{formatPreviousSets(entry.previous?.sets ?? [])}</p>
          </Card>
          <Card aria-label="Today performance" className="text-xs">
            <h3 className="font-bold">Today</h3>
            <p className="previous-performance">
              {completed.length ? formatPreviousSets(completed) : 'No completed sets yet'}
            </p>
            <p>
              {completed.length}/{entry.sets.length} sets complete
            </p>
          </Card>
        </div>
        <div className="workout-set-list grid gap-3">
          {entry.sets.map((set) => (
            <WorkoutSetRow
              key={`${set.id}:${entry.exercise.exerciseId}`}
              set={set}
              today={entry.sets}
              previous={entry.previous?.sets ?? []}
              mutable={mutable && !entry.exercise.skipped}
              completed={onCompleted}
              refresh={refresh}
            />
          ))}
        </div>
      </div>
      {mutable ? (
        <div className="row-actions flex flex-wrap gap-2">
          <Button disabled={busy} onClick={onSkip}>
            {entry.exercise.skipped ? 'Resume exercise' : 'Skip exercise'}
          </Button>
          {!completed.length ? (
            <Link
              className={buttonClasses('outline')}
              to={`/workout/${sessionId}/exercises?replace=${entry.exercise.id}`}
            >
              Replace Exercise for This Workout
            </Link>
          ) : null}
          <Button disabled={busy} onClick={onAddSet}>
            ＋ Add set
          </Button>
          <IconButton
            disabled={busy || !canMoveUp}
            aria-label={`Move ${entry.exercise.exerciseName} up`}
            onClick={() => onMove(-1)}
          >
            <ArrowUp size={18} aria-hidden="true" />
          </IconButton>
          <IconButton
            disabled={busy || !canMoveDown}
            aria-label={`Move ${entry.exercise.exerciseName} down`}
            onClick={() => onMove(1)}
          >
            <ArrowDown size={18} aria-hidden="true" />
          </IconButton>
          <Button disabled={busy} onClick={onRemove}>
            Remove
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
