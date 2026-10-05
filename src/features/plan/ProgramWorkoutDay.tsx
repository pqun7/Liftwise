import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ChevronRight, MoreHorizontal, Plus } from 'lucide-react';
import type { Exercise } from '../../domain/entities';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { Card } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/FormControl';
import { buttonClasses } from '../../components/ui/controlStyles';
import { ExerciseImage } from '../exercises/ExerciseImage';
import { compactPrescription, estimatedProgramMinutes } from './programDisplay';
import { weekdays } from './builderService';
import { ExerciseTargetEditor } from './ExerciseTargetEditor';
import {
  updateProgramDay,
  updatePrescription,
  deletePrescription,
  transferPrescription,
  movePrescription,
  deleteProgramDay,
} from './programService';

export function ProgramWorkoutDay({
  entry,
  graph,
  catalog,
  run,
  busy,
  expanded,
  toggle,
  duplicate,
  dirtyChange,
  canLeave,
}: {
  entry: ProgramGraph['days'][number];
  graph: ProgramGraph;
  catalog: Map<string, Exercise>;
  run: (action: () => Promise<unknown>) => Promise<boolean>;
  busy: boolean;
  expanded: boolean;
  toggle: () => void;
  duplicate: () => void;
  dirtyChange: (dirty: boolean) => void;
  canLeave: () => boolean;
}) {
  const { day, exercises } = entry;
  const [options, setOptions] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(day.name);
  const [editing, setEditing] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const minutes = estimatedProgramMinutes(exercises);
  const base = `/plan/${graph.program.id}`;
  return (
    <Card
      as="article"
      className={`plan-day ${expanded ? 'plan-day-open' : ''}`}
      padding="none"
      aria-label={`${day.name} workout day`}
    >
      <div className="flex items-center min-w-0">
        <button
          className="plan-day-toggle"
          disabled={busy}
          onClick={toggle}
          aria-expanded={expanded}
          aria-controls={`content-${day.id}`}
        >
          <span className="flex flex-wrap gap-x-3 gap-y-1 items-baseline">
            <strong>{day.weekday == null ? 'Unscheduled' : weekdays[day.weekday]}</strong>
            <span className="text-mint">{day.name}</span>
          </span>
          <small>
            {exercises.length} exercises{minutes == null ? '' : ` · ~${minutes} min`}
          </small>
        </button>
        {expanded ? (
          <IconButton
            aria-label={`Options for ${day.name}`}
            aria-expanded={options}
            disabled={busy}
            onClick={() => setOptions(!options)}
          >
            <MoreHorizontal size={18} />
          </IconButton>
        ) : (
          <IconButton aria-label={`Expand ${day.name}`} disabled={busy} onClick={toggle}>
            <ChevronRight size={16} />
          </IconButton>
        )}
      </div>
      {expanded ? (
        <div id={`content-${day.id}`} className="px-3 pb-3">
          {options ? (
            <div className="grid gap-2 border-t border-border py-3">
              <Button
                disabled={busy}
                onClick={() => {
                  if (!canLeave()) return;
                  setEditing(null);
                  setName(day.name);
                  setRenaming(true);
                }}
              >
                Rename day
              </Button>
              {renaming ? (
                <form
                  className="grid gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void run(() => updateProgramDay(day.id, { name })).then((ok) => {
                      if (ok) {
                        setRenaming(false);
                        dirtyChange(false);
                      }
                    });
                  }}
                >
                  <Input
                    aria-label="Workout day name"
                    required
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      dirtyChange(event.target.value !== day.name);
                    }}
                  />
                  <Button type="submit" disabled={busy}>
                    Done
                  </Button>
                </form>
              ) : null}
              <label className="grid gap-1 text-xs text-secondary">
                Change weekday
                <Select
                  aria-label={`Weekday for ${day.name}`}
                  disabled={busy}
                  value={day.weekday ?? ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    void run(() =>
                      updateProgramDay(day.id, {
                        weekday: value === '' ? null : Number(value),
                      }),
                    );
                  }}
                >
                  <option value="">Unscheduled</option>
                  {weekdays.map((weekday, index) => {
                    const used = graph.days.some(
                      (other) => other.day.id !== day.id && other.day.weekday === index,
                    );
                    return (
                      <option key={weekday} value={index} disabled={used}>
                        {weekday}
                        {used ? ' · Already assigned' : ''}
                      </option>
                    );
                  })}
                </Select>
              </label>
              <Button onClick={duplicate} disabled={busy || graph.days.length >= 7}>
                Duplicate day
              </Button>
              {graph.days.length >= 7 ? (
                <p className="text-xs text-secondary">All seven training-day slots are used.</p>
              ) : null}
              <Button onClick={() => setReordering(!reordering)} aria-pressed={reordering}>
                Reorder exercises
              </Button>
              <Link
                className={buttonClasses('ghost')}
                to={`${base}/days/${day.id}/edit?return=editor`}
              >
                Notes & settings
              </Link>
              <Link className={buttonClasses('ghost')} to={`${base}/days/${day.id}`}>
                View day details
              </Link>
              <Button
                disabled={busy}
                onClick={() => {
                  if (!canLeave()) return;
                  if (
                    !exercises.length ||
                    window.confirm(
                      `Delete "${day.name}"? This removes ${day.weekday == null ? 'this day' : weekdays[day.weekday]} and its ${exercises.length} exercises from this program. Workout history remains.`,
                    )
                  )
                    void run(() => deleteProgramDay(day.id));
                }}
              >
                Delete day
              </Button>
            </div>
          ) : null}
          {!exercises.length ? (
            <p className="py-4 text-sm text-secondary">
              No exercises yet. Add your first exercise.
            </p>
          ) : null}
          <ol className="m-0 list-none p-0">
            {exercises.map((prescription, index) => {
              const exercise = catalog.get(prescription.exerciseId);
              return (
                <li key={prescription.id} className="plan-exercise">
                  <button
                    className="plan-exercise-row"
                    disabled={busy}
                    onClick={() => {
                      if (!canLeave()) return;
                      setRenaming(false);
                      setEditing(editing === prescription.id ? null : prescription.id);
                    }}
                    aria-expanded={editing === prescription.id}
                    aria-label={`Edit ${exercise?.name ?? 'Unavailable exercise'} targets`}
                  >
                    <ExerciseImage
                      image={exercise?.images?.start ?? exercise?.images?.main ?? null}
                      className="plan-exercise-image"
                    />
                    <span className="min-w-0">
                      <strong>{exercise?.name ?? 'Unavailable exercise'}</strong>
                      <small>{compactPrescription(prescription)}</small>
                    </span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                  {editing === prescription.id ? (
                    <>
                      <ExerciseTargetEditor
                        key={prescription.updatedAt}
                        prescription={prescription}
                        save={(input) => run(() => updatePrescription(prescription.id, input))}
                        close={() => {
                          setEditing(null);
                          dirtyChange(false);
                        }}
                        dirtyChange={dirtyChange}
                      />
                      <div className="grid gap-2 py-2">
                        <Button
                          disabled={busy}
                          onClick={() => {
                            if (!canLeave()) return;
                            if (
                              window.confirm(
                                `Remove ${exercise?.name ?? 'this exercise'} from ${day.name}?`,
                              )
                            )
                              void run(() => deletePrescription(prescription.id)).then((ok) => {
                                if (ok) {
                                  setEditing(null);
                                  dirtyChange(false);
                                }
                              });
                          }}
                        >
                          Remove exercise
                        </Button>
                        {(['Move to', 'Duplicate to'] as const).map((label, operation) => (
                          <label key={label} className="grid gap-1 text-xs text-secondary">
                            {label}
                            <Select
                              aria-label={`${label} ${exercise?.name}`}
                              disabled={busy}
                              value=""
                              onChange={(event) => {
                                const destination = event.target.value;
                                if (destination && canLeave())
                                  void run(() =>
                                    transferPrescription(
                                      prescription.id,
                                      destination,
                                      operation === 1,
                                    ),
                                  );
                              }}
                            >
                              <option value="">Choose another workout day…</option>
                              {graph.days
                                .filter((other) => other.day.id !== day.id)
                                .map((other) => (
                                  <option key={other.day.id} value={other.day.id}>
                                    {other.day.name}
                                  </option>
                                ))}
                            </Select>
                          </label>
                        ))}
                      </div>
                    </>
                  ) : null}
                  {reordering ? (
                    <div className="flex gap-2 pb-2">
                      <Button
                        aria-label={`Move ${exercise?.name} up`}
                        disabled={busy || index === 0}
                        onClick={() =>
                          void run(() => movePrescription(day.id, prescription.id, -1))
                        }
                      >
                        <ArrowUp size={16} />
                        Up
                      </Button>
                      <Button
                        aria-label={`Move ${exercise?.name} down`}
                        disabled={busy || index === exercises.length - 1}
                        onClick={() => void run(() => movePrescription(day.id, prescription.id, 1))}
                      >
                        <ArrowDown size={16} />
                        Down
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
          <Link
            className={buttonClasses('outline', 'w-full mt-2')}
            aria-label={`Add Exercise to ${day.name}`}
            to={`${base}/days/${day.id}/exercises?return=editor`}
          >
            <Plus size={16} />
            Add Exercise
          </Link>
        </div>
      ) : null}
    </Card>
  );
}
