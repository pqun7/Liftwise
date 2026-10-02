import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Link,
  useLoaderData,
  useLocation,
  useNavigate,
  useRevalidator,
  useSearchParams,
} from 'react-router-dom';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import type { Exercise } from '../../domain/entities';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Select, Textarea } from '../../components/ui/FormControl';
import { buttonClasses } from '../../components/ui/controlStyles';
import { ProgramWorkoutDay } from './ProgramWorkoutDay';
import { WeeklySchedule } from './WeeklySchedule';
import { chronologicalDays, compactPrescription } from './programDisplay';
import { UnsavedChanges } from './UnsavedChanges';
import { programBuilder, weekdays } from './builderService';
import {
  createProgramDay,
  deleteProgram,
  duplicateProgram,
  duplicateProgramDay,
  setActiveProgram,
  updateProgram,
} from './programService';

export function ProgramDetailPage() {
  const { graph, activeProgramId, catalog } = useLoaderData<{
    graph: ProgramGraph;
    activeProgramId: string | null;
    catalog: Exercise[];
  }>();
  const { program, days } = graph;
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const tab =
    params.get('tab') === 'settings'
      ? 'Settings'
      : params.get('tab') === 'preview'
        ? 'Preview'
        : 'Schedule';
  const revalidator = useRevalidator();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [editRevision, setEditRevision] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(
    () => location.hash.replace('#day-', '') || chronologicalDays(days)[0]?.day.id || null,
  );
  const [adding, setAdding] = useState<string | null>(null);
  const [weekday, setWeekday] = useState('');
  const [info, setInfo] = useState(false);
  const [name, setName] = useState(program.name);
  const [description, setDescription] = useState(program.description ?? '');
  const catalogById = useMemo(
    () => new Map(catalog.map((exercise) => [exercise.id, exercise])),
    [catalog],
  );
  const canLeave = () => {
    if (busy) return false;
    if (!dirty) return true;
    if (!window.confirm('Discard changes? Choose Cancel to keep editing.')) return false;
    setDirty(false);
    setInfo(false);
    setEditRevision((value) => value + 1);
    return true;
  };
  const run = async (action: () => Promise<unknown>) => {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
      await revalidator.revalidate();
      return true;
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not save. Your edits are preserved. Try again.',
      );
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  useEffect(() => {
    if (location.hash.startsWith('#day-')) {
      const id = location.hash.slice(5);
      setExpanded(id);
      const timer = window.setTimeout(
        () => document.getElementById(`day-${id}`)?.scrollIntoView({ block: 'nearest' }),
        100,
      );
      return () => clearTimeout(timer);
    }
  }, [location.hash]);
  const selectDay = (id: string) => {
    if (!canLeave()) return;
    setDirty(false);
    setExpanded(id);
    window.setTimeout(
      () => document.getElementById(`day-${id}`)?.scrollIntoView({ block: 'nearest' }),
      50,
    );
  };
  const count = days.reduce((total, day) => total + day.exercises.length, 0);
  return (
    <section className="plan-experience grid gap-4 pb-28" aria-labelledby="program-title">
      <UnsavedChanges
        dirty={dirty}
        saving={false}
        onDiscard={() => {
          setDirty(false);
          setInfo(false);
          setEditRevision((value) => value + 1);
        }}
      />
      <header className="plan-editor-header">
        <Link to="/plan" aria-label="Back to Programs">
          <ChevronLeft size={22} />
        </Link>
        <h1 id="program-title">Edit Program</h1>
        <button
          aria-label="Program options"
          disabled={busy}
          onClick={() => void setParams({ tab: 'settings' })}
        >
          <MoreHorizontal size={20} />
        </button>
      </header>
      <div className="plan-tabs" role="group" aria-label="Editor view">
        {(['Schedule', 'Settings', 'Preview'] as const).map((label) => (
          <button
            key={label}
            aria-pressed={tab === label}
            disabled={busy}
            onClick={() => {
              if (!dirty) setInfo(false);
              void setParams(label === 'Schedule' ? {} : { tab: label.toLowerCase() });
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="rounded-xl bg-surface-2 p-3 text-sm text-secondary">
          {error}
        </p>
      ) : null}
      {tab === 'Schedule' ? (
        <>
          <section>
            <h2 className="text-sm font-semibold mb-2">Program info</h2>
            <button
              className="plan-info-row"
              onClick={() => {
                if (canLeave()) {
                  setDirty(false);
                  setInfo(!info);
                  setExpanded(null);
                  setName(program.name);
                  setDescription(program.description ?? '');
                }
              }}
              aria-expanded={info}
            >
              <span>
                <strong>{program.name}</strong>
                <small>
                  {days.length} training days · {count} exercises
                </small>
              </span>
              <ChevronRight size={18} />
            </button>
            {info ? (
              <form
                className="grid gap-3 pt-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(() =>
                    updateProgram(program.id, { name, description: description.trim() || null }),
                  ).then((ok) => {
                    if (ok) {
                      setInfo(false);
                      setDirty(false);
                    }
                  });
                }}
              >
                <label className="grid gap-1 text-sm">
                  Program name
                  <Input
                    required
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setDirty(true);
                    }}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Description or notes
                  <Textarea
                    value={description}
                    onChange={(event) => {
                      setDescription(event.target.value);
                      setDirty(true);
                    }}
                  />
                </label>
                <Button type="submit" disabled={busy} variant="primary">
                  {busy ? 'Saving…' : 'Save program info'}
                </Button>
              </form>
            ) : null}
          </section>
          <WeeklySchedule
            graph={graph}
            selectDay={selectDay}
            edit={() => {
              void navigate(`/plan/${program.id}/build/days`);
            }}
          />
          <div className="plan-section-heading">
            <h2>Training Days</h2>
            <span className="text-xs text-secondary">Weekday order</span>
          </div>
          {!days.length ? (
            <Card>
              <h3 className="font-bold">Build your weekly schedule</h3>
              <p className="text-sm text-secondary mt-2">
                Add your first training day, then choose exercises.
              </p>
            </Card>
          ) : null}
          <div className="grid gap-2">
            {chronologicalDays(days).map((entry) => (
              <div key={entry.day.id} id={`day-${entry.day.id}`} className="scroll-mt-4">
                <ProgramWorkoutDay
                  key={`${entry.day.id}-${editRevision}`}
                  entry={entry}
                  graph={graph}
                  catalog={catalogById}
                  busy={busy}
                  run={run}
                  expanded={expanded === entry.day.id}
                  toggle={() => {
                    if (!canLeave()) return;
                    setDirty(false);
                    setInfo(false);
                    setExpanded(expanded === entry.day.id ? null : entry.day.id);
                  }}
                  dirtyChange={setDirty}
                  canLeave={canLeave}
                  duplicate={() => {
                    if (canLeave()) {
                      setDirty(false);
                      setAdding(entry.day.id);
                      setWeekday('');
                    }
                  }}
                />
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            disabled={busy || days.length >= 7}
            onClick={() => {
              if (canLeave()) {
                setDirty(false);
                setAdding(adding ? null : 'new');
                setWeekday('');
              }
            }}
          >
            + Add Training Day
          </Button>
          {days.length >= 7 ? (
            <p className="text-xs text-secondary">
              All seven training-day slots are used. Change or delete a day to free a slot.
            </p>
          ) : null}
          {adding ? (
            <Card className="grid gap-3">
              <h3 className="font-bold">
                {adding === 'new' ? 'Add Training Day' : 'Duplicate day'}
              </h3>
              <label className="grid gap-1 text-sm">
                Choose weekday
                <Select value={weekday} onChange={(event) => setWeekday(event.target.value)}>
                  <option value="">Select a day…</option>
                  {weekdays.map((label, index) => {
                    const used = days.some(({ day }) => day.weekday === index);
                    return (
                      <option key={label} value={index} disabled={used}>
                        {label}
                        {used ? ' · Already assigned' : ''}
                      </option>
                    );
                  })}
                </Select>
              </label>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  disabled={busy || weekday === ''}
                  onClick={() => {
                    void run(async () => {
                      const result =
                        adding === 'new'
                          ? await createProgramDay(program.id, {
                              name: weekdays[Number(weekday)]!,
                              weekday: Number(weekday),
                              defaultRestSeconds: 150,
                            })
                          : (await duplicateProgramDay(adding, Number(weekday))).day;
                      setExpanded(result.id);
                      window.setTimeout(
                        () =>
                          document
                            .getElementById(`day-${result.id}`)
                            ?.scrollIntoView({ block: 'nearest' }),
                        150,
                      );
                    }).then((ok) => {
                      if (ok) {
                        setAdding(null);
                        setWeekday('');
                      }
                    });
                  }}
                >
                  {busy ? 'Saving…' : adding === 'new' ? 'Add day' : 'Duplicate day'}
                </Button>
                <Button disabled={busy} onClick={() => setAdding(null)}>
                  Cancel
                </Button>
              </div>
            </Card>
          ) : null}
        </>
      ) : tab === 'Settings' ? (
        <Card className="grid gap-3">
          <h2 className="font-bold">Program settings</h2>
          <h3 className="text-sm font-semibold">{program.name}</h3>
          {activeProgramId === program.id ? <p className="text-xs text-secondary">Active</p> : null}
          <Link className={buttonClasses('secondary')} to={`/plan/${program.id}/edit`}>
            Edit program details
          </Link>
          <Link className={buttonClasses('secondary')} to={`/plan/${program.id}/build/days`}>
            Schedule & split templates
          </Link>
          {days.length < 7 ? (
            <Link className={buttonClasses('secondary')} to={`/plan/${program.id}/days/new`}>
              Add training day
            </Link>
          ) : null}
          {activeProgramId !== program.id && !program.draft ? (
            <Button disabled={busy} onClick={() => void run(() => setActiveProgram(program.id))}>
              Set active
            </Button>
          ) : null}
          <Button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const copy = await duplicateProgram(program.id);
                await navigate(`/plan/${copy.program.id}`);
              })
            }
          >
            Duplicate program
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  `Delete "${program.name}" and all planned days? Workout history remains.`,
                )
              )
                void run(async () => {
                  await deleteProgram(program.id);
                  await navigate('/plan');
                });
            }}
          >
            Delete program
          </Button>
        </Card>
      ) : (
        <>
          <h2 className="text-xl font-bold">{program.name}</h2>
          <p className="text-sm text-secondary">
            {days.length} training days · {count} exercises
          </p>
          <WeeklySchedule graph={graph} />
          {chronologicalDays(days).map(({ day, exercises }) => (
            <Card key={day.id}>
              <h3 className="font-semibold">
                {day.weekday == null ? 'Unscheduled' : weekdays[day.weekday]} · {day.name}
              </h3>
              <ul className="list-none p-0 m-0 mt-3 grid gap-3">
                {exercises.map((item) => (
                  <li key={item.id} className="text-sm">
                    <strong>
                      {catalogById.get(item.exerciseId)?.name ?? 'Unavailable exercise'}
                    </strong>
                    <p className="text-xs text-secondary">{compactPrescription(item)}</p>
                  </li>
                ))}
              </ul>
              {!exercises.length ? (
                <p className="text-sm text-secondary mt-2">No exercises yet</p>
              ) : null}
            </Card>
          ))}
        </>
      )}
      <div className="plan-save-bar">
        <Button
          variant="primary"
          disabled={busy || !program.draft || !days.length || dirty}
          className="w-full min-h-12"
          onClick={() => void run(() => programBuilder.finish(program.id))}
        >
          {busy ? 'Saving…' : program.draft ? 'Save Program' : 'Saved'}
        </Button>
        <p role="status">
          {error
            ? 'Could not save. Try again.'
            : dirty
              ? 'Unsaved edits · finish editing to save'
              : 'Changes are saved locally as you edit.'}
        </p>
      </div>
    </section>
  );
}
